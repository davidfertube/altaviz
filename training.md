# Archrock Final Interview Prep

**Date:** Tuesday, Feb 24, 2026 | **Format:** Video, technical with full team (no coding)
**Logistics:** Join 5 min early, business shirt, clean background, water nearby, phone on silent
**Role:** Cloud AI Engineer | **Company:** Archrock, Inc. (NYSE: AROC)
**Note:** Archrock Q4 2025 earnings call is Feb 25 (day after your interview) — you can mention awareness

---

## Final Round Strategy

They liked you in round 1. They're not re-screening — they're stress-testing. Expect:
- **Deeper follow-ups** — "You mentioned X, but what happens when Y?"
- **Architecture scenarios** — "Design this from scratch for our fleet"
- **Judgment calls** — "What would you do if..." with no single right answer
- **Team fit** — Can 4 people all say "yes, I want to work with this person"?
- **Resume probes** — "Tell me more about your work at [X]" — they'll dig into specifics

**Your posture:** Confident but collaborative. You've built this. You know the trade-offs. You're ready to go deeper than round 1.

---

## 45-Minute Time Allocation

| Segment | Duration | What to expect |
|---------|----------|----------------|
| Intros + small talk | 2-3 min | Greetings, camera check |
| "Tell me about yourself" | 2 min | Q1 — keep to 60 seconds |
| Resume deep-dive + behavioral | 8-10 min | TestMachine, startup, disagreement, ambiguity |
| Architecture / technical | 15-18 min | Pipeline design, TOPS/NGCS, Spark, Delta Lake |
| Scenario / ML | 5-8 min | Model failure, stakeholder pushback, GenAI vision |
| Your questions | 5 min | 3-4 max — have 5 ready, pick based on flow |
| Closing | 2 min | Closing statement + goodbyes |

*With 4 interviewers sharing 45 min, expect 8-12 questions total. This guide covers 15 — you're prepared for anything likely.*

---

## Interviewer Cheat Sheets

### Kunal Sharma — Head of Data Engineering (HIRING MANAGER)

| | |
|---|---|
| **Background** | Columbia AI/ML postgrad. Ex-BHP 8 years (Solutions Engineer → Specialist). LTIMindtree before. At Archrock since July 2022. Featured on AI SuccessFactors podcast. |
| **Cares about** | Architecture thinking, AI/ML in production, Fabric migration vision, scaling, business value |
| **Avoid** | Hand-waving without specifics; claiming production Fabric experience you don't have |
| **Will impress him** | Bridging every answer to Archrock's 4,700 compressors + TOPS/NGCS integration challenge |
| **Round 2 focus** | Deeper on AI strategy, architecture trade-offs, leadership potential, vision for the data platform |
| **Likely opener** | "Last time we talked about [X]. Tell me more about how you'd handle [Y] at our scale." |

### Laura De La Garza — Data & Technology PM

| | |
|---|---|
| **Background** | Ex-BHP (Principal Data Governance, ECM Principal, Records Management Supervisor). Lean Six Sigma Green Belt. Agile/Scrum certs (Jan 2026). Bilingual Spanish/English. |
| **Cares about** | Data governance, compliance, process, stakeholder communication, project delivery |
| **Avoid** | Unstructured answers; dismissing governance as "bureaucracy" |
| **Will impress her** | Specific examples of audit trails, data lineage, quality gates, structured documentation |
| **Round 2 focus** | Deeper on EPA OOOOb compliance workflows, how you communicate to field teams, project management |
| **Likely opener** | "Tell me about how you've managed data governance in a regulated environment." |

### Vishnu Adusumilli — Sr Azure Data Engineer (PEER)

| | |
|---|---|
| **Background** | Ex-Cognizant (Azure DE), Ex-Optum (DE — healthcare, compliance-heavy), Ex-HTC Global (ETL Developer). Classic ETL-to-cloud career. |
| **Cares about** | PySpark depth, Azure/Fabric specifics, Delta Lake operations, pipeline debugging, performance |
| **Avoid** | Surface-level Azure answers; not knowing Spark internals |
| **Will impress him** | Knowing anti-patterns (chained withColumn, inferSchema, collect on large data), Spark execution model, AQE |
| **Round 2 focus** | Harder Spark scenarios, Delta Lake internals, Fabric-specific features, production debugging |
| **Likely opener** | "Walk me through how you'd debug [specific pipeline issue]." |

### Minnu Gopinath — Cloud Data Engineer (PEER)

| | |
|---|---|
| **Background** | Ex-SkillStorm (DE), B.E. from Periyar University. Your direct peer if hired. |
| **Cares about** | Day-to-day collaboration, practical engineering, testing, teamwork, learning attitude |
| **Avoid** | Being condescending; over-architecting simple answers |
| **Will impress her** | Showing you're someone who makes the team better, asks good questions, writes testable code |
| **Round 2 focus** | How you'd work together daily, testing strategies, code review habits, knowledge sharing |
| **Likely opener** | "How do you approach testing data pipelines?" or "How do you handle code reviews?" |

---

## Updated Archrock Intel

| Fact | Detail |
|------|--------|
| **What they do** | Largest U.S. natural gas contract compression services provider |
| **Scale** | 4.5M+ HP, ~4,700 compressors, 96% utilization, 10+ basins, 200+ stations |
| **Q3 2025** | Revenue $382.4M, Net income $71.2M, Adjusted EBITDA $220.9M |
| **FY2025 Guidance** | Adjusted EBITDA $835-850M (raised) |
| **Acquisitions** | TOPS ($983M, Aug 2024, ~580K hp, Permian, electric fleet) + NGCS ($357M, completed May 2025, 351K hp, 71% Permian) |
| **Electric fleet** | ~815K hp electric compression (growing — strategic priority) |
| **2026 outlook** | $250M+ growth capex, AI-driven power generation as new demand driver |
| **Financing** | $500M senior notes (Jan 2026) for financial flexibility |
| **Tech stack** | Microsoft Fabric, Azure Synapse (migrating), PySpark, Delta Lake, Power BI |
| **IIoT** | Detechtion Enbase — single edge device: monitoring + protection + control + optimization |
| **Methane tech** | Ecotec (TDLAS laser monitoring), Carbon Hawk (capture from blowdown/rod packing), ECOFLOW (direct flow measurement) |
| **EPA** | OOOOb — continuous methane monitoring, 7-year data retention |
| **Employees** | ~1,300 |
| **No CTO/CIO** | Tech function being built — huge opportunity for early hires to shape direction |
| **CEO** | D. Bradley Childers (since 2011) |
| **Earnings** | Q4 2025 call: Feb 25, 2026 (day after your interview) |

