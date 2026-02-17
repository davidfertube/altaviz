'use client';

import { motion } from 'framer-motion';
import {
  FileCheck,
  Leaf,
  BrainCircuit,
  LayoutDashboard,
  Cable,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Animation variants                                                 */
/* ------------------------------------------------------------------ */
const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] as const },
  },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.12, delayChildren: 0.1 },
  },
};

/* ------------------------------------------------------------------ */
/*  Tag colors                                                         */
/* ------------------------------------------------------------------ */
const TAG_COLORS: Record<string, string> = {
  Compliance: 'bg-blue-50 text-blue-700 border-blue-200',
  '49 CFR 192': 'bg-slate-50 text-slate-700 border-slate-200',
  Emissions: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  EPA: 'bg-green-50 text-green-700 border-green-200',
  ML: 'bg-purple-50 text-purple-700 border-purple-200',
  Predictions: 'bg-violet-50 text-violet-700 border-violet-200',
  Dashboard: 'bg-amber-50 text-amber-700 border-amber-200',
  Demo: 'bg-orange-50 text-orange-700 border-orange-200',
  Pipeline: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  Integration: 'bg-teal-50 text-teal-700 border-teal-200',
};

/* ------------------------------------------------------------------ */
/*  Changelog entries                                                  */
/* ------------------------------------------------------------------ */
const ENTRIES = [
  {
    date: 'February 2026',
    icon: FileCheck,
    title: 'PHMSA Mega Rule Compliance Dashboard',
    description:
      'Added MAOP reconfirmation tracking, expanded assessment scheduling for High Consequence Areas (HCAs) and Moderate Consequence Areas (MCAs), and automated record-keeping aligned with the 2024 PHMSA Mega Rule amendments. New compliance export formats for annual PHMSA filings.',
    tags: ['Compliance', '49 CFR 192'],
  },
  {
    date: 'January 2026',
    icon: Leaf,
    title: 'EPA Subpart W Emissions Automation',
    description:
      'Automated methane emissions calculations using EPA emission factors per pipeline segment. Real-time CH4/CO2e tracking with exportable reports for Subpart W annual submissions. Integrated into the ML pipeline for continuous monitoring.',
    tags: ['Emissions', 'EPA'],
  },
  {
    date: 'January 2026',
    icon: BrainCircuit,
    title: 'ML Anomaly Detection v2',
    description:
      'Upgraded Isolation Forest models with quarterly retraining on customer fleet data. New temperature drift prediction and remaining useful life estimation models. 48-hour advance warning of degradation patterns with zero false-positive tuning.',
    tags: ['ML', 'Predictions'],
  },
  {
    date: 'December 2025',
    icon: LayoutDashboard,
    title: 'Multi-Tenant Dashboard',
    description:
      'Launched the full fleet monitoring dashboard with organization-scoped data isolation, SWR-powered real-time updates, and role-based access control.',
    tags: ['Dashboard'],
  },
  {
    date: 'November 2025',
    icon: Cable,
    title: 'SCADA Integration & Data Pipeline',
    description:
      'Production-ready PySpark ETL pipeline processing 10,000+ readings per day through Bronze/Silver/Gold medallion architecture. Supports OSIsoft PI, Honeywell Experion, and OPC-UA historian connections. Delta Lake for time-travel and ACID transactions.',
    tags: ['Pipeline', 'Integration'],
  },
];

