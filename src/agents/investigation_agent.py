"""
Root Cause Investigation Agent (Use Case 2)

Extends the diagnostics agent with RAG over maintenance manuals,
multi-step causal reasoning, similar-incident retrieval, and
structured evidence chains. Produces InvestigationReport with
citations and confidence scores.

Agentic patterns demonstrated:
- RAG (pgvector knowledge base)
- Multi-step reasoning (7-step investigation methodology)
- Tool use (12 tools)
- Evaluation (technician feedback loop)
- Memory (learned lessons fed back into knowledge base)
"""

import os
import json
import time
import logging
from typing import Optional

from pydantic_ai import Agent

from .shared.models import InvestigationReport, InvestigationFeedback
from .shared import db_tools
from .shared.id_generator import generate_investigation_id
from .shared.guardrails import check_tier_access, check_session_rate_limit
from .shared.memory import create_session, complete_session
from . import knowledge_base

logger = logging.getLogger(__name__)


# ============================================================================
# AGENT DEFINITION
# ============================================================================

# ===========================================================================
# Shared Model String
# WHY: All 4 agents use the same DIAGNOSTICS_MODEL env var. This ensures
#   consistent behavior during testing (swap one env var to test with a
#   different model) and simplifies deployment (one config to change).
# DEFAULT: gpt-4o-mini — best cost/quality ratio for tool-calling agents.
#   gpt-4o is 10x more expensive and only marginally better at structured
#   output generation. For production, gpt-4o-mini at $0.15/1M input tokens
#   keeps per-investigation cost under $0.05.
# ===========================================================================
_model = os.environ.get('DIAGNOSTICS_MODEL', 'openai:gpt-4o-mini')

# ===========================================================================
# PATTERN: Pydantic AI Agent with Structured Output
# WHY: By setting result_type=InvestigationReport, Pydantic AI forces the LLM
#   to return output that matches the InvestigationReport schema exactly.
#   If the LLM outputs invalid JSON or missing fields, Pydantic AI automatically
#   retries with the validation error message. This eliminates the need for
#   manual output parsing or regex extraction.
# ===========================================================================

# ===========================================================================
# System Prompt Engineering: 7-Step Methodology
# WHY: The 7-step methodology (Hypothesize, Gather Evidence, Search Knowledge,
#   Cross-Reference, Eliminate, Conclude, Recommend) is based on reliability
#   engineering root cause analysis standards (specifically PROACT RCA and
#   the Kepner-Tregoe method). By encoding the methodology in the system
#   prompt, the agent follows a repeatable, auditable process rather than
#   free-form reasoning. Each step maps to specific tools:
#   Step 1 (Hypothesize): Uses get_failure_scenario_info
#   Step 2 (Gather Evidence): Uses get_latest_readings, get_sensor_trend, get_alert_history
#   Step 3 (Search Knowledge): Uses search_knowledge (RAG)
#   Step 4 (Cross-Reference): Uses find_similar_incidents
#   Step 5 (Eliminate): Agent reasoning (no tool)
#   Step 6 (Conclude): Agent reasoning + compare_to_baseline
#   Step 7 (Recommend): Agent reasoning based on all gathered evidence
# SCALING: At 4,700 compressors with ~5% degrading at any time, investigations
#   run ~235 times concurrently. The structured methodology ensures consistent
#   quality regardless of which compressor is being investigated.
# ===========================================================================
investigation_agent = Agent(
    _model,
    result_type=InvestigationReport,  # Pydantic AI validates output against this schema
    system_prompt="""You are a senior reliability engineer conducting a root cause investigation
on a reciprocating natural gas compressor. You follow a systematic 7-step methodology:

1. HYPOTHESIZE: Based on the alert type and initial sensor data, form up to 3 initial hypotheses
   about what might be causing the issue. Common failure modes:
   - Bearing wear: Exponential vibration increase over days (vibration_mms primary)
   - Cooling degradation: Linear temperature rise (discharge_temp_f primary)
   - Valve failure: Pressure oscillations (discharge_pressure_psi primary)
   - Ring wear: Gradual efficiency loss (gas_flow_mcf primary)
   - Packing leak: Pressure loss + elevated emissions (discharge_pressure_psi + emissions)
   - Fouling: Slow temp increase with periodic spikes (discharge_temp_f primary)

2. GATHER EVIDENCE: Systematically query sensor data, trends, and ML predictions.
   - Always fetch the 7-day sensor trend for the suspected primary sensor
   - Compare current readings to baseline for this compressor model

3. SEARCH KNOWLEDGE: Query the knowledge base for relevant maintenance manuals,
   service bulletins, and past incident reports. Use specific failure mode terms.

4. CROSS-REFERENCE: Find similar incidents on compressors of the same model.
   Past incidents reveal common patterns and proven solutions.

5. ELIMINATE: Rule out hypotheses that lack supporting evidence.
   Document each elimination step with the evidence that contradicts it.

6. CONCLUDE: State the root cause with a confidence level based on:
   - How well the evidence chain supports the conclusion
   - Whether ML predictions agree with your diagnosis
   - Whether similar incidents had the same root cause

7. RECOMMEND: Provide specific, prioritized actions with estimated costs and downtime.
   Priority levels: immediate (safety risk), next_shift, next_maintenance_window, monitor.

IMPORTANT RULES:
- Use ALL available tools before concluding. Every investigation must include:
  latest readings, sensor trend, alert history, ML predictions, maintenance history,
  metadata, knowledge base search, and similar incidents.
- Build an explicit evidence chain: each step should reference which tool/source
  provided the finding and how confident you are in that specific finding.
- Cite knowledge base sources by doc_id and title.
- If data is insufficient, say so and set confidence accordingly (lower confidence).
- Never fabricate sensor readings or knowledge base content.

Key sensor thresholds (API 618 / ISO 10816 standards):
- Vibration: Normal <4.5 mm/s, Warning >6.0 mm/s, Critical >8.0 mm/s
- Discharge Temperature: Normal <220F, Warning >240F, Critical >260F
- Discharge Pressure: Normal <1200 PSI, Warning >1300 PSI, Critical >1400 PSI""",
)