**Key talking point:** TOPS + NGCS added ~930K hp in 12 months. That's a 25% fleet growth with different telemetry systems that need unified data integration. This is the core challenge they're hiring for.

---

## SECTION A: Opening + Resume Defense (5 Questions)

### Q1: "Tell me about yourself." *(Everyone — opening, keep to 60 seconds)*

**Answer:** "I'm an AI Engineer with 5+ years of software engineering experience. Last 2 years focused on GenAI and data engineering in the energy sector — building enterprise RAG systems, multi-agent workflows, and PySpark ETL pipelines for operational data. Before that, ML Engineer at TestMachine where I integrated LLM-powered root cause analysis into DevOps monitoring pipelines. Before that, founding engineer at an AI startup where I built an e-learning platform for ML developers and grew it to over 200 monthly pay customers. I'm finishing my Master's in AI at CU Boulder. Archrock sits at the intersection of everything I do — data engineering at scale, ML for operational impact, and Azure infrastructure in energy."

*60 seconds. They've heard this once — be tighter than round 1.*

---

### Q2: "Tell me about your work at TestMachine." *(Kunal or Vishnu — resume probe)*

**Answer:** "TestMachine was a DevOps observability startup for digital assets in Ann Arbor. I was the ML Engineer from late 2022 to early 2024. The core product was CI/CD pipeline monitoring with AI-powered diagnostics. My work fell into a few areas:

**First, LLM-driven root cause analysis.** When customer CI/CD pipelines failed, our system used LLM tool-calling to query build logs, test results, and deployment configs, then produced structured diagnostic reports — root cause, contributing factors, recommended fix. I built the tool-calling orchestration and the structured output parsing.

**Second, the API layer.** I built and maintained the core ingestion and diagnostic endpoints — RESTful microservices handling telemetry from customer CI/CD systems, webhook integrations, and the diagnostic query API.

**Third, cloud infrastructure.** I owned the containerized deployment — Docker, Kubernetes, CI/CD, infrastructure as code."

**Bridge to Archrock:** "The diagnostic agent I built for compressor monitoring is architecturally identical to what I built at TestMachine — LLM with tool calls querying operational data, producing structured reports. The domain changed from DevOps to compressor operations, but the pattern is the same: ingest telemetry, detect anomalies, diagnose root cause, output structured actions."

**Probe: "Why did you leave?"**
→ "The company pivoted in a direction that moved away from the ML and data engineering work I wanted to focus on. I used the transition to go deeper into data engineering for energy operations — which is where I've been the last two years and what led me to this role."

**Probe: "What was the hardest technical challenge?"**
→ "Handling the diversity of CI/CD systems. Every customer's pipeline emitted different log formats, different failure modes, different naming conventions. We needed a normalization layer at ingestion — canonical schemas, source-specific mapping configs, dead letter routing for malformed data. Sound familiar? That's the TOPS/NGCS integration problem — different telemetry systems, different formats, unified into a canonical schema."

---

### Q3: "Tell me about the AI startup you co-founded." *(Kunal or Laura — resume probe)*

**Answer:** "I was the founding engineer at an AI startup from 2020 to late 2022. We built an e-learning platform for machine learning developers — launched right after COVID when demand for online ML education exploded. We grew to 50 B2B pilot customers — companies using the platform to upskill their ML teams.

**As founding engineer, I built the entire platform from zero.** Course authoring tools, interactive coding environments, assessment engine, student progress tracking. I made all the initial technology decisions — stack, architecture, deployment. When you're the first engineer, you do everything.

**Multi-tenant SaaS architecture.** Each B2B customer had isolated data, custom branding, usage analytics. I designed the multi-tenant infrastructure — schema-per-tenant PostgreSQL, shared compute, tenant-specific access controls. Scaled from 0 to 50 tenants as a single-engineer backend.

**Data engineering.** I built our analytics ETL — student engagement clickstream data, course completion rates, assessment scores. Ingested raw events, transformed to aggregated metrics, served to B2B customer dashboards. This was my first end-to-end data pipeline.

**Early GenAI adoption.** I integrated GPT-3 in 2021 — before ChatGPT existed — for automated code review of student submissions, intelligent hint generation, and personalized learning paths. Few-shot prompting, embedding-based content recommendation. We were using LLMs for production features when most companies hadn't heard of them yet."

**Bridge to Archrock:** "Three things from that experience are directly relevant here. First, I've built from zero before — Archrock is building a data platform with no CTO, no CIO. I know how to make technology choices when there's no existing playbook. Second, multi-tenant data isolation is conceptually similar to per-basin or per-acquisition data segmentation — shared infrastructure, isolated views. Third, my first ETL pipeline was small-scale with Pandas; I later scaled that same pattern to PySpark with Delta Lake for 4,700 compressors. The progression was natural."

**Probe: "Why did you leave?"**
→ "The company ran into funding challenges. Post-COVID edtech was crowded — competing against Coursera and Udemy at scale is difficult when you're bootstrapped. I took the technical learnings — full-stack platform building, multi-tenant architecture, early LLM experience — and redirected to enterprise energy AI where the applications have clearer ROI and less consumer market risk."

**Probe: "What did you learn about working in ambiguity?"**
→ "Everything was ambiguous — every requirement. My approach: build the thinnest possible end-to-end slice first. For our analytics ETL, I didn't spec out every transformation. I built raw events to dashboard with one data source, one aggregation, one visualization. Once stakeholders could see data flowing, requirements clarified themselves. Concrete output is the fastest way to resolve ambiguity. I still use that approach."

---

### Q4: "Tell me about a time you led a technical decision others disagreed with." *(Kunal or Laura)*

**Answer:** "On an energy consulting engagement, I proposed using a heuristic rule-based approach for remaining useful life prediction instead of training a neural network. The data science team pushed back — they wanted an LSTM. I argued that with limited run-to-failure data (fewer than 20 failure examples), a hand-tuned heuristic with domain knowledge would outperform a poorly-trained neural net and be explainable to field engineers. I built both as a proof-of-concept, tested on holdout data, and the heuristic had better precision at the 72-hour prediction window. The team agreed. The lesson: model complexity should match data maturity, not ambition."

**Probe:** "What would change your mind?"
→ "Scale. With 4,700 compressors and hundreds of run-to-failure examples per year, you'd have the data to train an LSTM on failure degradation curves. I'd keep the heuristic as a fallback for compressor models with fewer than 10 failure examples."

---

### Q5: "How do you handle ambiguity — unclear requirements?" *(Laura)*

