'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

type Category = 'All' | 'Technical' | 'Compliance' | 'Pricing';

interface FAQEntry {
  question: string;
  category: Exclude<Category, 'All'>;
  answer: string;
}

const FAQS: FAQEntry[] = [
  {
    question: 'How does Altaviz connect to our existing SCADA system?',
    category: 'Technical',
    answer: 'Altaviz supports standard protocols including OPC-UA, Modbus, and direct historian connections (OSIsoft PI, Honeywell Experion, Emerson DeltaV). We also accept CSV/Parquet uploads, CMMS exports, and REST API ingestion. Most integrations complete within one week with no disruption to existing operations.',
  },
  {
    question: 'What ML models power the anomaly detection?',
    category: 'Technical',
    answer: 'We use Isolation Forest models (scikit-learn) trained on healthy baseline data per compressor. Additional models include linear regression for temperature drift prediction, heuristic algorithms for remaining useful life estimation, and EPA Subpart W factor-based emissions calculations. Models retrain quarterly on your fleet data.',
  },
  {
    question: 'What compressor types does Altaviz support?',
    category: 'Technical',
    answer: 'Altaviz supports reciprocating and rotary screw compressors across all major manufacturers (Ariel, Caterpillar, Waukesha, Ajax). The platform monitors vibration, discharge temperature, suction and discharge pressure, gas flow, and horsepower across all compressor classes, models, and horsepower ratings.',
  },
  {
    question: 'How does Altaviz support EPA emissions compliance?',
    category: 'Compliance',
    answer: 'Altaviz calculates methane (CH\u2084) and CO\u2082-equivalent emissions using EPA Subpart W emission factors applied to real-time sensor data. The platform tracks emissions per station and per compressor, generates OOOOb-ready reports, and maintains immutable audit logs for regulatory submissions.',
  },
  {
    question: 'What compliance standards does Altaviz support?',
    category: 'Compliance',
    answer: 'Altaviz provides automated monitoring and reporting aligned with EPA Subpart W (methane emissions reporting), EPA OOOOb (fugitive emissions monitoring), ISO 10816 (vibration severity for rotating machinery), and API 618 (reciprocating compressor design). Compliance reports are exportable for regulatory submissions.',
  },
  {
    question: 'How is our data isolated from other customers?',
    category: 'Technical',
    answer: 'Every database query is scoped to your organization via a mandatory organization_id parameter. Multi-tenant data isolation is enforced at the database level with NOT NULL constraints and row-level filtering. Your data is never accessible to other customers, and all access is audit-logged.',
  },
  {
    question: 'Can Altaviz ingest historical maintenance records?',
    category: 'Technical',
    answer: 'Yes. Altaviz accepts historical maintenance logs, CMMS exports, and field inspection reports alongside real-time SCADA telemetry. Historical data enriches ML models with maintenance context for more accurate anomaly detection and remaining useful life predictions.',
  },
  {
    question: 'Can we deploy Altaviz on-premises?',
    category: 'Technical',
    answer: 'Yes. Our Enterprise plan includes an on-premises deployment option for organizations with strict data residency requirements. The on-prem deployment uses the same PySpark pipeline and PostgreSQL architecture, with your team managing the infrastructure.',
  },
  {
    question: 'What does the onboarding process look like?',
    category: 'Pricing',
    answer: 'Typical onboarding follows three phases: Assessment (2 weeks) — we map your SCADA architecture, compressor fleet, and define alerting rules; Integration (2-4 weeks) — connect data sources and configure ML baselines per compressor; Production (ongoing) — continuous monitoring with quarterly model retraining and a dedicated technical account manager.',
  },
  {
    question: 'How is pricing calculated for Enterprise?',
    category: 'Pricing',
    answer: 'Enterprise pricing is based on the number of monitored compressors, data ingestion volume, and required support level. We offer annual contracts with custom SLAs. Start a free pilot to evaluate the platform, then work with our team to scope an enterprise deployment based on your fleet size and requirements.',
  },
];

const CATEGORIES: Category[] = ['All', 'Technical', 'Compliance', 'Pricing'];