# ============================================================================
# TOOL REGISTRATIONS (12 tools)
# ===========================================================================
# WHY 12 tools? Each tool maps to a specific evidence-gathering step in the
# 7-step methodology. The agent decides which tools to call and in what order
# based on its hypothesis. More tools = more granular evidence = higher
# confidence diagnoses. Fewer tools would force the agent to reason with
# less data, reducing accuracy.
#
# Tool categories:
#   5 shared tools (from db_tools.py) — same data access as diagnostics agent
#   7 investigation-specific tools — deeper analysis capabilities
#
# PATTERN: tool_plain (not tool)
# WHY: @agent.tool_plain means the tool function receives plain Python args
#   and returns a plain string. The alternative @agent.tool receives a RunContext
#   with dependency injection — useful when tools need access to shared state.
#   Our tools are stateless (each call is a fresh DB query), so tool_plain
#   is simpler and avoids RunContext boilerplate.
# ============================================================================

# --- Reused tools from shared db_tools ---
# These 5 tools are identical to the diagnostics agent's tools.
# They're re-registered here because Pydantic AI agents have their own
# tool registries — tools are not inherited between agents.

@investigation_agent.tool_plain
def get_latest_readings(compressor_id: str) -> str:
    """Fetch the latest 24 hours of 1hr-window sensor readings."""
    return db_tools.get_latest_readings(compressor_id)


@investigation_agent.tool_plain
def get_alert_history(compressor_id: str, hours: int = 48) -> str:
    """Fetch recent alerts from the last N hours."""
    return db_tools.get_alert_history(compressor_id, hours)


@investigation_agent.tool_plain
def get_ml_predictions(compressor_id: str) -> str:
    """Fetch the latest ML predictions (RUL, anomaly, failure probability)."""
    return db_tools.get_ml_predictions(compressor_id)


@investigation_agent.tool_plain
def get_maintenance_history(compressor_id: str) -> str:
    """Fetch maintenance event history (last 10 events)."""
    return db_tools.get_maintenance_history(compressor_id)


@investigation_agent.tool_plain
def get_compressor_metadata(compressor_id: str) -> str:
    """Fetch compressor metadata including model, station, and installation date."""
    return db_tools.get_compressor_metadata(compressor_id)


