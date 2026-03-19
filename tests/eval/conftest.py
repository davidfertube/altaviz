# ===========================================================================
# PATTERN: Fixture Design for LLM Evaluation
# WHY: LLM evaluation tests need realistic but deterministic test data.
#      Unlike unit tests where you mock everything, eval tests need:
#      1. Realistic INPUTS (sensor readings, context documents)
#      2. Realistic OUTPUTS (agent responses to evaluate)
#      3. Realistic CONTEXT (knowledge base documents for RAG metrics)
#      Fixtures provide this shared data across all eval test files
#      (test_investigation_quality.py, test_work_order_quality.py,
#      test_rag_quality.py) without duplication.
#
# SCALING: These fixtures represent single-compressor scenarios. At
#          Archrock scale, the same fixture patterns apply — the agents
#          process one compressor at a time regardless of fleet size.
#
# ALTERNATIVE: Could load test data from JSON/YAML files, but inline
#              fixtures are more readable and easier to modify when
#              agent output schemas change.
# ===========================================================================

"""
DeepEval test configuration for Altaviz agent evaluation.

Provides shared fixtures for evaluating agent outputs against
quality metrics: faithfulness, hallucination, context relevancy,
and answer relevancy.
"""

import os
import pytest


# ===========================================================================
# PATTERN: Custom Marker Registration
# WHY: The "eval" marker lets you run ONLY eval tests:
#        pytest -m eval tests/eval/
#      This is important because eval tests call the DeepEval API (which
#      calls an LLM to judge outputs), making them slow (~5s each) and
#      requiring API keys. You don't want them running in every CI build.
#      Registering the marker here (vs in pyproject.toml) keeps the
#      marker definition close to the tests that use it.
# ===========================================================================
def pytest_configure(config):
    """Register custom markers for eval tests."""
    config.addinivalue_line("markers", "eval: LLM evaluation tests (require API keys)")


@pytest.fixture
def sample_sensor_data():
    """Sample sensor readings for test scenarios."""
    return {
        "compressor_id": "COMP-0003",
        "vibration_mean": 7.2,
        "vibration_max": 9.1,
        "discharge_temp_mean": 195.0,
        "discharge_temp_max": 210.0,
        "discharge_pressure_mean": 1050.0,
        "suction_pressure_mean": 350.0,
        "horsepower_mean": 850.0,
        "gas_flow_mean": 4.2,
    }


# ===========================================================================
# PATTERN: Failure-Mode-Specific Context Fixtures
# WHY: bearing_wear and cooling_degradation are the two most common failure
#      modes in the fleet (2.5% and 2.0% monthly probability respectively,
#      per failure_scenarios.py). These fixtures provide the RAG context
#      documents that the investigation agent would retrieve from the
#      knowledge base when investigating these failure modes.
#
#      Each context list simulates what Azure AI Search / pgvector would
#      return: 2-3 documents ranked by relevance, containing:
#      - Failure mode description (symptoms, thresholds)
#      - Repair procedure (cost, downtime estimates)
#      - Historical incident (similar past case for pattern matching)
#
#      These are used as retrieval_context in DeepEval's LLMTestCase,
#      which is how DeepEval evaluates faithfulness (is the output
#      grounded in these docs?) and hallucination (did the agent invent
#      information not in these docs?).
# ===========================================================================

@pytest.fixture
def bearing_wear_context():
    """Context documents for bearing wear investigation scenario."""
    return [
        "Bearing wear manifests as exponential vibration increase. "
        "Primary sensor: vibration_mms. Warning threshold: >6.0 mm/s. "
        "Critical threshold: >8.0 mm/s. Typical RUL: 48-96 hours from warning.",
        "Ajax DPC-360 compressor bearing replacement procedure: "
        "Estimated cost $8,000-15,000. Estimated downtime 8-16 hours. "
        "Requires main bearing set, thrust washers, and alignment tools.",
        "Historical incident INV-2025-00142: COMP-0087 (Ajax DPC-360) experienced "
        "bearing wear. Vibration peaked at 9.5 mm/s before shutdown. Root cause: "
        "insufficient lubrication from clogged oil filter.",
    ]


@pytest.fixture
def cooling_degradation_context():
    """Context documents for cooling degradation scenario."""
    return [
        "Cooling degradation shows linear temperature rise in discharge_temp_f. "
        "Warning: >240F sustained. Critical: >260F. Typical RUL: 24-72 hours.",
        "Cooling system flush procedure for Ariel JGK/4: "
        "Estimated cost $3,000-8,000. Estimated downtime 4-8 hours.",
    ]


# ===========================================================================
# PATTERN: Sample Output Fixtures Matching Pydantic Models
# WHY: These fixtures mirror the structure of InvestigationReport and
#      WorkOrderPlan Pydantic models (from src/agents/shared/models.py).
#      The field names and types must match exactly because:
#      1. DeepEval evaluates the "actual_output" field, which comes from
#         these fixtures (or from live agent runs in integration tests)
#      2. The guardrails (requires_human_approval) read priority,
#         estimated_cost, requires_shutdown — must be realistic values
#      3. Cost and confidence values are within expected ranges per
#         failure mode (e.g., bearing_wear costs $8K-15K, not $100K)
# ===========================================================================

@pytest.fixture
def sample_investigation_output():
    """Sample investigation agent output for evaluation."""
    return {
        "investigation_id": "INV-2026-00001",
        "compressor_id": "COMP-0003",
        "root_cause": "Bearing wear detected based on elevated vibration readings. "
                      "Vibration mean of 7.2 mm/s exceeds warning threshold of 6.0 mm/s. "
                      "Pattern matches exponential increase consistent with bearing degradation.",
        "failure_mode": "bearing_wear",
        "severity": "warning",
        "confidence": 0.85,
    }


@pytest.fixture
def sample_work_order_output():
    """Sample work order agent output for evaluation."""
    return {
        "work_order_id": "WO-2026-00001",
        "compressor_id": "COMP-0003",
        "priority": "high",
        "category": "mechanical_repair",
        "estimated_hours": 12.0,
        "estimated_cost": 12000.0,
        "requires_shutdown": True,
        "shutdown_hours": 12.0,
        "confidence": 0.82,
        "reasoning": "Bearing replacement required due to elevated vibration levels. "
                     "Cost estimate based on Ajax DPC-360 bearing kit and 12 hours labor.",
    }