/* ================================================================== */
/*  Changelog Page                                                     */
/* ================================================================== */
export default function ChangelogPage() {
  return (
    <div className="pt-20">
      {/* ------------------------------------------------------------ */}
      {/*  Hero                                                         */}
      {/* ------------------------------------------------------------ */}
      <section className="relative py-24 sm:py-32 overflow-hidden">
        <div className="absolute inset-0 bg-[#FAF9F6]">
          <div className="absolute top-1/4 left-1/3 w-[500px] h-[500px] bg-[#C4A77D]/8 rounded-full blur-[128px]" />
        </div>

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
          >
            <motion.p
              className="text-[11px] font-semibold text-[#C4A77D] uppercase tracking-[0.15em] mb-4"
              variants={fadeUp}
            >
              Changelog
            </motion.p>
            <motion.h1
              className="text-4xl sm:text-5xl font-bold text-[#1C1917] leading-[1.08] tracking-tight mb-5"
              variants={fadeUp}
            >
              What&apos;s new in{' '}
              <span className="text-[#C4A77D]">Altaviz</span>
            </motion.h1>
            <motion.p
              className="text-lg text-[#78716C] max-w-2xl mx-auto leading-relaxed"
              variants={fadeUp}
            >
              Product updates, new features, and improvements to the platform.
              We ship regularly to keep your pipeline integrity program ahead of
              the curve.
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* ------------------------------------------------------------ */}
      {/*  Timeline                                                     */}
      {/* ------------------------------------------------------------ */}
      <section className="relative py-16 sm:py-24">
        <div className="absolute inset-0 bg-[#FAF9F6]" />

        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Vertical connecting line */}
          <div className="absolute left-8 sm:left-10 top-0 bottom-0 w-px bg-gradient-to-b from-[#C4A77D]/30 via-[#C4A77D]/20 to-transparent hidden sm:block" />

          <motion.div
            className="space-y-12 sm:space-y-16"
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
          >
            {ENTRIES.map((entry, i) => (
              <motion.div
                key={`${entry.date}-${entry.title}`}
                className="relative flex gap-6 sm:gap-8"
                variants={fadeUp}
              >
                {/* Timeline node */}
                <div className="relative z-10 shrink-0 hidden sm:block">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white border border-[#E7E0D5] flex flex-col items-center justify-center shadow-sm">
                    <entry.icon className="size-5 sm:size-6 text-[#C4A77D] mb-1" />
                    <span className="text-[9px] font-bold text-[#A8A29E] font-mono">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                  </div>
                </div>

                {/* Content card */}
                <div className="flex-1 rounded-2xl border border-[#E7E0D5] bg-white p-6 sm:p-8 hover:border-[#C4A77D]/40 hover:shadow-lg hover:shadow-[#C4A77D]/5 transition-all">
                  {/* Date badge */}
                  <div className="flex items-center gap-3 mb-4">
                    <span className="inline-flex items-center px-3 py-1 rounded-full bg-[#F5F0E8] text-xs font-semibold text-[#A68B5B] font-mono">
                      {entry.date}
                    </span>
                  </div>

                  {/* Mobile icon (visible only on small screens) */}
                  <div className="flex items-center gap-3 mb-3 sm:hidden">
                    <div className="w-10 h-10 rounded-lg bg-[#C4A77D]/10 flex items-center justify-center">
                      <entry.icon className="size-5 text-[#A68B5B]" />
                    </div>
                    <h3 className="text-lg font-bold text-[#1C1917]">
                      {entry.title}
                    </h3>
                  </div>

                  {/* Desktop title (hidden on small screens) */}
                  <h3 className="hidden sm:block text-xl font-bold text-[#1C1917] mb-3">
                    {entry.title}
                  </h3>

                  <p className="text-sm sm:text-base text-[#78716C] leading-relaxed mb-4">
                    {entry.description}
                  </p>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-2">
                    {entry.tags.map((tag) => (
                      <span
                        key={tag}
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-medium border ${TAG_COLORS[tag] || 'bg-gray-50 text-gray-700 border-gray-200'}`}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* Timeline end marker */}
          <motion.div
            className="relative flex gap-6 sm:gap-8 mt-12 sm:mt-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.5 }}
          >
            <div className="relative z-10 shrink-0 hidden sm:block">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-[#F5F0E8] border border-[#E7E0D5] border-dashed flex items-center justify-center">
                <span className="text-xs font-semibold text-[#A8A29E]">...</span>
              </div>
            </div>
            <div className="flex-1 rounded-2xl border border-dashed border-[#E7E0D5] bg-[#FAF9F6] p-6 sm:p-8 text-center sm:text-left">
              <p className="text-sm text-[#78716C]">
                More updates coming soon. Follow our changelog for the latest
                features and improvements to the platform.
              </p>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