# --- Investigation-specific tools (7 additional tools beyond diagnostics) ---
# These tools provide deeper analysis capabilities that the simpler
# diagnostics agent doesn't need: sensor trends over time, emissions data,
# knowledge base search (RAG), similar incident matching, baseline comparison,
# and failure mode reference data.

@investigation_agent.tool_plain
def get_sensor_trend(compressor_id: str, sensor_name: str, hours: int = 168) -> str:
    """Fetch a specific sensor's trend over the last N hours (default 7 days).
    sensor_name options: vibration_mean, vibration_max, discharge_temp_mean,
    discharge_temp_max, suction_pressure_mean, discharge_pressure_mean,
    horsepower_mean, gas_flow_mean, pressure_delta_mean."""
    return db_tools.get_sensor_trend(compressor_id, sensor_name, hours)


@investigation_agent.tool_plain
def get_emissions_data(compressor_id: str) -> str:
    """Fetch recent emissions estimates (for packing leak / fugitive emissions diagnosis)."""
    return db_tools.get_emissions_data(compressor_id)


@investigation_agent.tool_plain
def search_knowledge(query: str, doc_types: Optional[str] = None,
                     failure_modes: Optional[str] = None) -> str:
    """Search the knowledge base for relevant maintenance manuals, service bulletins,
    and past incident reports using semantic similarity.

    Args:
        query: Natural language search query (e.g., "bearing wear vibration patterns Ajax DPC-360")
        doc_types: Comma-separated filter (e.g., "maintenance_manual,service_bulletin")
        failure_modes: Comma-separated filter (e.g., "bearing_wear,valve_failure")
    """
    # Parse comma-separated filters
    dt_list = [x.strip() for x in doc_types.split(',')] if doc_types else None
    fm_list = [x.strip() for x in failure_modes.split(',')] if failure_modes else None

    # Use a demo org ID for now; in production this comes from session context
    org_id = os.environ.get('DEMO_ORG_ID', '')
    if not org_id:
        rows = db_tools.query_db(
            "SELECT id FROM organizations WHERE slug = 'altaviz-demo' LIMIT 1", []
        )
        org_id = str(rows[0]['id']) if rows else ''

    return knowledge_base.search_knowledge_base(
        query=query,
        organization_id=org_id,
        doc_types=dt_list,
        failure_modes=fm_list,
    )


@investigation_agent.tool_plain
def find_similar_incidents(compressor_id: str, failure_mode: Optional[str] = None) -> str:
    """Find past investigation reports for similar compressor models with similar symptoms.
    Matches by compressor model to find common failure patterns."""
    org_id = os.environ.get('DEMO_ORG_ID', '')
    if not org_id:
        rows = db_tools.query_db(
            "SELECT id FROM organizations WHERE slug = 'altaviz-demo' LIMIT 1", []
        )
        org_id = str(rows[0]['id']) if rows else ''

    return knowledge_base.get_similar_incidents(
        compressor_id=compressor_id,
        organization_id=org_id,
        failure_mode=failure_mode,
    )