const CATEGORY_BADGE_COLORS: Record<Exclude<Category, 'All'>, string> = {
  Technical: 'bg-blue-50 text-blue-600',
  Compliance: 'bg-emerald-50 text-emerald-600',
  Pricing: 'bg-amber-50 text-amber-600',
};

function FAQCard({ question, answer, category }: FAQEntry) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-xl bg-white border border-[#E5E5E5] overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-start justify-between w-full text-left p-5 group"
      >
        <div className="flex-1 pr-4">
          <span
            className={cn(
              'inline-block text-[11px] font-medium px-2.5 py-0.5 rounded-full mb-2.5',
              CATEGORY_BADGE_COLORS[category]
            )}
          >
            {category}
          </span>
          <p className="text-sm sm:text-base font-medium text-[#0A0A0A] group-hover:text-[#D4A80F] transition-colors">
            {question}
          </p>
        </div>
        <ChevronDown
          className={cn(
            'size-5 text-[#9CA3AF] shrink-0 mt-1 transition-transform duration-200',
            open && 'rotate-180'
          )}
        />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            className="overflow-hidden"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
          >
            <div className="px-5 pb-5">
              <p className="text-sm text-[#6B7280] leading-relaxed">{answer}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function FAQ() {
  const [activeCategory, setActiveCategory] = useState<Category>('All');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredFaqs = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();

    return FAQS.filter((faq) => {
      const matchesCategory =
        activeCategory === 'All' || faq.category === activeCategory;

      const matchesSearch =
        query === '' ||
        faq.question.toLowerCase().includes(query) ||
        faq.answer.toLowerCase().includes(query);

      return matchesCategory && matchesSearch;
    });
  }, [activeCategory, searchQuery]);

  return (
    <section id="faq" className="relative py-24 sm:py-32">
      <div className="absolute inset-0 bg-[#FAFAFA]" />

      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.5 }}
        >
          <p className="text-[11px] font-semibold text-[#F5C518] uppercase tracking-[0.15em] mb-3">
            FAQ
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-[#0A0A0A] mb-4">
            Frequently asked questions
          </h2>
          <p className="text-lg text-[#6B7280]">
            Everything you need to know about the platform
          </p>
        </motion.div>

        {/* Search + category filters */}
        <motion.div
          className="mb-8 space-y-5"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          {/* Search input */}
          <div className="relative max-w-md mx-auto">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-[#9CA3AF] pointer-events-none" />
            <input
              type="text"
              placeholder="Search questions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-sm rounded-lg bg-white border border-[#E5E5E5] text-[#0A0A0A] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#F5C518]/40 focus:border-[#F5C518] transition-colors"
            />
          </div>

          {/* Category pills */}
          <div className="flex items-center justify-center gap-2 flex-wrap">
            {CATEGORIES.map((category) => (
              <button
                key={category}
                onClick={() => setActiveCategory(category)}
                className={cn(
                  'px-4 py-1.5 text-sm font-medium rounded-full transition-colors duration-200',
                  activeCategory === category
                    ? 'bg-[#F5C518] text-white'
                    : 'bg-white border border-[#E5E5E5] text-[#6B7280] hover:border-[#F5C518] hover:text-[#D4A80F]'
                )}
              >
                {category}
              </button>
            ))}
          </div>
        </motion.div>

        {/* FAQ grid */}
        <motion.div
          className="grid grid-cols-1 lg:grid-cols-2 gap-4"
          variants={{
            hidden: { opacity: 0 },
            visible: {
              opacity: 1,
              transition: { staggerChildren: 0.05, delayChildren: 0.1 },
            },
          }}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
        >
          {filteredFaqs.map((faq) => (
            <motion.div
              key={faq.question}
              variants={{
                hidden: { opacity: 0, y: 12 },
                visible: {
                  opacity: 1,
                  y: 0,
                  transition: {
                    duration: 0.4,
                    ease: [0.25, 0.46, 0.45, 0.94] as const,
                  },
                },
              }}
            >
              <FAQCard
                question={faq.question}
                answer={faq.answer}
                category={faq.category}
              />
            </motion.div>
          ))}
        </motion.div>

        {/* Empty state */}
        <AnimatePresence>
          {filteredFaqs.length === 0 && (
            <motion.p
              className="text-center text-sm text-[#9CA3AF] mt-8"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              No questions match your search. Try a different term or category.
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