**Answer:** "At the AI startup, I was the founding engineer — every requirement was ambiguous. My approach: build the thinnest possible end-to-end slice first. For our ETL system, I didn't spec out every transformation. I built Bronze-to-dashboard with one data source, one transformation, one visualization. Once stakeholders could see data flowing, requirements clarified themselves — they'd say 'I need this metric hourly, not daily' or 'I need it grouped by region.' Concrete output is the fastest way to resolve ambiguity."

**Bridge to Archrock:** "With the TOPS and NGCS integrations, there's probably ambiguity about how different telemetry formats should unify. I'd start with one compressor model from each acquisition, build a unified Silver layer for those, validate with the team, then scale across the fleet."

---

## SECTION B: Architecture Deep Dives (3 Questions)

### Q6: "Design a telemetry pipeline for Archrock's 4,700 compressors." *(Kunal — HIGH PRIORITY)*

**Answer:**

"Medallion architecture on Fabric with 4 lakehouses.

**Ingestion:** Detechtion Enbase edge devices push telemetry to Azure Event Hubs. At 4,700 compressors with 5-minute intervals, that's ~16 messages/second sustained — comfortable for Event Hubs with 16 partitions sharded by basin (~300 compressors per partition, no hot partitions).

**Bronze:** Spark Structured Streaming reads from Event Hubs, writes append-only Delta Lake tables partitioned by ingestion_date. Explicit StructType schemas — never inferSchema, which is 10-100x slower and loses type safety. 7-year retention for EPA OOOOb compliance. This layer is immutable — raw data is never modified.

**Silver:** Batch every 15 minutes. Dedup on composite key (compressor_id + timestamp), null handling (drop rows where all critical sensors null), timestamp validation (reject >30 days old or >1hr future), range validation against physical bounds from thresholds config, and per-compressor 4-sigma outlier removal. 4-sigma not 3-sigma because compressor cycling causes legitimate spikes that 3-sigma flags at ~15% false positive rate — 4-sigma reduces that to under 1%. Quality gates: if Silver rejects >10% of Bronze records, halt and alert.

**Gold:** Hourly batch. Rolling aggregations at 1hr, 4hr, 24hr windows using rangeBetween for time-ordered per-compressor windows. Derived metrics: pressure differential (discharge minus suction), temperature rate-of-change, vibration trend ratio. Threshold flags: normal/warning/critical based on API 618 and ISO 10816 standards. Partitioned by date and region, Z-ordered by compressor_id for fast per-unit queries. 4,700 compressors × 24 hours = 112,800 hourly aggregates per day — massive reduction from 1.35M raw rows.

**ML:** Batch every 4 hours. Four models: Isolation Forest for anomaly detection (24-48hr early warning), linear regression for temperature drift prediction (hours until warning/critical), EPA Subpart W factors for emissions estimation (OOOOb compliance), and heuristic RUL prediction from sensor degradation patterns. Centralized feature store ensures training/serving consistency. Results persisted to ML lakehouse.

**Serving:** Direct Lake mode lets Power BI read Gold Delta files directly from OneLake — near-real-time dashboards with no data copy. SQL Analytics Endpoint for ad-hoc queries. AI diagnostics agent on FastAPI sidecar for field engineer support."

**Probe 1:** "What if a basin goes dark for 6 hours?"
→ "4-hour streaming watermark handles most gaps. Beyond that, a reconciliation batch job runs Delta MERGE on late arrivals — idempotent on (compressor_id, timestamp), safe to re-run. Quality checks flag when fleet completeness drops below 85% of expected compressors, distinguishing 'basin connectivity outage' from 'pipeline bug.'"

**Probe 2:** "How do you handle the TOPS acquisition compressors that have different telemetry formats?"
→ "Schema Registry at ingestion. Each acquisition's Enbase configuration maps to a canonical schema in Bronze. The mapping lives in config, not code — when TOPS sends 'disch_press_psi' instead of 'discharge_pressure_psi,' the registry normalizes it. Malformed messages route to dead letter queue. Silver only sees the canonical schema."

**Probe 3:** "What about cost?"
→ "Fabric F64 capacity for 4,700 compressors. Cost levers: Bronze retention is the biggest — 7 years × 270 MB/day ≈ 700 GB. Apply lifecycle tiering: hot for 90 days (query frequent), cool for 1 year, archive after that. Gold and ML tables are smaller — 90-day retention. The real saving is Direct Lake eliminating the need for Import mode Power BI datasets."

---

### Q7: "How would you integrate TOPS + NGCS telemetry into a unified pipeline?" *(Kunal or Vishnu)*

**Answer:** "Three phases.

**Phase 1 — Discovery (2 weeks):** Inventory every telemetry field from both acquisitions. Map to canonical schema. Identify gaps — TOPS may not send the same sensors as legacy Archrock units. Document data quality baseline for each fleet segment.

**Phase 2 — Ingestion Normalization (4 weeks):** Schema Registry with per-source mapping configs. Each acquisition's raw data lands in Bronze with a `source_system` tag (archrock_legacy, tops, ngcs). Silver applies source-specific cleaning rules — TOPS electric compressors may have different valid ranges than gas-driven units. Quality checks run per-source initially to catch integration issues without contaminating the unified pipeline.

**Phase 3 — Unified Gold (2 weeks):** Once Silver is clean, Gold aggregations don't care about source — a compressor is a compressor. ML models may need retraining if sensor distributions differ significantly between fleets. Monitor for data drift using Population Stability Index on feature distributions post-integration."

**Probe:** "What's the hardest part?"
→ "Metadata alignment. Station assignments, compressor model classifications, and maintenance history from TOPS and NGCS need to map to Archrock's existing hierarchy. You get edge cases — a station that TOPS calls 'Permian Station 47' and Archrock calls 'PS-047-A'. That's a manual reconciliation step that no amount of automation fully solves. I'd build a mapping table, have operations validate it, and use SCD Type 2 so historical data always joins to the metadata that was accurate at the time."

---

### Q8: "Design the EPA OOOOb compliance reporting pipeline." *(Laura or Kunal)*

**Answer:** "OOOOb requires continuous methane monitoring with full auditability.

**Data sources:** Ecotec TDLAS laser readings for methane concentration, Carbon Hawk capture volumes, ECOFLOW packing vent flow rates, plus standard operational telemetry (pressure, temperature, flow rate) for EPA Subpart W emission factor calculations.

**Calculation:** EPA Subpart W formula applies standard emission factors to compressor operational parameters — flow rate, pressure, temperature. CH4 emissions in metric tons, converted to CO2 equivalent using GWP of 28. I use standard EPA factors, not proprietary calculations, because regulators can verify the methodology.