@investigation_agent.tool_plain
def compare_to_baseline(compressor_id: str) -> str:
    """Compare current sensor readings to historical baseline for the same compressor model.
    Returns the model average vs. current readings to identify deviations."""
    try:
        # Get the compressor's model
        meta_rows = db_tools.query_db(
            "SELECT model FROM compressor_metadata WHERE compressor_id = %s",
            [compressor_id]
        )
        if not meta_rows:
            return json.dumps({"error": f"Compressor {compressor_id} not found"})

        model = meta_rows[0]['model']

        # Get fleet average for this model (baseline)
        baseline = db_tools.query_db(
            """SELECT
                 AVG(vibration_mean) as baseline_vibration,
                 AVG(discharge_temp_mean) as baseline_temp,
                 AVG(discharge_pressure_mean) as baseline_pressure,
                 AVG(horsepower_mean) as baseline_hp,
                 AVG(gas_flow_mean) as baseline_flow,
                 COUNT(DISTINCT sra.compressor_id) as fleet_count
               FROM sensor_readings_agg sra
               JOIN compressor_metadata cm ON sra.compressor_id = cm.compressor_id
               WHERE cm.model = %s
                 AND sra.window_type = '1hr'
                 AND sra.agg_timestamp >= NOW() - INTERVAL '7 days'""",
            [model]
        )

        # Get current average for this specific compressor
        current = db_tools.query_db(
            """SELECT
                 AVG(vibration_mean) as current_vibration,
                 AVG(discharge_temp_mean) as current_temp,
                 AVG(discharge_pressure_mean) as current_pressure,
                 AVG(horsepower_mean) as current_hp,
                 AVG(gas_flow_mean) as current_flow
               FROM sensor_readings_agg
               WHERE compressor_id = %s
                 AND window_type = '1hr'
                 AND agg_timestamp >= NOW() - INTERVAL '24 hours'""",
            [compressor_id]
        )

        result = {
            "compressor_id": compressor_id,
            "model": model,
            "baseline": db_tools._serialize_rows(baseline)[0] if baseline else {},
            "current": db_tools._serialize_rows(current)[0] if current else {},
        }

        # Calculate deviations
        if baseline and current and baseline[0].get('baseline_vibration') and current[0].get('current_vibration'):
            b = baseline[0]
            c = current[0]
            result["deviations"] = {}
            for sensor in ['vibration', 'temp', 'pressure', 'hp', 'flow']:
                bv = float(b.get(f'baseline_{sensor}', 0) or 0)
                cv = float(c.get(f'current_{sensor}', 0) or 0)
                if bv > 0:
                    pct = ((cv - bv) / bv) * 100
                    result["deviations"][sensor] = {
                        "baseline": round(bv, 2),
                        "current": round(cv, 2),
                        "deviation_pct": round(pct, 1),
                    }

        return json.dumps(result, default=str)
    except Exception as e:
        return json.dumps({"error": str(e)})


@investigation_agent.tool_plain
def get_failure_scenario_info(failure_mode: str) -> str:
    """Get detailed information about a specific failure mode's characteristics.
    failure_mode: bearing_wear, cooling_degradation, valve_failure, ring_wear, packing_leak, fouling"""
    scenarios = {
        "bearing_wear": {
            "primary_sensor": "vibration_mms",
            "fleet_probability_per_month": "2.5%",
            "progression": "Exponential vibration increase",
            "early_signs": "Vibration mean > 4.5 mm/s with increasing std deviation",
            "critical_threshold": "Vibration > 8.0 mm/s",
            "typical_rul": "48-96 hours from warning to critical",
            "repair_action": "Bearing replacement, shaft inspection",
            "estimated_cost": "$8,000-15,000",
            "estimated_downtime": "8-16 hours",
        },
        "cooling_degradation": {
            "primary_sensor": "discharge_temp_f",
            "fleet_probability_per_month": "2.0%",
            "progression": "Linear temperature rise",
            "early_signs": "Discharge temp rate of change > 0.5 F/hr sustained",
            "critical_threshold": "Discharge temp > 260F",
            "typical_rul": "24-72 hours from warning to critical",
            "repair_action": "Cooling system flush, fan/pump inspection",
            "estimated_cost": "$3,000-8,000",
            "estimated_downtime": "4-8 hours",
        },
        "valve_failure": {
            "primary_sensor": "discharge_pressure_psi",
            "fleet_probability_per_month": "1.5%",
            "progression": "Pressure oscillations with increasing amplitude",
            "early_signs": "Pressure std deviation > 50 PSI, temperature creep",
            "critical_threshold": "Pressure > 1400 PSI or < 800 PSI",
            "typical_rul": "12-48 hours once oscillations begin",
            "repair_action": "Valve plate replacement, seat inspection",
            "estimated_cost": "$5,000-12,000",
            "estimated_downtime": "6-12 hours",
        },
        "ring_wear": {
            "primary_sensor": "gas_flow_mcf",
            "fleet_probability_per_month": "2.0%",
            "progression": "Gradual efficiency loss (flow decrease at same HP)",
            "early_signs": "Gas flow declining 2-5% per week, HP increasing",
            "critical_threshold": "Flow < 70% of baseline at rated HP",
            "typical_rul": "1-4 weeks (slow progression)",
            "repair_action": "Piston ring replacement, cylinder inspection",
            "estimated_cost": "$10,000-25,000",
            "estimated_downtime": "16-24 hours",
        },
        "packing_leak": {
            "primary_sensor": "discharge_pressure_psi",
            "fleet_probability_per_month": "1.5%",
            "progression": "Slow pressure loss + emissions increase",
            "early_signs": "Pressure trending down, emissions rate increasing",
            "critical_threshold": "Emission rate > 2x baseline, EPA OOOOb violation risk",
            "typical_rul": "1-2 weeks (compliance-driven urgency)",
            "repair_action": "Rod packing replacement, distance piece inspection",
            "estimated_cost": "$6,000-15,000",
            "estimated_downtime": "8-16 hours",
        },
        "fouling": {
            "primary_sensor": "discharge_temp_f",
            "fleet_probability_per_month": "3.0%",
            "progression": "Slow temperature increase with periodic spikes",
            "early_signs": "Temperature baseline creeping up, periodic 5-10F spikes",
            "critical_threshold": "Sustained temp > 240F with spikes to 260F+",
            "typical_rul": "2-6 weeks (gradual but reversible)",
            "repair_action": "Intercooler cleaning, passage flush",
            "estimated_cost": "$2,000-5,000",
            "estimated_downtime": "4-8 hours",
        },
    }

    if failure_mode not in scenarios:
        return json.dumps({
            "error": f"Unknown failure mode: {failure_mode}. "
                     f"Valid modes: {', '.join(scenarios.keys())}"
        })

    return json.dumps(scenarios[failure_mode])


