## QUESTIONS & ANSWERS

### "Tell me about yourself."

"I'm a data engineer with 5+ years in Azure and Python. For the last two years I've been consulting in oil and gas — building ETL pipelines, cloud infrastructure, and secure workflows for energy clients. I enjoyed the domain but I want to focus on building and solving problems at depth rather than splitting my time between engineering and business development. That's what drew me to Archrock — one hard problem at massive scale. I built Altaviz as a proof-of-concept to show I can think end-to-end about predictive maintenance."

---

### "Why Archrock? Why this role?"

"Two reasons. First, I've been working in energy for two years and I want to go deeper — Archrock's 4,500+ compressors across the Permian, Eagle Ford, and Haynesville basins is exactly the kind of scale where data engineering has real impact. Second, I want to be heads-down building, not sourcing the next engagement. This role lets me focus entirely on solving the data and ML problems that reduce downtime and keep compressors running."

---

### "Why are you leaving consulting?"

"I enjoy the technical work — that's why I stayed in energy. But consulting splits your time between engineering and business development. I want to focus on building — designing pipelines, solving data quality problems, deploying models. At Archrock, I'd be going deep on one domain with one team instead of context-switching across clients."

---

### "Walk me through your ETL pipeline architecture."

"Medallion architecture with 4 stages:

1. **Bronze:** Raw Parquet with explicit schema — immutable audit trail in Delta Lake
2. **Silver:** Clean — remove nulls, 4-sigma outlier detection, schema validation
3. **Gold:** Feature engineering — rolling windows at 1hr/4hr/24hr, rate of change, threshold flags. Partitioned by date
4. **PostgreSQL:** Hourly aggregates via JDBC. 83% volume reduction. ON CONFLICT DO UPDATE for upserts

Key decision: aggregates in PostgreSQL for dashboard performance, raw data stays in Delta Lake for reprocessing."

**Bridge:** *"Designed for dashboard performance and ML training — not just moving data from A to B."*

---

### "What was the hardest technical problem you solved?"

"Building the multi-tenant data isolation layer. Every query in the system — 12 functions in queries.ts — must be scoped by organization_id. I built org-aware views, parameterized all queries, and ensured the middleware extracts org from the authenticated session so no client can access another tenant's data.

The ETL pipeline writes to PostgreSQL via JDBC with connection string auth. The frontend uses the pg library with parameterized queries — no string interpolation anywhere near SQL."

**Bridge:** *"Multi-tenancy at scale is exactly the challenge with 4,500 compressors across different operators."*

---

### "What trade-offs did you make?"

"Three honest ones:

1. **Batch over streaming** — Compressor degradation is multi-day, so hourly batch is sufficient. I'd add a streaming layer for sub-minute critical alerts if needed
2. **Single aggregation table** — Discriminator column (window_type) instead of separate tables. Simpler ETL, but at 4,500-compressor scale I'd benchmark separate tables with columnstore indexes
3. **LSTM not yet trained** — Feature engineering and prediction schema are in place. I prioritized getting real data flowing end-to-end because that's the harder infrastructure problem

What I'd do differently: start with the database schema first and work backwards. I learned to define the schema and constraints up front before building the pipeline."

**Bridge:** *"I'd rather be honest about where I am than oversell. The infrastructure is solid — ML training is next."*

---

### "How would your system scale from 10 to 4,500 compressors?"

"The architecture is built to scale:

- **Compute:** Local Spark to cloud Spark Pool with autoscaling. Pipeline already batches compressors
- **Data volume:** 10 compressors = 100K readings/week. 4,500 = ~45M. Delta Lake partition pruning handles this
- **Database:** Add indexes and monthly partitioning on sensor_readings_agg
- **Real-time (if needed):** Event streaming (Event Hubs/Kafka) + Spark Structured Streaming alongside the batch pipeline"

---

### "What's your experience with Microsoft Fabric?"

"I built Altaviz as a full-stack platform:

- **Frontend:** Next.js 16 + React 19 with PostgreSQL via `pg` (node-postgres). All queries parameterized and org-scoped
- **ETL:** PySpark writes via JDBC to PostgreSQL. 5-stage medallion pipeline with ML inference
- **Schema:** 11 tables, 3 org-aware views, triggers, and proper FK constraints
- **Delta Lake:** Bronze/Silver/Gold tables for raw data retention and reprocessing

The architecture is designed to migrate to any cloud data warehouse — the medallion pattern and Delta Lake are portable."

---

### "How do you handle backfills or late-arriving data?"

"Delta Lake makes this straightforward. Bronze is append-only — late data arrives with its actual timestamp plus load timestamp. Silver flags it but still processes it. Gold's rolling window picks it up next run.

For the database, I use ON CONFLICT DO UPDATE — if an aggregate already exists for that compressor/window/hour, it updates. No duplicates, no data loss."

**Bridge:** *"With 4,500 compressors, some will always have connectivity gaps or delayed telemetry from remote sites."*

---

### "Walk me through how an alert gets generated end-to-end."

"Starting from the sensor:

1. Simulator generates readings every 10 min — vibration, temperature, pressure, flow rate
2. Bronze loads raw data untouched into Delta Lake
3. Silver cleans — 4-sigma outlier detection flags anomalies
4. Gold computes rolling averages and rate-of-change across 1hr/4hr/24hr windows
5. Database writer compares against thresholds from `config/thresholds.yaml` — based on API 618 and ISO 10816
6. Alert records created in `alert_history` with severity, metric, value, and threshold violated
7. Agentic workflows handle escalation — unacknowledged warnings become critical after 4 hours