**Audit trail:** Every reported number must trace back to the raw sensor reading. That's why Bronze is immutable with 7-year retention — you can replay any calculation from raw data. Delta Lake time travel provides point-in-time snapshots. Each emissions calculation records: input readings (with timestamps), formula version, and output value.

**Reporting:** Gold layer emissions aggregates by compressor, station, basin, and period. Power BI reports for internal monitoring. Structured exports in EPA-required format for regulatory submission.

**Anomaly detection integration:** The ML anomaly detector catching packing leaks early means emissions spikes are caught before they become reportable events — reducing both compliance risk and environmental impact."

**Probe:** "What if an auditor asks you to reproduce a specific emissions number from 3 years ago?"
→ "Delta Lake time travel on Bronze to the exact timestamp. Re-run the Subpart W calculation with the same formula version. If the schema or formula has changed since then, the versioned pipeline code in git reproduces the exact logic. That's the whole point of immutable Bronze with long retention."

---

## SECTION C: Spark & Fabric Technical Depth (3 Questions)

### Q9: "Walk me through how Spark executes a query." *(Vishnu)*

**Answer:** "DataFrame API call → logical plan → Catalyst optimizer → physical plan → DAG of stages → task execution.

Catalyst does the heavy lifting: predicate pushdown (push WHERE clauses to the data source so you read less), column pruning (read only needed columns from Parquet — huge for wide tables), join reordering (smallest table first), and constant folding.

Physical planning picks concrete strategies — broadcast hash join for small tables (< 10MB), sort-merge join for large-large joins. The plan compiles into a DAG of stages separated by shuffle boundaries (wide dependencies like groupBy, join). Within each stage, tasks run in parallel across partitions.

When debugging, I check the physical plan: are pushed predicates actually pushed? Is partition pruning active? Did it pick broadcast or sort-merge? Are there unnecessary shuffles from bad partitioning?"

**Probe:** "What's AQE and why does it matter?"
→ "Adaptive Query Execution — enabled by default in Fabric and Spark 3.x. It re-optimizes the plan at runtime based on actual data statistics from completed shuffle stages. Three wins: (1) coalesces small partitions after skewed shuffles, (2) converts sort-merge joins to broadcast if one side turns out small, (3) splits skewed partitions so no single task becomes a bottleneck. It handles 95% of skew problems without manual intervention."

---

### Q10: "How do you debug a Spark OOM error?" *(Vishnu)*

**Answer:** "Driver OOM vs executor OOM — different causes, different fixes.

**Driver OOM:** Almost always caused by `collect()`, `toPandas()`, or `count()` on a large dataset pulling results to the driver. Fix: don't collect. Use `mapInPandas()` for distributed processing, or if you must collect, sample first. Also caused by too many accumulated broadcast variables.

**Executor OOM:** Usually shuffle-related — a single partition is too large (skew) or there are too many partitions causing overhead. Check: (1) Are shuffle partitions balanced? Look at Spark UI stage details for max vs median partition size. (2) Is there a skewed key? One compressor_id with 10x more readings than others. Fix: increase `spark.sql.shuffle.partitions`, enable AQE for automatic skew handling, or salt the key if extreme.

**My approach:** Spark UI first — the SQL tab shows the physical plan with actual row counts at each stage. The Stages tab shows task duration distribution — one long task in a sea of short ones = skew. The Storage tab shows cached/broadcast data sizes."

**Probe:** "At 4,700 compressors with 1.35M rows/day, what partition count would you use?"
→ "Target 128-256 MB per partition for shuffle operations. 1.35M rows × ~200 bytes/row ≈ 270 MB/day. For a daily batch: 200 shuffle partitions gives ~1.35 MB per partition — too small, too much scheduling overhead. I'd use 8-16 partitions for daily batch. For multi-day reprocessing (e.g., 10 days = 2.7 GB), 20-30 partitions. AQE auto-coalesces anyway, so slightly over-partitioning is safe."

---

### Q11: "Delta Lake MERGE — how does it work internally?" *(Vishnu)*

**Answer:** "MERGE is Delta's upsert operation. Under the hood: it scans the target table for matching rows (using the ON clause), classifies each target row as matched or not-matched, then writes a new version of the transaction log that references updated Parquet files for changed rows and keeps pointers to unchanged files.

The key insight: Delta doesn't modify Parquet files in place. It writes new files and updates the _delta_log JSON to point to them. Old files are retained for time travel until VACUUM runs.

**For idempotent writes:** MERGE on (compressor_id, timestamp) as keys. WHEN MATCHED: update values. WHEN NOT MATCHED: insert. This means if late-arriving data replays, the same reading just overwrites itself — no duplicates.

**Performance:** MERGE scans the target, so partition pruning is critical. If Gold is partitioned by date, a MERGE that includes the date in the ON clause or a filter prunes to just that partition. Without pruning, it scans the entire table — fatal at scale."

**Probe:** "Concurrent MERGE operations — what happens?"
→ "Optimistic concurrency. Both transactions proceed independently. At commit time, the second transaction checks if any files it touched were modified by the first. If so, it retries — re-reads the new state and re-applies changes. If the retry also conflicts, it fails. In practice, this works fine when different partitions are being updated (no conflict), but two jobs MERGEing the same partition will serialize."

---

## SECTION D: ML & AI in Production (2 Questions)

### Q12: "Your diagnostics agent — how do you prevent hallucinations?" *(Kunal)*

**Answer:** "Three guardrails.

**1. Structured output:** Pydantic model with typed fields — severity must be one of (healthy/warning/critical/emergency), confidence is a float 0-1, recommended actions have priority enums. The LLM can't return freeform text where structured data is expected.

**2. Tools, not knowledge:** The agent queries the database for sensor readings, alerts, ML predictions, and maintenance history via tool calls. It reasons over retrieved data, not parametric memory. If the data says vibration is 3.2 mm/s and the threshold is 4.5, the agent can't hallucinate a vibration of 10.

**3. Confidence scoring:** The agent assigns a confidence score. Low confidence (< 0.5) triggers a disclaimer: 'insufficient data for diagnosis, recommend manual inspection.' Field engineers learn to trust high-confidence reports and escalate low-confidence ones.

**Framework choice:** Pydantic AI over LangGraph because this is single-agent structured output with 5 tool calls — not multi-agent orchestration. Simpler = fewer failure modes. For a multi-agent system like the RAG pipelines I built for supply chain operations, LangGraph's graph-based orchestration with conditional routing makes sense."