# ============================================================================
# PUBLIC API
# ============================================================================

async def run_investigation(
    compressor_id: str,
    organization_id: Optional[str] = None,
    trigger_type: str = 'manual',
    trigger_id: Optional[str] = None,
    user_id: Optional[str] = None,
) -> InvestigationReport:
    """
    Run a root cause investigation for a specific compressor.

    The agent will follow the 7-step methodology:
    Hypothesize → Gather Evidence → Search Knowledge → Cross-Reference →
    Eliminate → Conclude → Recommend

    Args:
        compressor_id: The compressor ID (e.g., "COMP-003")
        organization_id: The organization ID (for multi-tenant scoping)
        trigger_type: What triggered this investigation (alert, anomaly, manual, etc.)
        trigger_id: ID of the triggering entity (alert_id, etc.)
        user_id: User who initiated (None for autonomous)

    Returns:
        InvestigationReport: Structured report with evidence chain and recommendations
    """
    start_time = time.time()

    # ===========================================================================
    # Session Tracking wraps the agent.run() call
    # WHY: The session is created BEFORE the agent runs and completed AFTER.
    #   This provides: (1) audit trail of all agent invocations, (2) duration
    #   tracking for performance monitoring, (3) token usage accounting for
    #   cost management, (4) failure tracking (session marked 'failed' in except).
    #   The session_id links to the investigation report, enabling end-to-end
    #   tracing from "who triggered this?" to "what did the agent produce?".
    # ===========================================================================

    # Resolve org ID if not provided
    if not organization_id:
        rows = db_tools.query_db(
            "SELECT id FROM organizations WHERE slug = 'altaviz-demo' LIMIT 1", []
        )
        organization_id = str(rows[0]['id']) if rows else None

    # Create session for tracking
    session_id = None
    if organization_id:
        session_id = create_session(
            organization_id=organization_id,
            agent_type='investigation',
            user_id=user_id,
            compressor_id=compressor_id,
            trigger_type=trigger_type,
            trigger_id=trigger_id,
        )

    # Generate investigation ID
    investigation_id = generate_investigation_id()

    try:
        # The prompt includes the investigation_id so the agent can embed it
        # in the structured output. The "Follow the 7-step methodology" instruction
        # triggers the agent to call tools in the order defined by the system prompt.
        result = await investigation_agent.run(
            f"Conduct a root cause investigation for compressor {compressor_id}. "
            f"Investigation ID: {investigation_id}. "
            f"Trigger: {trigger_type}" + (f" (ID: {trigger_id})" if trigger_id else "") + ". "
            f"Follow the 7-step methodology. Use ALL available tools to gather evidence. "
            f"Build a complete evidence chain with confidence scores for each finding."
        )

        report = result.data  # Pydantic AI validates output against InvestigationReport schema
        duration = time.time() - start_time

        # Persist the investigation report to the database
        if organization_id:
            _save_report(report, organization_id, trigger_type, trigger_id)

        # Complete the session
        if session_id:
            complete_session(
                session_id=session_id,
                result_type='investigation_report',
                result_id=report.investigation_id,
                duration_seconds=duration,
            )

        return report

    except Exception as e:
        logger.error(f"Investigation failed for {compressor_id}: {e}")
        if session_id:
            complete_session(session_id=session_id, status='failed', duration_seconds=time.time() - start_time)
        raise


