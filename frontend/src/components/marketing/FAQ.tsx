'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

const FAQS = [
  {
    question: 'How does Altaviz connect to our existing SCADA system?',
    answer: 'Altaviz supports standard protocols including OPC-UA, Modbus, and direct historian connections (OSIsoft PI, Honeywell Experion, Emerson DeltaV). We also accept CSV/Parquet uploads, ILI inspection data, and REST API ingestion. Most integrations complete within one week with no disruption to existing operations.',
  },
  {
    question: 'What ML models power the anomaly detection?',
    answer: 'We use Isolation Forest models (scikit-learn) trained on healthy baseline data per pipeline segment. Additional models include linear regression for temperature drift prediction, heuristic algorithms for remaining useful life estimation, and EPA Subpart W factor-based emissions calculations. Models retrain quarterly on your fleet data.',
  },
  {
    question: 'What pipeline types does Altaviz support?',
    answer: 'Altaviz supports gas transmission pipelines (49 CFR 192), hazardous liquid pipelines (49 CFR 195), gathering systems, and distribution networks. The platform monitors pressure, temperature, flow, vibration, and corrosion indicators across all pipeline classes and materials.',
  },
  {
    question: 'How does Altaviz support PHMSA Mega Rule compliance?',
    answer: 'Altaviz helps operators meet expanded integrity management requirements including MAOP reconfirmation tracking, assessment scheduling for pipelines in High Consequence Areas (HCAs) and Moderate Consequence Areas (MCAs), and automated record-keeping for the life of the pipeline. The platform generates PHMSA-ready reports for annual submissions.',
  },
  {
    question: 'What compliance standards does Altaviz support?',
    answer: 'Altaviz provides automated monitoring and reporting aligned with 49 CFR 192 (gas transmission integrity management), 49 CFR 195 (hazardous liquid pipeline integrity), ASME B31.8S (risk management for gas pipelines), EPA Subpart W (methane emissions), and ISO 10816 (vibration severity). Compliance reports are exportable for regulatory submissions and annual PHMSA filings.',
  },
  {
    question: 'How is our data isolated from other customers?',
    answer: 'Every database query is scoped to your organization via a mandatory organization_id parameter. Multi-tenant data isolation is enforced at the database level with NOT NULL constraints and row-level filtering. Your data is never accessible to other customers, and all access is audit-logged.',
  },
  {
    question: 'Can Altaviz ingest ILI inspection data?',
    answer: 'Yes. Altaviz accepts In-Line Inspection data alongside real-time SCADA telemetry, providing continuous monitoring between scheduled inspection runs. ILI data integrates into the anomaly detection pipeline, enriching ML models with historical inspection context for more accurate corrosion growth and remaining life predictions.',
  },
  {
    question: 'Can we deploy Altaviz on-premises?',
    answer: 'Yes. Our Enterprise plan includes an on-premises deployment option for organizations with strict data residency requirements. The on-prem deployment uses the same PySpark pipeline and PostgreSQL architecture, with your team managing the infrastructure.',
  },
  {
    question: 'What does the onboarding process look like?',
    answer: 'Typical onboarding follows three phases: Assessment (2 weeks) — we map your SCADA architecture, pipeline segments, and define alerting rules; Integration (2-4 weeks) — connect data sources and configure ML baselines per pipeline segment; Production (ongoing) — continuous monitoring with quarterly model retraining and a dedicated technical account manager.',
  },
  {
    question: 'How is pricing calculated for Enterprise?',
    answer: 'Enterprise pricing is based on the number of monitored pipeline segments, data ingestion volume, and required support level. We offer annual contracts with custom SLAs. Contact our sales team for a detailed quote based on your fleet size and requirements.',
  },
];

function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-[#E7E0D5]/60">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full text-left py-5 group"
      >
        <span className="text-sm sm:text-base font-medium text-[#1C1917] pr-4 group-hover:text-[#A68B5B] transition-colors">
          {question}
        </span>
        <ChevronDown
          className={cn(
            'size-5 text-[#A8A29E] shrink-0 transition-transform duration-200',
            open && 'rotate-180'
          )}
        />
      </button>
      {open && (
        <div className="pb-5 pr-8">
          <p className="text-sm text-[#78716C] leading-relaxed">{answer}</p>
        </div>
      )}
    </div>
  );
}

export default function FAQ() {
  return (
    <section id="faq" className="relative py-24 sm:py-32">
      <div className="absolute inset-0 bg-[#FAF9F6]" />

      <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.5 }}
        >
          <p className="text-[11px] font-semibold text-[#C4A77D] uppercase tracking-[0.15em] mb-3">FAQ</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-[#1C1917] mb-4">
            Frequently asked questions
          </h2>
          <p className="text-lg text-[#78716C]">
            Everything you need to know about the platform
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          {FAQS.map((faq) => (
            <FAQItem key={faq.question} question={faq.question} answer={faq.answer} />
          ))}
        </motion.div>
      </div>
    </section>
  );
}