**Probe:** "What if the agent recommends replacing a part that doesn't need replacing?"
→ "The recommended_actions have a rationale field — the agent must explain why. 'Replace bearing: vibration trending at 2x baseline over 72 hours, matching bearing wear degradation curve, RUL model estimates 48 hours remaining.' A field engineer can verify the data. The agent augments judgment, it doesn't replace it."

---

### Q13: "How would you use GenAI beyond the diagnostics agent?" *(Kunal)*

**Answer:** "Three applications with clear ROI.

**1. Natural Language Query Agent:** Non-technical stakeholders — field supervisors, operations managers — query the data platform in plain English. 'Show me all Permian compressors with vibration warnings in the last 7 days.' Agent translates to SQL, runs against Gold layer, returns formatted results. Saves hours of waiting for analyst reports.

**2. Maintenance Report Generation:** After a maintenance event, field technicians enter notes in free text. A GenAI agent extracts structured data: parts replaced, failure mode, root cause, downtime hours. This feeds back into the ML training loop — structured failure data improves RUL predictions.

**3. Anomaly Explanation:** When the Isolation Forest flags an anomaly, a GenAI agent contextualizes it: 'COMP-2847 flagged anomalous. Contributing factors: vibration 2.3x 24hr average, similar pattern to bearing wear failures in same compressor model. Last maintenance: 847 days ago. Recommended: inspect bearings within 48 hours.' This bridges the gap between a statistical flag and actionable intelligence."

---

## SECTION E: Scenario-Based Problem Solving (2 Questions)

### Q14: "Anomaly model suddenly flags 40% of the fleet." *(Kunal)*

**Answer:** "That's not 40% of compressors failing — that's the model failing.

**Step 1:** Check for data quality issues first. Did a sensor calibration change affect an entire basin? Did a firmware update change telemetry format? Check quality metrics for a spike in rejected records or unusual feature distributions.

**Step 2:** Check feature drift. Compare current feature distributions to the model's training data using PSI. If vibration distributions shifted fleet-wide (e.g., seasonal temperature affects vibration baselines), the model is scoring against outdated assumptions.

**Step 3:** Check for a fleet-wide event. Look at geographic distribution — if all 40% are in one basin, it might be a legitimate upstream gas supply issue affecting all compressors simultaneously. Not individual failures, but a basin-level condition.

**Step 4:** If it's model drift, don't just retrain blindly. Understand WHY distributions shifted. If it's seasonal, add temperature as a feature. If it's fleet composition change (TOPS/NGCS units), segment the model by compressor model.

**Action:** Suppress bulk alerts to avoid alert fatigue. Notify operations: 'Anomaly model flagging elevated — investigating root cause, do not action individual alerts until resolved.' Fix the model, validate on holdout data, re-deploy."

---

### Q15: "A field engineer says your predictions are useless." *(Laura or Kunal)*

**Answer:** "Take it seriously — they're the end user.

**Step 1:** Listen. Ask specific questions: 'Which predictions? Which compressors? What happened vs. what we predicted?' Get concrete examples, not general frustration.

**Step 2:** Validate. Pull the specific cases. If we predicted bearing failure on COMP-2847 and the technician found nothing wrong — that's a false positive. How many false positives vs. true positives in the last month? Track precision.