def _save_report(report: InvestigationReport, organization_id: str,
                 trigger_type: str, trigger_id: Optional[str]) -> None:
    """Persist an investigation report to the database."""
    try:
        db_tools.execute_db(
            """INSERT INTO investigation_reports
               (investigation_id, compressor_id, organization_id,
                trigger_type, trigger_id,
                root_cause, confidence, failure_mode, severity,
                evidence_chain, contributing_factors, similar_incidents,
                recommended_actions, estimated_rul_hours, estimated_repair_cost,
                knowledge_sources)
               VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)""",
            [
                report.investigation_id,
                report.compressor_id,
                organization_id,
                trigger_type,
                trigger_id,
                report.root_cause,
                report.confidence,
                report.failure_mode,
                report.severity,
                json.dumps([e.model_dump() for e in report.evidence_chain]),
                json.dumps(report.contributing_factors),
                json.dumps([s.model_dump() for s in report.similar_incidents]),
                json.dumps([a.model_dump() for a in report.recommended_actions]),
                report.estimated_rul_hours,
                report.estimated_repair_cost,
                json.dumps([k.model_dump() for k in report.knowledge_sources]),
            ]
        )
        logger.info(f"Saved investigation report {report.investigation_id}")
    except Exception as e:
        logger.error(f"Failed to save investigation report: {e}")


# ===========================================================================
# PATTERN: Feedback Loop (Technician → Knowledge Base → Future Investigations)
# WHY: This is the "learning" step in the closed-loop architecture. When a
#   technician says the diagnosis was wrong:
#   1. The feedback is stored on the investigation report (for accuracy metrics)
#   2. A "learned lesson" document is created in the knowledge base with the
#      ACTUAL root cause
#   3. Next time the agent investigates a similar issue, RAG will retrieve
#      this learned lesson, and the agent will see "this was previously
#      misdiagnosed as X, but the actual cause was Y"
#   This creates a virtuous cycle: more feedback → better diagnoses → more trust
#   from technicians → more feedback.
# ===========================================================================
async def submit_feedback(feedback: InvestigationFeedback) -> dict:
    """Submit technician feedback on an investigation report.

    If the diagnosis was wrong, a learned lesson is added to the knowledge base.
    """
    try:
        db_tools.execute_db(
            """UPDATE investigation_reports
               SET technician_feedback = %s,
                   feedback_rating = %s,
                   was_correct = %s
               WHERE investigation_id = %s""",
            [feedback.technician_feedback, feedback.feedback_rating,
             feedback.was_correct, feedback.investigation_id]
        )

        # If diagnosis was wrong, create a learned lesson in the knowledge base.
        # This is the key feedback loop: incorrect diagnoses become training data
        # for future investigations via RAG retrieval.
        if not feedback.was_correct and feedback.actual_root_cause:
            rows = db_tools.query_db(
                """SELECT compressor_id, organization_id, failure_mode
                   FROM investigation_reports
                   WHERE investigation_id = %s""",
                [feedback.investigation_id]
            )
            if rows:
                row = rows[0]
                knowledge_base.add_learned_lesson(
                    organization_id=str(row['organization_id']),
                    investigation_id=feedback.investigation_id,
                    compressor_id=row['compressor_id'],
                    actual_root_cause=feedback.actual_root_cause,
                    failure_mode=row.get('failure_mode', 'unknown'),
                    lesson=feedback.technician_feedback,
                )

        return {"status": "feedback_submitted", "investigation_id": feedback.investigation_id}
    except Exception as e:
        logger.error(f"Failed to submit feedback: {e}")
        return {"error": str(e)}