The field tech sees 'COMP-003 vibration critical — bearing wear suspected' — not raw sensor values."

---

### "How do you think about data quality?"

"Four dimensions embedded throughout the pipeline:

1. **Freshness:** 15-minute SLA
2. **Completeness:** Max 5% missing rate
3. **Consistency:** Programmatic schema validation
4. **Accuracy:** 4-sigma outlier detection (not 3-sigma — compressor cycling causes normal spikes, I don't want false positives)

Each check is logged and surfaced on the dashboard."

---

### "How do you optimize PySpark pipelines?"

"Five patterns:

1. Explicit schemas (10-100x faster than inferSchema)
2. Single `.select()` vs chained `.withColumn()` — single pass, better Catalyst optimization
3. Adaptive Query Execution for runtime re-optimization

---

### "Tell me about a time you learned a new domain quickly."

"I wanted Altaviz to be realistic, not a toy demo. So I studied API 618 for reciprocating compressors and ISO 10816 for vibration severity. I researched Archrock's fleet — Ajax DPC-360, Ariel JGK/4, Caterpillar G3516 — and modeled their actual HP ratings. I designed three degradation patterns based on real failure modes: exponential vibration for bearing wear, linear temperature rise for fouling, sinusoidal pressure for valve degradation.

Domain experts can look at the thresholds and recognize them as industry-standard."

---

### "How does predictive maintenance impact the business?"

"Each unplanned shutdown costs $50K-$100K/day in lost throughput and emergency dispatch. If an RUL model predicts failure 3 days in advance, operations can schedule maintenance during planned downtime, pre-order parts, and dispatch the right technician.

That converts a $100K emergency into a $15K scheduled event. Across 4,500 compressors, that's massive savings."

---

### "What's your experience working with cross-functional teams?"

"Data engineering sits at the intersection of everyone:

- **With data scientists:** I make their models production-ready — containerize, add logging, handle edge cases
- **With field teams:** I design outputs for their workflow. That's why alerts use severity levels and compressor IDs, not statistical metrics
- **With business:** I translate trade-offs into business language — 'real-time alerts cost $X/month more, here's what that buys in response time'

Each group has a different definition of 'done.' For a data scientist it's the model works. For operations it's the dashboard changed their behavior."

---

### "A data scientist's code works locally but breaks in prod."

1. Containerize their environment for consistency
2. Check for hardcoded paths and environment-specific dependencies
3. Optimize memory — switch from full dataset loads to batch generators
4. Add logging to pinpoint the failure
5. Pair with them to make it production-ready — not throw it back"

---

### "Prioritize: production bug, stakeholder request, tech debt."

"Production stability is #1 — especially when uptime affects physical operations. Fix the bug first. Next, unblock the stakeholder if they're waiting. Tech debt gets scheduled for next sprint unless it caused the bug — then it becomes priority #1."

---

### "Fabric vs. Synapse: when to use which?"

"Fabric for speed and unified SaaS governance — OneLake's single-copy architecture eliminates data silos. Synapse when you need granular PaaS control — dedicated SQL pools, complex VNet configs, specific compliance requirements.

For Archrock's scale and direction, Fabric makes sense — simpler governance and it's Microsoft's strategic direction."

---

## QUESTIONS TO ASK KUNAL

1. **"Where are you in the Synapse to Fabric migration, and what's been the biggest technical challenge?"**
   Shows you know about the migration. Helps assess where you'd fit.

2. **"With the TOPS and NGCS acquisitions adding fleet capacity, how are you handling data integration from different telemetry systems?"**
   Shows you tracked the $1.3B in acquisitions. Integration work is directly relevant.

3. **"You mentioned on AI SuccessFactors that aligning AI with strategic goals is critical. What's the AI use case you're most excited about this year?"**
   References the podcast naturally. Gets Kunal talking about his vision.

4. **"How do field technicians currently consume the data your team produces?"**
   Connects to his theme of empowering technicians with actionable insights.

5. **"What does success look like for this role in the first 6 months?"**
   Shows you're outcome-oriented.

**Final question (if asked "Any last questions?"):**
> "What's the one thing that would make you say, six months from now, 'hiring this person was the right call'?"

---

## CLOSING STATEMENT

"Predictive maintenance at Archrock's scale is exactly the kind of problem I want to go deep on. I've spent two years building data infrastructure for oil and gas clients, and I'm ready to focus that experience on one team solving one hard problem. I built Altaviz to demonstrate I can think end-to-end — from sensor data through PySpark to a multi-tenant dashboard with ML predictions. I'm excited about bringing that to a team that's actively investing in AI and platform modernization."

---

## QUICK REMINDERS

- **No demo?** "I can walk you through the architecture and design decisions — that tells you more about how I think than clicking through screens."
- **Why energy?** You've been in it for 2 years. You know the domain. You chose Archrock deliberately.
- **Why not consulting?** You want to build, not sell. Depth over breadth.
- **Strongest cards:** (1) Built a full end-to-end platform. (2) Know the domain. (3) Studied Kunal's public positions.
- **Bridge everything back to:** field technician experience, predictive over reactive, production-ready architecture, business outcomes.
- **Archrock facts:** 4.5M+ HP fleet, $1.3B acquisitions (TOPS + NGCS), Ajax/Ariel/Caterpillar/Waukesha, Synapse → Fabric migration, Detechtion Technologies for IIoT.