**Step 3:** Understand their workflow. Maybe the predictions are accurate but arriving too late (48 hours before failure isn't enough lead time to order parts). Or the severity levels don't match their mental model. Or the alert format is hard to read on a phone in the field.

**Step 4:** Close the loop. If predictions were wrong, that's training data — labeled negatives improve the model. If predictions were right but not useful, that's a UX problem. If predictions were right and useful but the engineer didn't trust them, that's an adoption problem.

**Key principle:** Field engineers have 20 years of domain knowledge. The AI augments their judgment — it doesn't override it. If they say it's useless, assume they're right until proven otherwise."

---

## SECTION F: Questions YOU Ask (Final Round)

### Ask Kunal (Hiring Manager):
1. **"With TOPS and NGCS adding nearly 1M hp in 12 months, what's been the biggest data integration challenge so far?"** — Shows you understand the real problem they're hiring for.
2. **"What's the AI use case you're most excited about for 2026?"** — Gets him talking about vision. Listen carefully — this tells you what the role will actually focus on.

### Ask Laura:
3. **"How do field technicians currently consume the data your team produces?"** — Shows you think about end users, not just pipelines.

### Ask Vishnu:
4. **"What's the most challenging pipeline you've built here, and what would you do differently?"** — Peer-level engineering question. Shows respect.

### Closing (Ask Anyone):
5. **"What would make you say, six months from now, 'hiring this person was the right call'?"** — Bold closer. Use only as your very last question.

---

## 45-Second Pitch

*If they ask you to summarize your background or project experience:*

"I've spent the last two years building data and AI infrastructure for energy operations. My core project is a compressor fleet monitoring platform designed for Archrock-scale operations — 4,700 compressors across 10 basins. The backend is a PySpark medallion pipeline: Bronze for raw sensor data in Delta Lake, Silver with 4-sigma outlier detection and data quality gates, Gold with rolling window aggregations and threshold flags. Four ML models run in production — anomaly detection, temperature drift prediction, EPA emissions for OOOOb compliance, and remaining useful life prediction. I also built an AI diagnostics agent using Pydantic AI that produces structured reports for field engineers. The PySpark + Delta Lake architecture maps directly to Fabric Lakehouse — same runtime, same format, same patterns."

---

## Key Phrases to Use

1. "At Archrock's scale with 4,700 compressors, I'd [specific adaptation]" — shows scale awareness
2. "I chose [X] because [trade-off reason]. With more data / at larger scale, I'd consider [Y]" — shows maturity
3. "The honest answer is [limitation]. Here's how I'd address that in production" — builds trust
4. "That maps directly to Fabric's [feature]" — shows platform awareness without overclaiming
5. "With the TOPS and NGCS integration, [relevant point]" — shows you did homework
6. "Field engineers / operations teams need [practical outcome], not [technical jargon]" — shows business sense

---

## Interview DOs

- Answer behavioral questions in STAR format (Situation, Task, Action, Result)
- Give specific examples — reference actual decisions and trade-offs
- Acknowledge limitations honestly, then explain your production plan
- Ask clarifying questions before diving into architecture answers
- Look at the **camera** when speaking (not the screen)
- Use interviewer names ("Great question, Vishnu...")
- When you don't know something: "I haven't done that in production, but here's how I'd approach it based on [related experience]"
- Show enthusiasm about the compressor operations domain — it's not generic "data engineering," it's keeping 4,700 machines running

## Interview DON'Ts

- Don't claim production Fabric experience you don't have — say "I designed the architecture for Fabric migration"
- Don't answer "yes/no" — always explain reasoning
- Don't badmouth previous employers or clients
- Don't oversell SQL-based automation as "AI" — be candid about the distinction
- Don't ask about salary, PTO, or benefits in this round
- Don't over-answer — if you see eyes glazing, wrap up with "happy to go deeper on any part of that"
- Don't be afraid of silence — take 3 seconds to think before complex questions
- Don't forget: they already liked you. This is about confirmation, not proving from scratch

---

## Closing Statement

"I've spent two years building data and AI infrastructure specifically for energy operations. The architecture I've designed — medallion pipelines, ML for predictive maintenance, AI diagnostics agents — maps directly to what Archrock needs as you scale the fleet and integrate TOPS and NGCS. I'm not coming in to learn the domain — I've already been working in it. I want to help build the data platform that keeps 4,700 compressors running. I'm excited about this team and this opportunity."

---

## Follow-Up Email (Send within 24 hours)

Subject: Thank you — Cloud Data & Solution Engineer

"Hi [Kunal/Laura/Vishnu/Minnu],

Thank you for taking the time to speak with me today. I especially enjoyed our discussion about [specific topic from the interview — be genuine].

The data integration challenges from the TOPS and NGCS acquisitions, combined with the opportunity to build on Fabric, are exactly the kind of problems I want to solve. I'm excited about the possibility of contributing to the team.

Looking forward to hearing from you.

Best,
David"

---

## OVERFLOW: If Time Allows

*These questions were cut from the main prep to keep it focused for 45 minutes. Reference them only if an unexpected topic comes up.*

### Behavioral Overflow

**"Tell me about a project that didn't go as planned."** *(Laura or Kunal)*

"I built a streaming ETL pipeline for real-time compressor analytics and spent two weeks optimizing sub-second latency. Then I realized compressor degradation happens over days, not seconds — hourly batch was more than sufficient for analytics, and sub-minute streaming was only needed for critical safety alerts like overpressure. I'd over-engineered because I defaulted to 'real-time is better' without validating the actual use case. I stripped the streaming layer back to critical alerts only and switched analytics to hourly batch, which was simpler to maintain and cheaper to run."

**Probe:** "How do you prevent that from happening again?"
→ "I now start every project by asking 'what decision does this data support, and how fast does that decision need to be made?' Compressor degradation = daily decisions = hourly batch. Overpressure = immediate safety = streaming. The freshness SLA follows the decision latency, not the other way around."

---

**"How do you explain technical trade-offs to non-technical stakeholders?"** *(Laura)*

"I translate into business outcomes. Instead of 'we should use 4-sigma outlier detection instead of 3-sigma,' I say 'the current approach flags 15% of readings as anomalies — most of those are normal compressor cycling. If we adjust the threshold, we reduce false alarms to under 1%, which means field engineers stop ignoring alerts and actually respond to real issues.' I've found that field teams and PMs don't care about the algorithm — they care about whether alerts are trustworthy."

**Probe:** "Give me an example of when a stakeholder disagreed with your recommendation."
→ "A PM wanted real-time dashboards refreshing every 10 seconds. I showed that with hourly aggregated data, the dashboard would show the same numbers for 60 minutes between updates. We agreed on 15-minute refresh aligned to the data freshness SLA. The key was showing them a prototype where the numbers literally didn't change between refreshes — that made the argument visual, not abstract."

---

### Architecture Overflow

**"Design a real-time alerting system for the fleet."** *(Kunal or Vishnu)*

"Two-tier architecture.

**Tier 1 — Streaming critical alerts (sub-minute):** Spark Structured Streaming on Event Hubs. Simple threshold checks on raw readings: overpressure, over-temperature, vibration spike above critical. These are safety-critical — no waiting for batch. Alert fires immediately to Teams webhook + on-call pager. Rule-based, no ML — deterministic and auditable.

**Tier 2 — Batch predictive alerts (hourly):** Gold layer ML models detect slower degradation: bearing wear trending up, temperature drift approaching threshold, anomaly score increasing. These generate alerts with severity levels and estimated time-to-failure. Routed to maintenance planning, not emergency dispatch.

**Deduplication:** Window function (partition by compressor_id, order by timestamp DESC, row_number = 1) ensures one active alert per compressor per condition. Alerts have lifecycle: open → acknowledged → resolved. Auto-resolve if 3 consecutive readings return to normal.

**Escalation:** Unacknowledged critical alerts escalate after 30 minutes. Unresolved warnings escalate after 24 hours. Each escalation logged to audit table."

**Probe:** "What if you get 500 alerts in one hour?"
→ "That's a fleet-wide event, not 500 individual problems. Group by basin first — if one basin accounts for 80% of alerts, it's likely a regional issue (weather, gas supply interruption, SCADA config change). Surface the pattern to operations as one incident, not 500 tickets. The diagnostic agent can help triage: 'Basin X has 400 pressure alerts — consistent with upstream supply pressure drop, not individual compressor failures.'"

---

**"How would you build a Feature Store for fleet-scale ML?"** *(Kunal)*

"Centralized computation, versioned storage, consistent serving.

**Computation:** Transform Gold hourly aggregates into feature vectors. Feature sets per domain: vibration features (current, 4hr avg, 24hr avg, trend ratio, rate of change), thermal features (same pattern), pressure features (differential, suction stability), operational features (flow efficiency, runtime hours). Cross-window ratios like vibration_trend_ratio = current / 24hr_avg — if > 1.0, unit is trending upward.

**Storage:** Delta Lake in ML lakehouse. MERGE upsert on (compressor_id, timestamp, feature_set) — idempotent. Partition by date.

**Serving:** Two modes. Training: historical features with ability to exclude known-failure compressors (train on healthy units only for anomaly detection). Inference: latest features per compressor, one row per unit.

**Drift monitoring:** Compute mean/std/min/max per feature over training period. Compare current feature distributions weekly using PSI. If any feature PSI > 0.2, flag for investigation — could be data issue or genuine fleet behavior change (e.g., seasonal temperature shifts)."

**Probe:** "Why not use Fabric's built-in feature store?"
→ "I would in production — Fabric's ML module has feature store capabilities with MLflow integration. The pattern I described maps directly to it. The advantage of understanding the underlying architecture is that when the managed service has limitations — like custom drift metrics or cross-feature interactions — you can extend it."

---

**"Architect the Detechtion Enbase edge-to-cloud data flow."** *(Vishnu or Kunal)*

"Edge → Event Hubs → Bronze → downstream.

**Edge (Enbase device):** Single hub per compressor combining monitoring, protection, control, optimization. Reads sensors at high frequency (likely sub-second), aggregates to 1-minute or 5-minute intervals for transmission. Local buffering during connectivity gaps — critical for remote Permian/Eagle Ford sites.

**Transport:** MQTT or HTTPS to Azure Event Hubs. 16 Event Hub partitions sharded by basin — deterministic routing so all compressors in a basin land in the same partition, enabling basin-level ordering. At 4,700 units with 5-min intervals: ~16 msg/sec sustained, with bursts when buffered data flushes after connectivity restores.

**Schema validation:** Schema Registry at Event Hub consumer validates message structure before Bronze write. Invalid messages → dead letter topic with original payload + validation error + timestamp. Dead letter queue is monitored — sustained failures indicate firmware issues on specific Enbase devices.

**Exactly-once:** Event Hub consumer with Spark checkpointing stores committed offsets. If pipeline restarts, replays only from last checkpoint. Bronze is append-only Delta Lake — even if a message processes twice, the downstream dedup in Silver on (compressor_id, timestamp) catches it."

**Probe:** "What if Enbase firmware updates change the message schema?"
→ "Schema Registry versioning. New firmware registers a new schema version. Bronze accepts both (merge schema enabled). Silver's explicit StructType handles the mapping — new fields get default values until Silver code is updated. We never break the pipeline for a schema addition. Schema removal or type change requires a coordinated migration."

---

### Spark & Fabric Overflow

**"Fabric Lakehouse vs Warehouse — when do you use which?"** *(Vishnu or Kunal)*

"Lakehouse for data engineering, Warehouse for BI/analytics.

**Lakehouse:** Delta Lake files on OneLake. PySpark notebooks, streaming ingestion, ML workloads. Schema-on-read flexibility for Bronze. This is where ETL pipelines live. Supports both structured and semi-structured data. Direct Lake mode for Power BI.

**Warehouse:** T-SQL engine, traditional star schemas, stored procedures. For analysts who think in SQL. Optimized for concurrent BI queries. Doesn't support Spark — pure SQL.

**For Archrock:** Lakehouse for the medallion pipeline (Bronze/Silver/Gold/ML). Warehouse only if there's a team of SQL analysts who need stored procedures and traditional BI patterns. Gold tables with Direct Lake mode gives you the best of both — data engineers work in Spark, analysts query via SQL endpoint, Power BI reads Delta directly.

**The anti-pattern:** Don't duplicate data between Lakehouse and Warehouse. OneLake shortcuts can expose Lakehouse tables to Warehouse SQL without copying."

---

**"Direct Lake mode — what are the limitations?"** *(Vishnu or Kunal)*

"Direct Lake reads Delta Parquet files directly from OneLake — no Import copy, no DirectQuery overhead. Best of both worlds in theory.

**Limitations:**
1. **Memory fallback:** If the Delta table exceeds the capacity's memory allocation, it silently falls back to DirectQuery — which is much slower. Users won't know unless you monitor query performance. Solution: keep Gold tables well-aggregated and partitioned.
2. **V-order required:** Tables need V-order optimization for best performance — basically a sort order that aligns with how Power BI scans columns. Run OPTIMIZE with V-order after batch writes.
3. **Refresh needed:** Direct Lake isn't truly real-time — it detects new Delta files but needs a refresh to pick them up. For Gold tables updated hourly, this is fine.
4. **No complex DAX pre-caching:** Import mode pre-computes aggregations in the VertiPaq engine. Direct Lake computes at query time from Parquet. For complex measures, this can be slower.

**For Archrock:** Gold hourly aggregates with Direct Lake is the sweet spot. Tables are pre-aggregated (112,800 rows/day, not 1.35M), partitioned by date and region, Z-ordered by compressor_id. Well within memory limits for any reasonable Fabric capacity."

---

**"Streaming vs batch — when do you choose which?"** *(Vishnu)*

"Match the data freshness to the decision latency.

**Streaming (sub-minute):** Safety-critical alerts — overpressure, over-temperature, vibration spike above critical threshold. These need immediate human response. Spark Structured Streaming from Event Hubs with 5-minute micro-batch trigger.

**Batch (hourly):** Analytics, ML predictions, dashboard metrics. Compressor degradation happens over days — bearing wear takes 3-8 days to progress from early warning to failure. Hourly batch gives 24 data points per day per compressor, plenty to detect trends. And it's simpler: easier to debug, cheaper to run, no checkpointing complexity.

**The hybrid:** Bronze ingestion is streaming (never lose data). Silver/Gold/ML are batch on a schedule: Silver every 15 minutes, Gold hourly, ML every 4 hours. This gives you near-real-time safety with cost-efficient analytics.

**Concrete numbers:** Streaming Silver for 4,700 compressors costs ~2x the compute of batch (always-on cluster vs. scheduled). The ROI only justifies streaming if the 15-minute delay between batch runs would miss a safety-critical event — and for degradation patterns, it won't."

---

### ML/AI Overflow

**"How do you decide when to retrain a model?"** *(Kunal)*

"Three triggers, in order of urgency.

**1. Performance degradation:** Ground truth comparison — predicted anomalies vs. actual maintenance events within 48 hours. If precision drops below 70% (too many false positives) or recall drops below 80% (missing real failures), retrain. Check weekly.

**2. Data drift:** Population Stability Index on feature distributions. If any feature's PSI exceeds 0.2, the input data has shifted enough that the model's training assumptions may not hold. Common causes: seasonal temperature changes, fleet composition change (TOPS/NGCS units have different baselines), sensor calibration drift.

**3. Scheduled:** Quarterly retrain regardless, incorporating new failure examples. Fleet-scale means you accumulate failure data continuously — each quarter adds ~50-100 new run-to-failure examples across the fleet.

**The pipeline:** Feature store serves historical training data. MLflow tracks each training run with hyperparameters, metrics, and the training dataset version. New model goes to staging, runs in shadow mode alongside production for 1 week, then promotes if metrics are equal or better."

**Probe:** "How do you handle concept drift vs. data drift?"
→ "Data drift is input distribution changing — features look different. Concept drift is the relationship between features and outcomes changing — same inputs, different correct answers. Example: Archrock installs a new compressor model with different vibration characteristics. Data drift: vibration distributions shift. Concept drift: the threshold that indicates 'anomalous' is different for this model. Data drift you catch with PSI. Concept drift you catch with ground truth monitoring. Both trigger retraining, but concept drift may also require feature engineering changes."

---

**"How would you A/B test ML models in production?"** *(Kunal)*

"Shadow mode, not true A/B split — for safety-critical predictions.

I wouldn't randomly assign compressors to different models when the prediction affects maintenance decisions. Instead: run the challenger model in parallel, store its predictions alongside the champion's, compare offline.

**Implementation:** Add a `model_version` column to the predictions table. Champion model predictions drive alerts and dashboards. Challenger predictions are logged but not surfaced. After 2-4 weeks, compare: precision, recall, time-to-failure accuracy for both. If challenger wins, promote via MLflow model registry — update the 'production' alias.

**Exception:** For non-safety predictions like emissions estimation, you could do a true A/B by basin — run Model A on Permian, Model B on Eagle Ford, compare accuracy against quarterly EPA audit numbers."

---

**"How do you optimize ML inference cost at fleet scale?"** *(Kunal or Vishnu)*

"The bottleneck is getting 4,700 compressors' features to the model, not the model itself.

**Current approach:** Collect latest features to driver, run sklearn models in-memory. At 4,700 rows × 7 features, that's ~130 KB — fits easily in driver memory. Four models run sequentially, each takes seconds. Total inference: under a minute.

**If scale grows (10,000+ units):** Switch to `mapInPandas()` — distribute model scoring across executors. Broadcast the serialized model to each executor, apply on partitioned data. No driver bottleneck.

**If model complexity grows (deep learning):** Move inference off Spark entirely. Batch predict via a model serving endpoint (MLflow or Azure ML). Spark writes features to a staging table, model service reads and writes predictions back. Decouples Spark compute budget from ML compute budget.

**Cost levers:** Run ML batch every 4 hours, not hourly — compressor degradation doesn't change in 1 hour. Use spot/preemptible instances for ML compute. Cache feature store results so feature computation doesn't re-run unnecessarily."

---

### Scenario Overflow

**"Pipeline succeeded but dashboards show wrong numbers."** *(Vishnu or Minnu)*

"Silent data corruption — the worst kind of failure.

**Step 1:** Check pipeline_runs metrics. Row counts per stage — did Bronze have the expected volume? Did Silver reject an unusual number of records? Sometimes a 'successful' pipeline processed 10% of expected data.

**Step 2:** Spot check. Pick a specific compressor, query Gold directly, compare to the dashboard. Is the issue in Gold (pipeline problem) or in the dashboard layer (Power BI/caching problem)?

**Step 3:** Check for schema changes. A new column from upstream that shadows an existing column name, or a type change that causes silent casting (string '100' to integer 100 but '100.5' to null).

**Step 4:** Check data freshness. Is the dashboard showing stale data from a previous run? Direct Lake needs a refresh to detect new Delta files. Gold timestamp audit: is the latest Gold record from today or yesterday?

**Step 5:** Check joins. A common culprit: a metadata table was updated (station reassignment, compressor model reclassification) that changed join results. SCD Type 2 with effective dates prevents this — historical readings join to the metadata that was current at the time."

---

**"A basin goes dark — no telemetry for 6 hours."** *(Vishnu or Kunal)*

"Distinguish infrastructure failure from pipeline failure.

**Step 1:** Check if the pipeline is running. If it is, the problem is upstream — no data arriving from Event Hubs. Check Event Hub metrics for that consumer group — are messages still being produced?

**Step 2:** Check Detechtion Enbase status. If the edge devices are buffering, telemetry will arrive in a burst when connectivity restores. The 4-hour streaming watermark handles most of it. Beyond 4 hours, the batch reconciliation job catches late arrivals via Delta MERGE.

**Step 3:** Alert operations. 'Basin X: no telemetry for 6 hours. Last reading: [timestamp]. Affected compressors: [count].' This is an operations issue (connectivity, power, satellite link), not a data engineering issue — but we surface it.

**Step 4:** When data resumes, validate the burst. Connectivity restoration often sends a backlog that can spike Event Hub throughput. Ensure auto-scaling handles the burst. Run quality checks specifically on the recovered data — buffered readings may have clock drift.

**Step 5:** Post-incident, update the quality report: 'Basin X lost 6 hours of data on [date]. Reconciled via batch. Gap in Gold aggregates for hours [X-Y].' This matters for EPA compliance — data gaps must be documented."

---

**"You discover PII in sensor metadata during migration."** *(Laura)*

"Stop, document, escalate.

**Step 1:** Halt the pipeline stage that's processing the affected data. Don't propagate PII downstream.

**Step 2:** Document what PII was found, where (which table, which column), how much (one record or systemic), and who might have had access via existing pipelines.

**Step 3:** Escalate to Laura's team (data governance) and legal/compliance. PII handling decisions are not engineering decisions alone — they involve privacy policy, potentially regulatory notification.

**Step 4:** Remediate. Mask or remove PII from Bronze (or create a PII-stripped copy if immutability is required for audit). Add a PII detection check to the quality framework — scan for patterns like SSN, phone numbers, email addresses in fields that shouldn't contain them. Add to the Schema Registry validation.

**Step 5:** Post-mortem. How did PII end up in sensor metadata? Was it a field in the source system that shouldn't have been transmitted? Fix at the source, not just in the pipeline."

---

### Questions You Ask — Overflow

6. **"How is the team structured today, and where does this role fit in the day-to-day workflow?"** *(Kunal)*
7. **"What does the governance framework look like today — is it something the team is building, or is there an established process?"** *(Laura)*
8. **"What does the testing and deployment workflow look like today?"** *(Vishnu)*
9. **"What's been the best part of working on this team?"** *(Minnu)*
10. **"What does success look like for this role in the first 6 months?"** *(Anyone)*

---

## Night-Before Checklist

- [ ] Read this guide top to bottom (main sections — skip overflow unless time)
- [ ] Practice Q1 (Tell me about yourself) out loud — 60 seconds, no rambling
- [ ] Practice Q2 (TestMachine) out loud — 90 seconds, hit all 4 bullets + bridge
- [ ] Practice Q3 (Startup) out loud — 90 seconds, hit all 4 bullets + bridge
- [ ] Practice Q6 (Design telemetry pipeline) out loud — 3 minutes, structured
- [ ] Practice the 45-second pitch once
- [ ] Review all 4 interviewer names, titles, and cheat sheets
- [ ] Review Fabric vs Synapse vs Lakehouse vs Warehouse distinctions (overflow if needed)
- [ ] Review Archrock intel table — know the numbers ($382M revenue, 4,700 units, 96% utilization, $1.4B acquisitions)
- [ ] Set up video: camera, lighting, background, shirt
- [ ] Have water nearby, phone on silent, notifications off
- [ ] Get a good night's sleep — you've done the work, trust it
