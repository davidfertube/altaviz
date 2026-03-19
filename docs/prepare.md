# Archrock AI Engineer Onboarding Playbook

> A comprehensive guide for the Cloud Data and Solution Engineer (AI Engineer) role at Archrock, Inc. Covers business context, technical expectations, high-impact AI use cases, internal dynamics, and a 90-day blueprint for conversion from contract to full-time.

---

## Table of Contents

1. [Understanding Archrock's Business](#section-1-understanding-archrocks-business)
   - 1.1 [What Archrock Does](#11-what-archrock-does)
   - 1.2 [The Fleet — Your Data Source](#12-the-fleet--your-data-source)
   - 1.3 [How Money Is Made](#13-how-money-is-made)
   - 1.4 [Financial Context (FY2025 Actuals)](#14-financial-context-fy2025-actuals)
2. [Your Role](#section-2-your-role)
   - 2.1 [Role Structure & Logistics](#21-role-structure--logistics)
   - 2.2 [JD Requirements — Skills Gap Analysis](#22-jd-requirements--skills-gap-analysis)
   - 2.3 [Day-to-Day Responsibilities Decoded](#23-day-to-day-responsibilities-decoded)
   - 2.4 [What Conversion Looks Like](#24-what-conversion-looks-like)
3. [The KPIs Leadership Cares About Most](#section-3-the-kpis-leadership-cares-about-most)
   - 3.1 [Tier 1: Numbers That Move the Stock](#31-tier-1-numbers-that-move-the-stock)
   - 3.2 [Tier 2: Operational KPIs](#32-tier-2-operational-kpis)
4. [Confirmed Technology Stack & Learning Plan](#section-4-confirmed-technology-stack--learning-plan)
   - 4.1 [The Stack](#41-the-stack)
   - 4.2 [Pre-Start Learning Priorities](#42-pre-start-learning-priorities)
   - 4.3 [The Three-Zone Data Model](#43-the-three-zone-data-model)
5. [High-Impact AI Use Cases](#section-5-high-impact-ai-use-cases)
   - 5.1 [Quick Wins (30-60 Days)](#51-quick-wins-30-60-days)
   - 5.2 [Medium-Term Wins (60-120 Days)](#52-medium-term-wins-60-120-days)
   - 5.3 [Strategic Plays (120+ Days)](#53-strategic-plays-120-days)
6. [Internal Dynamics](#section-6-internal-dynamics)
   - 6.1 [Org Structure That Matters](#61-org-structure-that-matters)
   - 6.2 [Making Kunal (and His Leadership) Look Great](#62-making-kunal-and-his-leadership-look-great)
7. [Agile Workflow, Azure DevOps & Deployment](#section-7-agile-workflow-azure-devops--deployment)
   - 7.1 [Working in Agile at Archrock](#71-working-in-agile-at-archrock)
   - 7.2 [Azure DevOps Best Practices](#72-azure-devops-best-practices)
   - 7.3 [Getting Access — First-Week Checklist](#73-getting-access--first-week-checklist)
8. [Measuring Outcomes](#section-8-measuring-outcomes)
   - 8.1 [AI Impact Framework](#81-ai-impact-framework)
   - 8.2 [Monthly AI Impact Report Template](#82-monthly-ai-impact-report-template)
   - 8.3 [Working with PM to Prioritize](#83-working-with-pm-to-prioritize)
9. [Becoming the Go-To AI Person](#section-9-becoming-the-go-to-ai-person)
   - 9.1 [First 90 Days Blueprint](#91-first-90-days-blueprint)
   - 9.2 [Building Credibility Across Teams](#92-building-credibility-across-teams)
   - 9.3 [Leveraging Your Unique Background](#93-leveraging-your-unique-background)
10. [Quick Reference — Archrock Vocabulary](#section-10-quick-reference--archrock-vocabulary)
- [Appendix A: Azure Services Mapping](#appendix-a-azure-services-mapping)
- [Appendix B: Additional Advice](#appendix-b-additional-advice)

---

## Section 1: Understanding Archrock's Business

### 1.1 What Archrock Does

Archrock is the largest U.S. provider of outsourced natural gas compression services. They own, deploy, operate, and maintain compressor packages that keep natural gas flowing through the midstream value chain — from wellhead through gathering systems, processing facilities, and into pipelines.

Natural gas does not move on its own. Compression is the physical force that pushes gas through every stage of the midstream chain. Without compression, wells back up, processing plants starve, and pipelines go idle. Archrock's business exists because most E&P and midstream companies would rather outsource the capital-intensive, operationally complex job of running compressors than do it themselves.

**Two business segments:**

- **Contract Operations (~85% of revenue):** Archrock owns the compressor packages, stations technicians on-site or nearby, and charges the customer a fixed monthly compression fee. The customer never touches the equipment. Archrock handles all maintenance, monitoring, repairs, and regulatory compliance. This is a recurring-revenue model with high gross margins (>70%) and long contract durations.

- **Aftermarket Services (~15% of revenue):** Maintenance, overhaul, reconfiguration, and parts sales for customer-owned compression equipment. This segment is more transactional but creates stickiness — customers who buy parts and service from Archrock are more likely to convert to full contract operations over time.

### 1.2 The Fleet — Your Data Source

The fleet is the core asset. Every sensor reading, every maintenance record, every failure event — it all starts with these machines in the field. Understanding the fleet at a statistical level is the foundation for every AI model you will build.

| Fleet Metric | Current Value | Why It Matters for AI |
|---|---|---|
| Total Operating HP | ~4.7 million | Scale of telemetry data available. At 5-minute intervals across thousands of units, you are looking at billions of sensor readings per year. |
| Fleet Utilization | 95-96% | THE top KPI. Every 1% swing in utilization equals millions in revenue. Your predictive models need to move this number up. |
| Avg HP per Unit | ~1,100 HP | Large units are complex, high-value assets worth optimizing. A single unplanned failure on a 3,000 HP unit can cost tens of thousands in lost revenue and emergency repair. |
| EMD (Electric Motor Drive) | ~815,000 HP (~17%) | Growing segment with different sensor profiles than gas-fired units. EMD units have different failure modes, different maintenance intervals, and different telemetry signatures. Your models need to handle both. |
| Remote Monitoring | Substantially all units | Detechtion/Enbase IIoT platform is your primary data pipeline. This is the firehose of sensor data that feeds everything you build. |
| Geographic Focus | Permian Basin (~2.5M HP), plus all major U.S. plays | Field conditions vary widely by basin. A compressor in the Permian desert operates differently than one in the Marcellus shale of Appalachia. Ambient temperature, altitude, gas composition, and humidity all affect sensor baselines and failure patterns. |

### 1.3 How Money Is Made

This is a recurring revenue model. Customers sign contracts (often multi-year) and pay a fixed monthly compression fee. Understanding the revenue model is critical because it tells you exactly where AI can create value.

**The Revenue Equation:**

```
Revenue = Operating HP Deployed x Utilization Rate x Monthly Rate per HP
```

**Key economic drivers:**

- **Uptime is everything.** A compressor that is down means the customer's gas stops flowing. That means a lost monthly fee, potential contract churn risk, and reputational damage. Every hour of unplanned downtime has a direct dollar cost. Your predictive maintenance models exist to minimize this.

- **Maintenance cost per HP directly impacts margins.** Contract Operations gross margins are above 70%, but maintenance is the biggest variable cost. If you can predict failures before they become catastrophic, you shift from expensive emergency repairs to planned, cheaper maintenance. This directly drops to the bottom line.

- **Fleet redeployment speed matters.** When a customer cancels a contract or a well declines, the compressor needs to be redeployed to a new customer as fast as possible. Idle iron earns nothing. AI can optimize which units go where based on gas composition, ambient conditions, and customer requirements.

### 1.4 Financial Context (FY2025 Actuals)

Understanding the financials matters because leadership makes resource allocation decisions based on these numbers. When you pitch an AI project, framing it in terms of its impact on these metrics is the difference between getting funded and getting ignored.

| Metric | FY2025 | Significance |
|---|---|---|
| Total Revenue | $1.49B | Record year, 41% YoY growth in Contract Operations. The business is scaling fast, which means more compressors, more data, and more opportunity for AI to add value. |
| Net Income | $322M | 89.6% YoY growth. Profitability is accelerating, which means the company has capital to invest in technology — but expectations are high. |
| Adjusted EBITDA | $835-850M range | Primary profitability KPI that analysts and leadership track. When you build an AI model, try to estimate its EBITDA impact. |
| Adj. EPS Growth | +68% YoY | Operating leverage is kicking in. More HP deployed at higher utilization with controlled costs. AI should amplify this trend. |
| Quarterly Dividend | $0.22/share | 16% YoY growth. Capital return focus means leadership is balancing growth investment against shareholder returns. Your projects need to show ROI. |
| Leverage Ratio | ~3.1x | Manageable but monitored closely. Debt service is a real cost, so any AI project that reduces capital expenditure or extends asset life has outsized impact. |

---

## Section 2: Your Role

### 2.1 Role Structure & Logistics

| Detail | Value |
|---|---|
| Official Title | Cloud Data and Solution Engineer (AI Engineer) |
| Location | 9807 Katy Fwy, Houston, TX 77024 |
| Work Arrangement | Hybrid — 4 days/week onsite, 1 day remote |
| Employment Structure | 12-month contract-to-hire |
| Contract Rate | $70/hr W2 or $80/hr 1099 |
| Conversion Salary | $130-140K |
| Team | Data Engineering & Analytics, reporting to Kunal Sharma |
| Role Type | Individual contributor + team player |

**Key implication:** Contract-to-hire. The 12-month contract period is your audition. Month 1-3 is the critical window where first impressions are formed. You need to demonstrate value early and consistently. Every interaction, every deliverable, every standup update is being evaluated — not just for technical skill, but for reliability, communication, and cultural fit.

### 2.2 JD Requirements — Skills Gap Analysis

This is an honest assessment of where you stand against every requirement in the job description, with specific prep actions ranked by priority.

| JD Requirement | Your Current Level | Prep Action / Priority |
|---|---|---|
| MS Fabric | Learning | **CRITICAL** — This is the primary data platform. Complete the MS Fabric Analytics Engineer learning path. Build at least one end-to-end pipeline in a Fabric trial workspace before Day 1. Understand Lakehouses, Warehouses, Notebooks, Data Pipelines, and Semantic Models. |
| Azure Synapse Analytics | Learning | **CRITICAL** — Synapse is the predecessor/complement to Fabric. Understand Dedicated SQL Pools, Serverless SQL, and Spark Pools. Know when to use Synapse vs. Fabric. Many existing pipelines may still run on Synapse. |
| Azure Data Lake Storage | Foundational | **HIGH** — You understand the concept but need hands-on experience with ADLS Gen2, hierarchical namespaces, ABFS protocol, ACLs, and integration with Fabric/Synapse. Your Altaviz project uses OneLake which is built on ADLS. |
| PySpark | Strong | **MAINTAIN** — Your Altaviz project demonstrates production-grade PySpark. Keep sharp on window functions, broadcast joins, structured streaming, and Delta Lake merge operations. |
| Python | Strong | **MAINTAIN** — Core strength. Continue building with Pydantic, FastAPI, scikit-learn, and async patterns. |
| TSQL | Moderate | **HIGH** — Archrock's data warehouse and many reporting queries use T-SQL. Practice window functions, CTEs, MERGE statements, dynamic SQL, and query optimization. Understand execution plans. |
| AI/ML Model Development | Strong | **MAINTAIN** — Your Altaviz ML models (anomaly detection, temperature drift, emissions, RUL) demonstrate this well. Be ready to discuss feature engineering, model selection, and validation strategies. |
| Gen AI Models | Strong | **MAINTAIN** — Your Pydantic AI agent architecture with RAG, embeddings, and structured outputs is directly applicable. Stay current on Azure OpenAI Service, prompt engineering, and responsible AI practices. |
| AI/ML Ops | Moderate | **HIGH** — You have MLflow experience but need to strengthen Azure ML, model deployment pipelines, A/B testing, monitoring for drift, and automated retraining. Understand CI/CD for ML models. |
| Azure DevOps | Moderate | **HIGH** — Learn Azure Repos (Git), Azure Pipelines (YAML), Azure Boards (work items, sprints), and PR review workflows. This is the daily collaboration tool. |
| Power BI | Basic | **MEDIUM** — You do not need to be a Power BI developer, but you need to understand Semantic Models, DAX basics, and how data engineers serve data to BI teams. Build one dashboard connected to a Fabric Lakehouse. |
| Azure Functions & API Integration | Moderate | **MEDIUM** — Your FastAPI experience transfers well. Learn Azure Functions (Python), HTTP triggers, timer triggers, and integration with Event Grid and Service Bus. |
| Data Pipeline Failure Management | Moderate | **HIGH** — This is critical for on-call reliability. Learn Azure Monitor alerting, log analytics queries (KQL), retry strategies, dead letter queues, and circuit breaker patterns. Practice incident response. |
| Database Management | Moderate | **MEDIUM** — Strengthen your understanding of Azure SQL, Cosmos DB, indexing strategies, partitioning, and performance tuning. Your PostgreSQL experience is a good foundation. |
| Data Governance & Security | Foundational | **MEDIUM** — Learn Microsoft Purview, data classification, sensitivity labels, row-level security, column-level encryption, and compliance frameworks relevant to oil and gas (EPA, SOX). |

### 2.3 Day-to-Day Responsibilities Decoded

The job description uses standard corporate language. Here is what each responsibility actually means in practice.

| JD Says | What It Actually Means |
|---|---|
| "Design and develop AI/ML models using Azure Machine Learning" | Build, train, validate, and deploy models that solve real business problems. Start with predictive maintenance and anomaly detection. You will own the full lifecycle from feature engineering through production deployment and monitoring. Not just prototypes — production models that run daily. |
| "Create and maintain data pipelines using MS Fabric and Synapse" | You are responsible for the plumbing. Data flows from IIoT sensors through Event Hubs into Bronze/Silver/Gold layers. When a pipeline breaks at 2 AM, you are the one who gets paged. Build pipelines that are idempotent, observable, and self-healing where possible. |
| "Collaborate with cross-functional teams to identify AI opportunities" | Walk the floor. Talk to operations managers, field technicians, sales reps, and finance analysts. Listen for pain points that data can solve. Translate business problems into technical requirements. Write user stories with the PM. This is where you find the high-impact projects. |
| "Implement data governance and security best practices" | Ensure data is classified, access-controlled, and compliant. Set up row-level security so field managers only see their region's data. Implement data lineage tracking. Handle PII and sensitive operational data correctly. This is not glamorous but it is career-ending if you get it wrong. |
| "Develop Power BI dashboards and reports" | Serve the data you engineer to business users through Power BI. Build semantic models in Fabric, write DAX measures, and create reports that answer leadership's questions. You do not need to be a designer, but the dashboards need to be accurate, fast, and self-service. |
| "Monitor and optimize pipeline performance" | Track pipeline run times, data quality metrics, and resource costs. When a Spark job that used to take 10 minutes starts taking 2 hours, you need to diagnose and fix it. Build monitoring dashboards, set up alerts, and run cost optimization reviews. |
| "Support data integration from multiple sources" | Archrock has data in many systems: Detechtion/Enbase (IIoT), SAP (ERP), Salesforce (CRM), SCADA, historian databases, Excel spreadsheets from field offices. You will build connectors, handle schema evolution, and manage data quality across all of them. |
| "Participate in Agile ceremonies and sprint planning" | Show up to standups, sprint planning, sprint review, and retrospectives. Give clear, concise status updates. Estimate work accurately. Flag blockers early. Be a reliable team member who delivers what they commit to. |

### 2.4 What Conversion Looks Like

Conversion from contract to full-time hire is not automatic. It is a decision made by Kunal and his leadership based on four criteria:

1. **Operational Reliability:** Your pipelines run without drama. When things break, you fix them fast and add safeguards so they do not break the same way again. You handle on-call rotations without complaint. You write runbooks. You are the person the team trusts to keep the data flowing.

2. **Measurable AI Impact:** You can point to at least one AI/ML model in production that has moved a business metric. Ideally, you can quantify it: "Predictive maintenance model reduced unplanned downtime by X% in the Permian Basin pilot, equivalent to $Y in avoided revenue loss." Numbers matter.

3. **Team Multiplication:** You make the people around you better. You write clear documentation, share knowledge in team sessions, mentor junior engineers, and contribute to code reviews. You are not a lone wolf — you are a force multiplier.

4. **Stakeholder Trust and Cultural Fit:** Operations managers, field supervisors, and sales reps trust you. They come to you with questions because you have earned credibility by delivering on commitments and communicating proactively. You fit into Archrock's culture of safety, reliability, and operational excellence.

---

## Section 3: The KPIs Leadership Cares About Most

### 3.1 Tier 1: Numbers That Move the Stock

These are the metrics that appear in earnings calls, investor presentations, and board meetings. If your AI models can demonstrably move any of these numbers, you will get attention from the highest levels of the organization.

| KPI | What It Measures | AI Opportunity |
|---|---|---|
| Fleet Utilization Rate | Percentage of available HP that is deployed and generating revenue. Target: 95-96%. | Predictive maintenance reduces unplanned downtime. Redeployment optimization fills idle units faster. Anomaly detection catches failures before they cause shutdowns. Every 1% improvement in utilization at current fleet size is worth millions in annual revenue. |
| Adjusted EBITDA | Earnings before interest, taxes, depreciation, and amortization, adjusted for one-time items. The primary profitability metric. | AI-driven cost reduction in maintenance (right part, right time, right technician) and operational efficiency (optimized routing, reduced truck rolls) directly improves EBITDA margins. |
| Contract Ops Gross Margin | Revenue minus direct costs for the contract operations segment. Currently >70%. | Reducing maintenance cost per HP through predictive rather than reactive maintenance directly improves this margin. Parts demand forecasting reduces inventory carrying costs. |
| Uptime / Availability | Percentage of time each unit is operational and available for service. | The most direct AI target. Every model you build — anomaly detection, failure prediction, root cause analysis — should ultimately improve this number. Track it at the unit level, station level, and fleet level. |

### 3.2 Tier 2: Operational KPIs

These are the metrics that operations leadership tracks daily. They do not appear in earnings calls, but they are the leading indicators that drive Tier 1 outcomes.

| KPI | What It Measures | AI Opportunity |
|---|---|---|
| MTBF (Mean Time Between Failures) | Average time a compressor runs between unplanned shutdowns. Higher is better. | Predictive maintenance and anomaly detection extend MTBF by catching degradation early. Track MTBF by compressor model, basin, and failure mode to identify systemic issues. |
| MTTR (Mean Time To Repair) | Average time from failure detection to return-to-service. Lower is better. | AI-powered root cause classification speeds diagnosis. Intelligent dispatch gets the right technician with the right parts on-site faster. Automated work order generation reduces administrative delay. |
| Technician Utilization | Percentage of technician time spent on productive maintenance vs. travel, waiting, and administrative tasks. | Route optimization reduces windshield time. Predictive scheduling bundles maintenance at nearby units. Automated reporting reduces paperwork. AI-powered troubleshooting guides reduce diagnostic time. |
| Parts Inventory Turnover | How quickly parts inventory cycles through. Balances having parts available vs. tying up capital in warehouse stock. | Demand forecasting prevents both stockouts (which delay repairs) and overstocking (which wastes capital). Lead time prediction for critical parts. Automatic reorder point optimization. |
| Emissions Intensity | Methane and CO2-equivalent emissions per unit of throughput or per operating HP. Regulatory and ESG focus. | Emissions estimation models (EPA Subpart W), leak detection analytics, and optimization of compressor operating parameters to minimize emissions while maintaining throughput. Regulatory compliance automation. |
| Safety (TRIR/PVIR) | Total Recordable Incident Rate and Process Vehicle Incident Rate. These are non-negotiable — Archrock has a "Target Zero" safety culture. | Predictive safety analytics, near-miss pattern detection, fatigue monitoring, and hazard identification. Never propose an AI solution that compromises safety. Always include safety implications in your analysis. |

---

## Section 4: Confirmed Technology Stack & Learning Plan

### 4.1 The Stack

This is the confirmed technology landscape you will work with daily. Your role touches every layer.

| Layer | Technology | Your Role With It |
|---|---|---|
| IIoT / Edge | Detechtion (Enbase) platform | Consumer of the data. Understand the sensor types, sampling intervals, and data quality characteristics. You will not manage the edge devices, but you need to know what data they produce and how it arrives. |
| Ingestion | Azure Event Hubs | Build and maintain streaming ingestion pipelines. Understand partitioning, consumer groups, checkpointing, and throughput units. Handle schema evolution and dead letter routing. |
| Data Platform | Microsoft Fabric (Lakehouses, Warehouses, Notebooks) | Primary development environment. Build data pipelines, run Spark notebooks, create semantic models. Understand the difference between Lakehouses and Warehouses and when to use each. |
| Data Lake | OneLake (ADLS Gen2 underneath) | Storage layer. Understand ABFS protocol, hierarchical namespaces, access control, and Delta Lake format. Manage Bronze/Silver/Gold medallion architecture. |
| Processing | PySpark 3.5 on Fabric Spark | Core data processing engine. Write performant Spark code with explicit schemas, broadcast joins, and window functions. Optimize for cost and performance. |
| Delta Lake | Delta Lake 3.0 | Table format for all layers. Understand ACID transactions, time travel, MERGE operations, OPTIMIZE, VACUUM, and Z-ordering. |
| SQL | T-SQL (Synapse/Fabric SQL endpoint) | Query data for analysis, reporting, and pipeline validation. Write complex queries with CTEs, window functions, and dynamic SQL. Optimize query performance. |
| AI/ML | Azure Machine Learning, scikit-learn, MLflow | Full ML lifecycle. Feature engineering, model training, experiment tracking, model registry, deployment, and monitoring. Both classical ML and deep learning. |
| Gen AI | Azure OpenAI Service, Pydantic AI | Build and deploy generative AI solutions. RAG pipelines, agent architectures, structured outputs, embeddings, and responsible AI practices. |
| BI / Reporting | Power BI, Fabric Semantic Models | Serve data to business users. Build semantic models with DAX measures. Create reports and dashboards. Understand row-level security and data refresh. |
| DevOps | Azure DevOps (Repos, Pipelines, Boards) | Daily collaboration tool. Git workflows, CI/CD pipelines, work item tracking, sprint planning, and PR reviews. |
| Monitoring | Azure Monitor, Log Analytics, KQL | Pipeline observability. Build dashboards, set up alerts, write KQL queries for log analysis, and create automated incident response. |
| Infrastructure | Terraform, Azure Resource Manager | Infrastructure as code. Provision and manage Azure resources. Understand networking, security groups, and resource tagging. |
| Security | Azure Key Vault, Managed Identities, Purview | Secrets management, identity-based access, data governance, and compliance. Never hardcode credentials. |

### 4.2 Pre-Start Learning Priorities

Ranked by impact on your first 90 days. Focus your prep time on the CRITICAL and HIGH items.

| Priority | Skill | Target Proficiency | Study Resource |
|---|---|---|---|
| 1 - CRITICAL | Microsoft Fabric | Build an end-to-end Lakehouse pipeline with Bronze/Silver/Gold layers | Microsoft Learn: Fabric Analytics Engineer path (DP-600). Get a Fabric trial and build something real. |
| 2 - CRITICAL | Azure Synapse Analytics | Understand architecture, Spark pools, SQL pools, and integration with Fabric | Microsoft Learn: Synapse Analytics path. Focus on how existing Synapse workloads migrate to Fabric. |
| 3 - HIGH | T-SQL Advanced | Window functions, CTEs, MERGE, execution plans, query tuning | Practice on LeetCode SQL problems. Read "T-SQL Fundamentals" by Itzik Ben-Gan. Write queries against your Fabric Warehouse. |
| 4 - HIGH | Azure DevOps | Repos, YAML pipelines, boards, PR workflows | Create a personal Azure DevOps project. Build a CI/CD pipeline that deploys a Python package. Practice the PR review workflow. |
| 5 - HIGH | Azure Monitor + KQL | Write log queries, build alerts, create dashboards | Microsoft Learn: KQL path. Practice in the Azure Monitor demo environment. Write queries that detect pipeline failures and data quality issues. |
| 6 - HIGH | MLOps on Azure | Model deployment, A/B testing, drift monitoring, automated retraining | Microsoft Learn: Azure ML path. Deploy a model with managed online endpoints. Set up data drift detection. |
| 7 - MEDIUM | Power BI | Build a semantic model, write DAX measures, create a report | Microsoft Learn: Power BI path. Connect Power BI to your Fabric Lakehouse and build a compressor fleet dashboard. |
| 8 - MEDIUM | Azure Functions | HTTP and timer triggers, bindings, deployment | Build a simple Azure Function that processes an Event Hubs message and writes to a database. Deploy with CI/CD. |
| 9 - MEDIUM | Data Governance (Purview) | Data classification, lineage, sensitivity labels | Microsoft Learn: Purview path. Understand how Purview integrates with Fabric for data governance. |

### 4.3 The Three-Zone Data Model

This is how you should think about the data environments at Archrock. Violating zone boundaries is one of the fastest ways to lose trust.

| Zone | What Lives Here | Rules |
|---|---|---|
| Zone 1: Personal / Learning | Your sandbox. Experimental notebooks, learning exercises, proof-of-concept models, and scratch analysis. | Anything goes technically. Use synthetic data or anonymized copies. Never connect to production data sources. Never share outputs as "official" analysis. Label everything as "DRAFT" or "EXPERIMENTAL." This zone can be messy. |
| Zone 2: Synthetic / Dev | Shared development environment. Integration testing, staging pipelines, demo datasets, and pre-production validation. | Use realistic synthetic data (like your Altaviz fleet simulator output). Pipelines should mirror production architecture. Code must pass PR review before merging. Data quality checks must pass. This zone should be clean enough to demo to stakeholders. |
| Zone 3: Production | Live data. Real compressor telemetry, real maintenance records, real financial data. Pipelines that business users depend on for decisions. | Strict change management. All changes go through Azure DevOps PR review and CI/CD pipeline. No manual edits to production data. All access is audited. Monitoring and alerting are mandatory. Runbooks for every failure mode. On-call rotation coverage. |

---

## Section 5: High-Impact AI Use Cases

### 5.1 Quick Wins (30-60 Days)

These are projects you can start during your first month and deliver initial results within 60 days. They are chosen because they use readily available data, have clear success metrics, and solve problems that operations leadership already recognizes.

#### Predictive Maintenance / Failure Prediction

**The Problem:** Compressor failures are expensive. An unplanned shutdown on a large unit can cost $10,000-50,000 in emergency repair costs, plus the lost monthly compression fee for every day the unit is down. Currently, maintenance is largely time-based (scheduled intervals) or reactive (fix it when it breaks).

**The AI Solution:** Build a predictive maintenance model that ingests sensor telemetry (vibration, temperature, pressure, flow) and identifies compressors showing early signs of degradation — 24 to 48 hours before failure. Start with the most common and costly failure modes: bearing wear and cooling system degradation.

**Your Altaviz Foundation:** You already have Isolation Forest anomaly detection, temperature drift prediction, and RUL estimation models. These can be adapted to real Archrock sensor data with minimal refactoring. The key work is feature engineering on real data and validation with historical failure records.

**Success Metric:** Demonstrate that the model would have predicted X% of historical failures with Y hours of advance warning. Target: 70% detection rate with <10% false positive rate on the first iteration.

**Stakeholder Impact:** Operations leadership will immediately understand the value. Frame it as: "This model gives your field supervisors a 24-hour heads-up before a failure, so they can schedule a planned repair instead of an emergency callout."

#### Automated Shutdown Root-Cause Classification

**The Problem:** When a compressor shuts down, the technician has to diagnose the root cause from alarm codes, sensor data, and physical inspection. This diagnosis step can take hours, and misdiagnosis leads to wasted truck rolls, wrong parts ordered, and extended downtime.

**The AI Solution:** Build a classification model that takes the sensor readings leading up to a shutdown event, the alarm codes triggered, and historical maintenance records for that unit, and outputs a ranked list of probable root causes with confidence scores.

**Your Altaviz Foundation:** Your diagnostics agent already does this with LLM-powered analysis. The production version at Archrock would combine a classical ML classifier (random forest or gradient boosting on structured sensor features) with an LLM-powered explanation layer for the technician.

**Success Metric:** Classification accuracy of top-3 root causes against historical records. Target: 80% accuracy where the correct root cause appears in the top 3 suggestions.

**Stakeholder Impact:** Field supervisors and dispatch coordinators will love this. Frame it as: "When a unit goes down, this tool tells your technician what is probably wrong and what parts to bring — before they drive to the site."

#### Platform Observability Dashboard

**The Problem:** As the data platform grows (more pipelines, more models, more users), nobody has a single view of platform health. Pipeline failures are discovered when a business user complains that their report is stale.

**The AI Solution:** Build a comprehensive observability dashboard in Power BI that tracks pipeline run status, data freshness, data quality scores, model prediction accuracy, and compute costs. Add alerting for anomalies in any of these metrics.

**Your Altaviz Foundation:** Your PipelineMonitor class and data quality framework provide the architecture. The Archrock version connects to Azure Monitor and Fabric monitoring APIs.

**Success Metric:** Mean time to detect a pipeline failure drops from hours (user complaint) to minutes (automated alert). Target: <15 minute detection time for any pipeline failure.

**Stakeholder Impact:** This is a credibility builder with Kunal and the data engineering team. It shows you care about operational excellence, not just flashy AI models.

### 5.2 Medium-Term Wins (60-120 Days)

These projects build on the foundation laid in the first 60 days and tackle more complex problems with higher organizational impact.

#### Intelligent Dispatch / Crew Optimization

**The Problem:** When multiple compressors need service in the same region, dispatch coordinators manually assign technicians based on experience and gut feel. This leads to suboptimal routing, mismatched skill levels, and excessive windshield time (driving between sites).

**The AI Solution:** Build an optimization model that takes the current service queue, technician locations and skill sets, parts availability, and priority levels, and outputs an optimized dispatch schedule that minimizes total response time while matching technician skills to the job requirements.

**Technical Approach:** This is a constrained optimization problem (variant of vehicle routing with time windows). Start with a greedy heuristic, then move to OR-Tools or a custom solver. Integrate with the work order system for real-time updates.

**Success Metric:** Reduction in average travel time per service call and improvement in first-time-fix rate. Target: 15% reduction in travel time, 10% improvement in first-time-fix rate.

#### Parts Demand Forecasting

**The Problem:** Parts warehouses either run out of critical components (causing delays) or overstock slow-moving parts (tying up capital). Current ordering is based on historical averages and individual judgment.

**The AI Solution:** Time series forecasting model that predicts parts demand by part number, warehouse location, and time horizon (1 week, 1 month, 1 quarter). Incorporate predictive maintenance signals — if the failure prediction model flags 10 units with probable bearing wear, automatically increase bearing inventory at the nearest warehouse.

**Technical Approach:** Start with statistical methods (ARIMA, Prophet) for baseline forecasting, then layer in ML features from the predictive maintenance model. Integrate with SAP for inventory and procurement data.

**Success Metric:** Reduction in stockout events and inventory carrying cost. Target: 25% reduction in critical part stockouts, 10% reduction in total inventory value.

#### Emissions Monitoring & Optimization

**The Problem:** EPA OOOOb regulations require monitoring and reporting of methane emissions from compressor stations. Current estimation methods are manual and conservative. Archrock has ESG commitments to reduce emissions intensity.

**The AI Solution:** Real-time emissions estimation model that calculates methane and CO2-equivalent emissions for every operating compressor based on sensor data (operating parameters, throughput, equipment condition). Identify units with abnormally high emissions for targeted maintenance.

**Your Altaviz Foundation:** Your EPA Subpart W emissions estimator is directly applicable. The production version would integrate with Archrock's actual emissions factors and reporting workflows.

**Success Metric:** Automated emissions reporting that reduces manual effort by 80%. Identification of top 10% emitting units for targeted intervention. Target: 5% fleet-wide emissions intensity reduction in the first year.

#### Gen AI: RAG on Technical Documentation

**The Problem:** Technicians, engineers, and operations managers spend significant time searching through technical manuals, maintenance procedures, safety bulletins, and historical reports to find answers to operational questions.

**The AI Solution:** Build a retrieval-augmented generation (RAG) system that indexes Archrock's technical documentation corpus and allows natural language queries. A technician in the field could ask: "What is the torque spec for a Caterpillar 3516 crosshead bearing?" and get an instant, sourced answer.

**Your Altaviz Foundation:** Your investigation agent already uses RAG with pgvector embeddings. The Archrock version would use Azure AI Search or Azure Cognitive Search with Azure OpenAI embeddings.

**Success Metric:** User adoption and query resolution rate. Target: 50+ weekly active users within 3 months of launch, 80% of queries resolved without escalation.

### 5.3 Strategic Plays (120+ Days)

These are high-complexity, high-impact projects that require deep organizational knowledge and cross-functional alignment. They are the kind of work that justifies the AI Engineer title and drives conversion decisions.

#### Fleet Redeployment Optimization

**The Problem:** When a compressor comes off contract (customer cancels, well declines, or contract expires), Archrock needs to redeploy it to a new customer as quickly as possible. Currently, matching available units to customer requirements is a manual process involving sales, operations, and logistics.

**The AI Solution:** Build an optimization model that matches available compressors to customer requirements based on HP rating, gas composition compatibility, ambient condition suitability, transport distance, and expected contract duration. Include a demand forecasting component that predicts where compression demand will emerge (based on rig counts, well completion data, and customer pipeline).

**Success Metric:** Reduction in average time-to-redeploy and improvement in match quality (fewer early contract terminations due to equipment mismatch). Target: 20% reduction in idle days per redeployment.

#### Customer Churn / Contract Renewal Prediction

**The Problem:** Losing a contract customer means losing recurring revenue and potentially leaving a compressor idle. Early warning of churn risk allows proactive retention efforts.

**The AI Solution:** Build a churn prediction model that identifies at-risk contracts based on service history (frequency of failures, response times, customer complaints), market signals (commodity prices, rig count trends in the customer's basin), and contract terms (approaching expiry, pricing vs. market rates).

**Success Metric:** Identify 80% of churning customers at least 90 days before contract expiration. Target: 10% improvement in contract renewal rate through proactive retention.

#### AI-Powered Data Center Compression Services

**The Problem:** Archrock is exploring natural gas compression for data center power generation — a massive growth opportunity as AI/ML workloads drive data center expansion. These applications have different reliability requirements (99.99%+ uptime) and operating profiles than traditional oil and gas compression.

**The AI Solution:** Develop specialized monitoring and predictive models for data center compression applications. These units need tighter anomaly detection thresholds, faster alerting, and predictive capabilities that provide longer warning horizons (since planned downtime windows are extremely limited).

**Success Metric:** Demonstrate that AI-powered monitoring can meet data center reliability SLAs. This is a business development enabler — the AI capability becomes a selling point for Archrock's data center compression offering.

---

## Section 6: Internal Dynamics

### 6.1 Org Structure That Matters

These are the people whose names you need to know and whose priorities you need to understand. Building relationships with each of them accelerates your impact and your path to conversion.

| Role | Person | Your Relationship |
|---|---|---|
| CEO | Brad Childers | You will likely never interact directly, but understand his priorities from earnings calls and internal communications. He cares about fleet utilization, EBITDA growth, and strategic positioning (especially data centers). Frame your work in his language. |
| SVP Operations | Eric Thode | Your work directly impacts his organization. Operations is the customer for every AI model you build. Build relationships with his field supervisors and regional managers. If Eric hears positive feedback about your tools from his field teams, that carries enormous weight. |
| SVP Sales & Marketing | Jason Ingersoll | Sales needs data to sell. If your models can generate customer-facing insights (e.g., "your compressor ran at 97.2% uptime this quarter, here is the detailed report"), that makes sales conversations easier. Contract renewal predictions directly support his team. |
| IT Director | Larry Kech | Your infrastructure partner. IT controls Azure subscriptions, network access, security policies, and procurement. Build a strong relationship early. When you need a new Azure resource or a firewall rule changed, Larry's team makes it happen. Be respectful of their processes — do not try to work around IT. |
| Head of Data Engineering | Kunal Sharma | Your direct manager. Your success is his success. He is building the data engineering function and needs you to be a reliable, high-output contributor. Communicate proactively, flag blockers early, and make him confident that he can trust you with critical work. See Section 6.2 for detailed strategies. |

### 6.2 Making Kunal (and His Leadership) Look Great

Your manager's success is your success. Here are five specific strategies for building a strong working relationship and making the data engineering team look indispensable to the organization.

**1. Proactive Communication**

Never let Kunal be surprised. If a pipeline breaks, tell him before he finds out from someone else. If a project is behind schedule, flag it in your next 1:1 with a mitigation plan — not the day before the deadline. Send a brief weekly status update (3-5 bullet points) even if he does not ask for one. Overcommunicate in the first 90 days, then calibrate based on his feedback.

**2. Visible Wins with Attribution**

When you ship something that works, make sure leadership knows it came from Kunal's team. In sprint demos, say "Kunal and I discussed the approach for this, and the team helped me validate it." In presentations to operations leadership, always frame it as "the data engineering team built this." Never grandstand. The credit flows up and the team benefits.

**3. Documentation as a Force Multiplier**

Write clear documentation for everything you build: architecture decisions, runbooks, data dictionaries, and onboarding guides. This makes the team less dependent on any single person (including you) and signals organizational maturity. Kunal can point to the documentation when leadership asks "what happens if someone leaves?"

**4. Ask for Feedback Actively**

In your 1:1s with Kunal, explicitly ask: "What is one thing I could do better?" and "Is there anything the team needs that I am not providing?" This shows humility and a growth mindset. Act on the feedback visibly. If he says "I need you to be more concise in standup updates," your next standup should be noticeably tighter.

**5. Solve Problems He Has Not Articulated**

Pay attention to what frustrates Kunal. If he is spending time manually checking pipeline health every morning, build an automated health report that lands in his inbox at 7 AM. If he is fielding questions from business users about data freshness, build a data freshness dashboard they can self-serve. These unsolicited contributions show initiative and awareness.

---

## Section 7: Agile Workflow, Azure DevOps & Deployment

### 7.1 Working in Agile at Archrock

**Sprint Cadence:** Most data engineering teams at Archrock run 2-week sprints. Expect the following ceremonies:
- **Daily Standup (15 min):** What you did yesterday, what you are doing today, any blockers. Keep it under 2 minutes per person. Do not turn it into a problem-solving session.
- **Sprint Planning (2-4 hours):** At the start of each sprint. The team reviews the prioritized backlog, discusses user stories, and commits to a sprint goal. Come prepared with estimates.
- **Sprint Review / Demo (1 hour):** At the end of each sprint. Show what you shipped. Working software, not slides. Business stakeholders attend.
- **Retrospective (1 hour):** After the review. What went well, what did not, what to improve. Be honest and constructive.

**PM Interaction:** You will work closely with a Product Manager (or someone filling that role) who translates business requirements into user stories. Your job is to help them write good stories by asking clarifying questions and providing technical feasibility assessments.

**User Story Format:**

```
As a [role], I want [capability] so that [business value].

Acceptance Criteria:
- [ ] Given [context], when [action], then [expected result]
- [ ] Data quality checks pass with >95% completeness
- [ ] Pipeline completes within SLA (<30 minutes)
- [ ] Dashboard refreshes with <5 second load time
```

**Example:**

```
As a field supervisor, I want to see a daily list of compressors
predicted to fail within 48 hours so that I can schedule proactive
maintenance and avoid unplanned downtime.

Acceptance Criteria:
- [ ] Model runs daily at 6 AM CT and publishes results to Power BI
- [ ] Predictions include confidence score and probable failure mode
- [ ] False positive rate is below 10% over a 30-day rolling window
- [ ] Supervisor can filter by region, station, and compressor model
```

### 7.2 Azure DevOps Best Practices

**Repos (Git):**
- Use feature branches: `feature/predictive-maintenance-v1`
- Commit messages should be clear and reference work items: `feat: add vibration feature engineering pipeline (AB#1234)`
- Never commit credentials, .env files, or large data files. Use `.gitignore` rigorously.
- Squash merge feature branches into main to keep history clean.

**Pipelines (CI/CD):**
- Every merge to main triggers a CI pipeline: lint, unit tests, integration tests.
- CD pipeline deploys to staging first, then production after manual approval.
- Use YAML pipelines (not classic UI pipelines) for version control.
- Pin dependency versions. Never use `latest` tags in production.

**Boards (Work Tracking):**
- Track all work as user stories or tasks in Azure Boards.
- Update work item status daily. Do not let items sit in "In Progress" for weeks.
- Link commits and PRs to work items for traceability.
- Use tags for categorization: `ai-ml`, `data-pipeline`, `infrastructure`, `tech-debt`.

**PR Reviews:**
- Every PR requires at least one reviewer approval.
- Review others' PRs promptly (within 24 hours). This builds reciprocity.
- Be constructive in reviews. Focus on correctness, performance, and maintainability.
- Use "Suggest Changes" for minor fixes, "Request Changes" for blocking issues.

**Notebooks vs. Production:**
- Notebooks are for exploration, prototyping, and ad-hoc analysis.
- Production code lives in `.py` files with proper packaging, logging, error handling, and tests.
- Never schedule a notebook to run in production without converting it to a proper module first.
- If you must use Fabric notebooks for pipeline steps, treat them as production code: version control, testing, and monitoring.

**Model Versioning:**
- Use MLflow Model Registry for all production models.
- Every model has a version number, training date, training data snapshot, and performance metrics.
- Never overwrite a model in production. Deploy new versions alongside existing ones and promote after validation.
- Archive old model versions, do not delete them.

**Secrets Management:**
- Use Azure Key Vault for all secrets (connection strings, API keys, passwords).
- Reference Key Vault secrets in pipelines using linked services or environment variables.
- Rotate secrets on a regular schedule (at least quarterly).
- Never log secrets, even at debug level.

**Documentation:**
- Every pipeline has a README with: purpose, inputs, outputs, schedule, SLA, runbook link, and owner.
- Every ML model has a model card with: problem statement, training data, features, metrics, limitations, and responsible AI considerations.
- Keep documentation next to the code in the repo, not in a separate wiki that nobody updates.

### 7.3 Getting Access — First-Week Checklist

You cannot write a single line of production code without access to the right systems. Start requesting access on Day 1 — it often takes days to get provisioned.

| Access Needed | Who to Ask | Why |
|---|---|---|
| Azure Subscription (Archrock tenant) | Larry Kech / IT Director | Access to all Azure resources: Fabric, Synapse, Event Hubs, Key Vault, Monitor. This is the foundation — nothing works without it. |
| Microsoft Fabric Workspace | Kunal Sharma | Access to Lakehouses, Warehouses, Notebooks, and Pipelines. You need at least Contributor role on the development workspace. |
| Azure DevOps Organization | Kunal Sharma / IT | Access to repos, pipelines, boards, and artifacts. Your daily collaboration tool. |
| Detechtion / Enbase Portal | Operations team / Eric Thode's org | Read access to the IIoT monitoring platform. Understand the raw sensor data before it hits your pipeline. See what field technicians see. |
| SAP (read-only) | IT / Finance | Access to equipment master data, maintenance work orders, parts inventory, and cost data. Critical for training ML models on historical outcomes. |
| Power BI Service | IT / BI Team | Publish and share reports. Access existing dashboards to understand current reporting landscape. |
| VPN / Network Access | IT | Remote access to Archrock's internal network. Required for working from home and accessing on-premises resources. |
| Email / Teams / SharePoint | IT (usually provisioned on Day 1) | Communication and collaboration. Join relevant Teams channels immediately: data engineering, operations alerts, and any AI/ML channels. |
| Azure OpenAI Service | IT / Kunal Sharma | Access to GPT-4, embeddings, and other Azure OpenAI models. Required for RAG and agent development. May require additional approval due to AI governance policies. |
| Badge / Building Access | HR / Facilities | Physical access to the office at 9807 Katy Fwy. Usually handled during onboarding but confirm it covers after-hours access if needed for on-call situations. |

---

## Section 8: Measuring Outcomes

### 8.1 AI Impact Framework

Every AI project you deliver should be measured against this framework. This is how you build the case for your own conversion and the case for continued investment in AI at Archrock.

| Element | Description | Example |
|---|---|---|
| Baseline | The current state before AI intervention. Quantify it precisely. | "Average MTTR for unplanned shutdowns in the Permian Basin is 14.2 hours, based on Q4 2025 maintenance records." |
| Intervention | What the AI model/system does. Be specific about inputs, outputs, and actions. | "Predictive maintenance model analyzes 12 sensor features at 5-minute intervals and flags units with >70% probability of failure within 48 hours." |
| Metric | The KPI you are trying to move. Must be measurable and tracked consistently. | "MTTR for flagged units vs. unflagged units. Fleet utilization rate in pilot region." |
| Measurement Window | How long you need to measure before you can claim results. Statistical significance matters. | "90-day pilot with 500 units in the Permian Basin. Compare flagged vs. unflagged failure events." |
| Attribution | How you isolate the AI impact from other factors (seasonality, maintenance policy changes, personnel changes). | "A/B comparison: pilot region uses model predictions, control region uses existing process. Hold all other variables constant." |
| ROI Calculation | Translate metric improvement into dollars. This is what leadership wants to see. | "If predictive maintenance reduces MTTR by 2 hours on average across 200 annual failure events, at $5,000/hour in lost revenue + repair cost, the annual impact is $2M." |

### 8.2 Monthly AI Impact Report Template

Send this to Kunal at the end of each month. Keep it concise — one page maximum. This becomes your track record for conversion discussions.

**Section 1: Shipped**
- What AI models, pipelines, or tools were deployed to production this month?
- What is new in staging/testing?
- What was decommissioned or deprecated?

**Section 2: Impact**
- For each production model: current performance metrics vs. baseline.
- Data quality scores across Bronze/Silver/Gold layers.
- Pipeline reliability (uptime, SLA adherence, incident count).
- Cost: Azure compute spend for AI workloads vs. budget.

**Section 3: Next**
- What ships next sprint?
- What is blocked and what do you need to unblock it?
- Any strategic opportunities or risks identified?

### 8.3 Working with PM to Prioritize

Not all AI projects are created equal. Use a 2x2 scoring matrix to prioritize with your PM:

```
                    HIGH BUSINESS IMPACT
                           │
         ┌─────────────────┼─────────────────┐
         │                 │                 │
         │   DO NEXT       │   DO FIRST      │
         │   (High impact, │   (High impact, │
         │   hard to build)│   feasible now) │
         │                 │                 │
LOW ─────┼─────────────────┼─────────────────┼───── HIGH
FEASIBILITY│                │                 │   FEASIBILITY
         │                 │                 │
         │   DEPRIORITIZE  │   QUICK WIN     │
         │   (Low impact,  │   (Low impact,  │
         │   hard to build)│   easy to build)│
         │                 │                 │
         └─────────────────┼─────────────────┘
                           │
                    LOW BUSINESS IMPACT
```

**Business Impact** is scored based on: revenue impact, cost reduction, risk mitigation, strategic alignment, and number of users affected.

**Feasibility** is scored based on: data availability, technical complexity, team bandwidth, infrastructure readiness, and organizational change required.

Always have a mix of Quick Wins (for momentum and credibility) and Do First projects (for transformative impact). Avoid spending time on Deprioritize items no matter how technically interesting they are.

---

## Section 9: Becoming the Go-To AI Person

### 9.1 First 90 Days Blueprint

This is your week-by-week plan for the critical conversion window.

| Timeframe | Focus | Deliverable | Conversion Signal |
|---|---|---|---|
| Week 1-2 | Onboarding, access, and orientation. Meet every team member 1:1. Understand existing pipelines, data sources, and pain points. Set up your development environment. | Environment fully provisioned. First notebook running against synthetic data. Stakeholder interview notes documented. | Shows up prepared, asks smart questions, is proactive about getting set up. |
| Week 3-4 | First contribution to an existing pipeline or dashboard. Fix a bug, improve a query, add a monitoring check. Small but visible. | First PR merged to main. First demo in sprint review showing working code. | Writes clean code, follows team conventions, does not need hand-holding. |
| Month 2 | Predictive maintenance prototype running on historical data. Show initial results to Kunal and at least one operations stakeholder. | Working model with initial accuracy metrics. Presentation deck with baseline, approach, and preliminary results. | Can translate business problems into technical solutions. Communicates results clearly to non-technical stakeholders. |
| Month 3 | Predictive maintenance model in production pilot. Observability dashboard live. Second quick win (root cause classification or emissions) in development. | Production model running daily with monitoring. Dashboard showing pipeline health. Second model prototype. | Delivers on commitments. Multiple workstreams in progress. Team relies on them. |
| Month 4-6 | Scale production models. Deliver medium-term wins. Start cross-functional collaborations with operations and sales. Build the monthly impact report habit. | At least 2 models in production. Quantified impact metrics. Expanded stakeholder relationships. Regular impact reporting. | Measurable business impact. Trusted by operations leadership. Seen as a team multiplier. |
| Month 7-12 | Strategic AI plays. Mentor junior team members. Drive architecture decisions. Become the go-to person for AI questions across the organization. | Strategic AI initiative underway. Technical documentation and knowledge sharing established. Clear ROI narrative for AI investment. | Indispensable. The conversion decision is a formality. |

### 9.2 Building Credibility Across Teams

Being technically excellent is necessary but not sufficient. You need to build credibility with people who do not understand your code but need to trust your results.

**1. Speak Their Language**

When talking to field supervisors, use compressor terminology, not data science jargon. Say "this model predicts bearing wear" not "the Isolation Forest detected an anomaly in the vibration feature vector." Learn the vocabulary in Section 10 and use it naturally.

**2. Show, Do Not Tell**

Never present a slide deck when you can show a live demo. Open Power BI, filter to their region, and show them their compressors with predicted issues. Let them ask questions and interact with the data. This builds trust faster than any presentation.

**3. Validate with Domain Experts**

Before claiming a model works, take the results to the most experienced field technician or operations manager and ask: "Does this make sense?" If the model predicts a bearing failure on a unit that was just rebuilt, something is wrong with your features. Domain expert validation catches errors that test sets miss.

**4. Be Responsive**

When someone sends you a question about data or a model prediction, respond within 4 hours — even if the response is "I am looking into this and will have an answer by tomorrow." Responsiveness is a proxy for reliability in most people's minds.

**5. Own Your Mistakes**

When a model makes a bad prediction or a pipeline breaks, own it publicly and quickly. Say "the model flagged Unit X as high risk but it was a false positive — here is what caused it and here is what I am doing to reduce false positives." Never hide or minimize failures. Transparency builds more trust than perfection.

**6. Create Champions**

Identify 2-3 operations managers or field supervisors who are tech-curious and willing to pilot new tools. Give them early access, ask for their feedback, and iterate based on what they say. When your tool works well, they become your advocates — and their endorsement carries far more weight than anything you say about your own work.

### 9.3 Leveraging Your Unique Background

Your clinical and AI dual background is a genuine differentiator that most data engineers at oil and gas companies do not have.

**Clinical Rigor Translates:** The systematic thinking from clinical research — hypothesis formulation, controlled experiments, evidence-based conclusions, peer review — maps directly onto building reliable AI systems. When colleagues see you design a controlled A/B test for a predictive maintenance model rather than just eyeballing the results, they will notice the rigor.

**Pattern Recognition Across Domains:** The ability to see patterns in complex, noisy data (clinical sensor data, patient vitals, lab results) transfers directly to compressor telemetry. The sensors are different, but the underlying challenge — separating signal from noise in time-series data — is identical.

**Communication Bridge:** Clinical training includes communicating complex findings to non-specialist audiences (patients, families, administrators). This skill is exactly what is needed when presenting AI results to field technicians and operations managers who need to trust and act on model predictions.

**Safety-First Mindset:** Clinical environments instill a deep respect for safety protocols, error prevention, and systematic risk management. This aligns perfectly with Archrock's Target Zero safety culture. When you instinctively think about what could go wrong with an AI prediction and add safety guardrails, that resonates with operations leadership.

**Human-Centered Design:** Clinical AI work forces you to think about the end user (clinician, patient) and how they will interact with the system. Bringing this user-centered design mindset to field tools means building things people actually use — not technically impressive tools that sit unused because the UX is wrong.

---

## Section 10: Quick Reference — Archrock Vocabulary

Learn these terms and use them naturally in conversation. Nothing builds credibility faster than demonstrating you understand the business domain.

| Term | Definition |
|---|---|
| HP (Horsepower) | The unit of measurement for compressor capacity. Archrock's fleet is measured in total operating HP (~4.7 million). Individual units range from a few hundred to several thousand HP. |
| Utilization Rate | The percentage of Archrock's total available HP that is actively deployed and generating revenue under contract. The single most important KPI. Target: 95-96%. |
| Contract Operations | Archrock's primary business segment (~85% revenue). Archrock owns the compressor, stations a technician, and charges the customer a fixed monthly fee. |
| Aftermarket Services (AMS) | The secondary business segment (~15% revenue). Maintenance, overhaul, and parts for customer-owned equipment. |
| Gathering System | The network of small-diameter pipelines that collect natural gas from individual wellheads and transport it to a central processing facility or larger pipeline. Compression is needed throughout. |
| Midstream | The segment of the oil and gas industry that processes, stores, and transports hydrocarbons between the wellhead (upstream) and the end consumer (downstream). Archrock operates in midstream. |
| Wellhead | The physical location where a well produces natural gas at the surface. The starting point for the gas gathering system. |
| Throughput | The volume of natural gas moving through a compressor or pipeline, typically measured in MCF (thousand cubic feet) or MMCF (million cubic feet) per day. |
| Suction Pressure | The pressure of gas entering the compressor. Measured in PSI. Changes in suction pressure affect compressor performance and can indicate upstream issues. |
| Discharge Pressure | The pressure of gas leaving the compressor. Measured in PSI. The ratio of discharge to suction pressure determines the compression ratio. |
| Compression Ratio | Discharge pressure divided by suction pressure. Determines the work the compressor must do. Higher ratios mean more stress on components. |
| EMD (Electric Motor Drive) | A compressor driven by an electric motor rather than a natural gas engine. Growing segment (~17% of fleet). Different maintenance profiles and sensor characteristics. |
| Detechtion / Enbase | The IIoT (Industrial Internet of Things) platform used by Archrock for remote monitoring of compressor units. Your primary telemetry data source. |
| SCADA | Supervisory Control and Data Acquisition. An older-generation industrial control system that monitors and controls compressors and pipeline equipment. Being supplemented by IIoT. |
| Unplanned Shutdown (UPS) | A compressor stopping unexpectedly due to a fault, alarm, or failure. The enemy. Every UPS costs money and risks the customer relationship. |
| Planned Shutdown (PS) | A scheduled stop for maintenance, overhaul, or reconfiguration. Planned shutdowns are coordinated with the customer and are far less costly than unplanned ones. |
| MTBF (Mean Time Between Failures) | Average operating time between unplanned shutdowns. Higher is better. Measured in hours or days. |
| MTTR (Mean Time To Repair) | Average time from failure detection to return-to-service. Lower is better. Measured in hours. |
| Truck Roll | Sending a technician to a compressor site. Each truck roll has a direct cost (fuel, labor, parts) and an opportunity cost (that technician could be doing planned maintenance elsewhere). Reducing unnecessary truck rolls is a major AI value proposition. |
| Run-to-Failure | Operating a component until it fails rather than replacing it proactively. Acceptable for low-cost, non-critical parts. Unacceptable for expensive or safety-critical components. |
| Condition-Based Maintenance (CBM) | Maintenance triggered by the actual condition of equipment (sensor readings, vibration analysis) rather than fixed time intervals. This is what your predictive models enable. |
| Overhaul | A major maintenance event where a compressor is disassembled, inspected, and rebuilt. Typically every 3-7 years depending on the unit. Costs $50K-500K+ depending on the size and scope. |
| Reconfiguration | Modifying a compressor package to match new operating conditions (different pressure ratio, different HP rating, different gas composition). Required when redeploying units to new customers. |
| OOOOb | EPA regulation (40 CFR Part 60, Subpart OOOOb) governing methane emissions from oil and natural gas operations. Requires monitoring, reporting, and reduction of methane leaks. |
| Target Zero | Archrock's safety philosophy: zero incidents, zero injuries, zero environmental releases. This is not aspirational — it is an operational expectation. |
| TRIR | Total Recordable Incident Rate. A safety metric measuring the number of recordable workplace injuries per 200,000 hours worked. Lower is better. |
| PVIR | Process Vehicle Incident Rate. Safety metric for vehicle-related incidents. Given the number of truck rolls, this is closely monitored. |
| Permian Basin | The largest oil and gas producing basin in the U.S., spanning West Texas and southeastern New Mexico. Archrock's largest geographic concentration (~2.5M HP). |

---

## Appendix A: Azure Services Mapping

This table maps each job description requirement to the specific Azure service you will use and how your Altaviz project already implements a version of it.

| JD Requirement | Azure Service | Altaviz Implementation |
|---|---|---|
| MS Fabric | Microsoft Fabric (Lakehouses, Warehouses, Notebooks, Data Pipelines, Semantic Models) | Altaviz uses OneLake with Bronze/Silver/Gold Lakehouses (`src/etl/onelake.py`). Fabric Notebooks replace local PySpark development. Fabric Data Pipelines replace the custom orchestrator in `src/etl/pipeline.py`. |
| Azure Synapse Analytics | Azure Synapse (Dedicated SQL Pool, Serverless SQL, Spark Pools) | Altaviz's PySpark processing (`src/etl/silver/cleanse.py`, `src/etl/gold/aggregate.py`) maps to Synapse Spark Pools. SQL queries for reporting map to Synapse SQL endpoints. Synapse is being superseded by Fabric but legacy workloads remain. |
| Azure Data Lake Storage | ADLS Gen2 (OneLake underneath) | Altaviz uses ABFS protocol paths for all OneLake operations. The `src/etl/onelake.py` client handles both cloud (ABFS) and local fallback paths. Delta Lake tables stored in ADLS Gen2. |
| PySpark | Fabric Spark / Synapse Spark | All ETL transformations in `src/etl/` use PySpark 3.5 with explicit schemas from `src/etl/schemas.py`. Broadcast joins, window functions, and structured streaming are demonstrated throughout. |
| Python | Azure Functions, Azure ML SDK, Fabric Notebooks | Core language for all Altaviz components: ETL pipeline, ML models, AI agents, API server, fleet simulator. |
| TSQL | Fabric SQL Endpoint, Synapse Dedicated SQL Pool | Altaviz uses PostgreSQL (`infrastructure/sql/schema.sql`). At Archrock, equivalent queries will use T-SQL against Fabric/Synapse SQL endpoints. |
| AI/ML Model Development | Azure Machine Learning | Four ML models in `src/ml/`: Isolation Forest anomaly detection, temperature drift prediction, EPA emissions estimation, and RUL prediction. Feature store in `src/ml/feature_store/store.py`. |
| Gen AI Models | Azure OpenAI Service | Four AI agents in `src/agents/` using Pydantic AI with OpenAI models. RAG with embeddings (`text-embedding-3-small`), structured outputs, and pgvector similarity search in `src/agents/knowledge_base.py`. |
| AI/ML Ops | Azure ML Endpoints, MLflow | MLflow model registry in `src/ml/serving/model_registry.py`. Batch prediction pipeline in `src/ml/serving/batch_predictor.py`. Model versioning and lifecycle management. |
| Azure DevOps | Azure DevOps (Repos, Pipelines, Boards) | Altaviz uses Git with GitHub. At Archrock, the same workflows (branching, PRs, CI/CD) move to Azure DevOps. Tests in `tests/` map to pipeline stages. |
| Power BI | Power BI Service, Fabric Semantic Models | Altaviz's Gold layer aggregations and fleet health metrics in `src/etl/gold/aggregate.py` are designed to serve Power BI. The monitoring dashboard in `src/monitoring/metrics.py` would surface through Power BI at Archrock. |
| Azure Functions & API Integration | Azure Functions, API Management | Altaviz's FastAPI sidecar (`src/agents/api.py`) maps to Azure Functions with HTTP triggers. Event Hub producer/consumer in `src/ingestion/` maps to event-driven Azure Functions. |
| Data Pipeline Failure Management | Azure Monitor, Log Analytics, Azure Alerts | Altaviz's `PipelineMonitor` class in `src/monitoring/metrics.py` tracks stage durations, row counts, and rejection rates. Azure Monitor and Teams webhook alerting are configured. |
| Database Management | Azure SQL, Cosmos DB, PostgreSQL | Altaviz uses PostgreSQL with 20 tables, 5 views, and triggers (`infrastructure/sql/schema.sql`). Agent data stored in pgvector-enabled PostgreSQL. |
| Data Governance & Security | Microsoft Purview, Azure Key Vault, Managed Identities | Altaviz uses environment variables and Key Vault references for secrets. Purview integration for data classification, lineage tracking, and sensitivity labels would be added at Archrock. |

---

## Appendix B: Additional Advice

### First Day Checklist

**What to Bring:**
- Government-issued photo ID (for badge and I-9 verification)
- Personal laptop charger (you may use your own device briefly before corporate equipment is issued)
- A physical notebook and pen (for handwritten notes during introductions — it shows attention)
- Banking information for direct deposit setup (if W2)
- Emergency contact information
- Any completed onboarding paperwork from the staffing agency

**Who to Meet:**
- Kunal Sharma (your direct manager) — first meeting of the day. Ask about team norms, communication preferences, and immediate priorities.
- Every member of the data engineering team — schedule 30-minute 1:1s for the first two weeks. Ask each person: "What is the biggest data challenge you face right now?" and "What do you wish someone would build?"
- IT support contact — get their name, email, and Teams handle. You will need them repeatedly in Week 1.
- Your HR/onboarding coordinator — confirm benefits enrollment deadlines, time reporting process, and PTO policy.
- Building receptionist / security — learn the office layout, badge procedures, and parking situation.

**What to Ask:**
- "What does the team's current sprint look like? Is there anything I can pick up immediately?"
- "What are the biggest pain points in the current data platform?"
- "How does the team handle on-call and incident response?"
- "Where does the team documentation live?"
- "What is the code review process?"
- "Are there any recurring meetings I should be added to?"
- "What systems should I request access to, and what is the typical provisioning timeline?"

### Communication Tips

**Email Template: Requesting Access**

```
Subject: Access Request — [System Name] — David [Last Name], Data Engineering

Hi [IT Contact / System Owner],

I'm David [Last Name], the new Cloud Data and AI Engineer on Kunal
Sharma's data engineering team. I started on [date].

I need access to [System Name] for [brief reason — e.g., "developing
and monitoring data pipelines in Microsoft Fabric"].

Details:
- Requested role: [Contributor / Reader / etc.]
- Workspace/resource: [specific workspace or resource name if known]
- Business justification: [1 sentence — e.g., "Required for daily
  development work on compressor telemetry pipelines"]
- Manager approval: Kunal Sharma (cc'd)

Please let me know if you need any additional information or approvals.

Thank you,
David
```

**Email Template: Introducing Yourself to a Stakeholder**

```
Subject: Introduction — David [Last Name], Data Engineering & AI

Hi [Name],

I'm David [Last Name], a new AI Engineer on Kunal Sharma's data
engineering team. I'm focused on building predictive maintenance
and analytics capabilities for the compressor fleet.

[Kunal / a colleague] mentioned that your team [brief context —
e.g., "manages field operations in the Permian Basin" or "handles
maintenance scheduling"]. I'd love to learn about the data challenges
your team faces and how we can help.

Would you have 30 minutes in the next week or two for a quick
conversation? I'm happy to come to your office or set up a Teams call.

Thank you,
David
```

**Standup Update Formula:**

Keep it under 90 seconds. Use this structure:
- **Yesterday:** "Completed [specific task]. Merged PR for [feature]."
- **Today:** "Working on [specific task]. Expected to finish by [time/day]."
- **Blockers:** "Waiting on [access/data/review] from [person]. Need by [date] to stay on track." (Only mention if there is a real blocker.)

### Field Visit Preparation

Field visits to compressor stations are invaluable for understanding the data you work with. When the opportunity arises (and it will — volunteer for it), be prepared.

**What to Wear:**
- Steel-toed boots (required — purchase before your first field visit)
- Long pants (no shorts), long-sleeve shirt (FRC/flame-resistant clothing may be required at some sites)
- Hard hat and safety glasses (usually provided on-site, but confirm in advance)
- No loose clothing, jewelry, or accessories that could catch on equipment
- Dress for the weather — Texas heat is brutal, and many sites have no shade

**What to Observe:**
- How technicians physically interact with compressors (where they look, what they listen for, what they touch)
- The control panels and local HMI screens — what data is displayed and what the technician actually looks at
- The physical environment: ambient temperature, noise level, vibration you can feel, gas smell
- The maintenance process: how work orders are received, how parts are staged, how repairs are documented
- Communication patterns: how technicians talk to dispatch, how they report status, what information they wish they had

**Questions to Ask Technicians:**
- "What is the most common failure you see on this type of unit?"
- "How do you know when something is about to go wrong? What are the early signs?"
- "If you could have one piece of information on your phone before you arrive at a site, what would it be?"
- "What is the most frustrating part of your day?"
- "Have you ever had a situation where the remote monitoring data said one thing but the unit was doing something different?"
- "What do you think about the current alarm system? Too many false alarms? Missing real issues?"

**Important:** Listen more than you talk. Technicians have decades of domain expertise. Their intuition about machine behavior is the ground truth your models are trying to approximate. Treat every field visit as a masterclass.

### Safety Culture Tips

Archrock takes safety with absolute seriousness. "Target Zero" is not a slogan — it is an operational philosophy that permeates every decision.

- **Attend every safety meeting.** Do not skip them. Do not check your phone during them. Participate actively.
- **Complete all safety training immediately** when assigned, even if it feels redundant. Overdue safety training is a red flag to management.
- **Report every near-miss or safety concern** you observe, no matter how minor. The reporting system exists to prevent future incidents, and using it shows you take safety seriously.
- **Wear PPE as required** at all times in designated areas. No exceptions, no shortcuts, even for "just a quick look."
- **Stop work if you see something unsafe.** Archrock has a stop-work authority policy. Any employee can stop any job if they believe it is unsafe. Using this authority is respected, not punished.
- **Understand that AI systems you build have safety implications.** A false negative in a predictive maintenance model could mean a technician is not warned about a developing failure. Consider safety implications in every model design decision.
- **Learn the emergency procedures** for the Houston office: evacuation routes, muster points, severe weather procedures. Texas has tornadoes, hurricanes, and extreme heat events.

### Networking Strategy

Relationships determine your effectiveness and your conversion. Build them intentionally.

**Lunch with Team:**
- Eat lunch with the data engineering team at least 3 days a week for the first month. This is where informal knowledge transfer happens.
- Rotate who you sit with. Do not always sit next to the same person.
- Ask about their career path, what projects they are excited about, and what they do outside of work.
- Avoid talking only about technology. Build genuine human connections.

**Cross-Team Relationships:**
- Identify one person in each of these teams to build a relationship with: Operations, Sales, Finance, IT, and Field Services.
- Attend their team meetings as a guest when invited (or ask if you can observe).
- Offer to help with data questions. Being the person who answers "Can you pull this data for me?" requests quickly earns enormous goodwill.
- Attend company social events (happy hours, team outings, holiday parties). Even if you are an introvert, showing up matters.

**External Networking:**
- Join the Houston Data Engineering or Houston ML/AI meetup groups.
- Attend industry conferences when the opportunity arises (SPE events, Microsoft Fabric Community Conference).
- Connect with peers at other oil and gas companies on LinkedIn — understanding how other companies approach similar problems gives you valuable perspective.
- Follow Archrock on LinkedIn and engage with company posts. It shows you are invested in the company's public narrative.

### Technical Reading List

Read these materials before Day 1 or during your first month. They will give you context that most new hires do not have.

**Archrock-Specific:**
- **Archrock 10-K (Annual Report):** Filed with the SEC. The most comprehensive source of business information. Read the Business section, Risk Factors, and MD&A (Management Discussion and Analysis) thoroughly. Available at [sec.gov](https://www.sec.gov/) — search for "Archrock."
- **Latest Earnings Call Transcript:** Listen to or read the most recent quarterly earnings call. Pay attention to the questions analysts ask — they reveal what the market cares about. Available on Archrock's Investor Relations page or Seeking Alpha.
- **Archrock Investor Presentation:** Usually available on the Investor Relations page. Contains the fleet statistics, financial highlights, and strategic priorities in a visual format.
- **Archrock ESG Report:** Covers emissions reduction targets, safety metrics, and sustainability initiatives. Relevant for your emissions monitoring work.

**Industry Publications:**
- **Gas Compression Magazine:** Industry-specific publication covering compression technology, operations, and trends. Gives you vocabulary and context.
- **Hart Energy / Oil and Gas Journal:** Broad industry coverage. Understand market dynamics that affect Archrock's customers and, by extension, Archrock's business.
- **EPA OOOOb Final Rule:** Read at least the summary of the EPA's methane emissions regulation for oil and gas operations. This is the regulatory driver behind your emissions monitoring work.

**Technical Resources:**
- **Microsoft Fabric Documentation:** Official docs at [learn.microsoft.com](https://learn.microsoft.com/). Focus on Lakehouse, Data Engineering, and Data Science workloads.
- **Delta Lake Documentation:** Understand Delta Lake internals, MERGE semantics, time travel, and optimization techniques. Available at [delta.io](https://delta.io/).
- **Azure Architecture Center — Data Lakehouse Pattern:** Microsoft's reference architecture for the medallion pattern you will implement.
- **MLflow Documentation:** Model tracking, registry, and deployment. Available at [mlflow.org](https://mlflow.org/).
- **Pydantic AI Documentation:** For building structured, type-safe AI agents. Available at [ai.pydantic.dev](https://ai.pydantic.dev/).

---

*This playbook is a living document. Update it as you learn more about Archrock's specific systems, processes, and culture. The best version of this document is the one you revise after your first 90 days with real experience.*
