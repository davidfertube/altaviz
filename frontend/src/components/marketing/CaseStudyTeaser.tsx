'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, TrendingDown, Clock, DollarSign, Truck } from 'lucide-react';

const METRICS = [
  { value: '40%', label: 'Fewer emergency shutdowns', icon: TrendingDown },
  { value: '48hr', label: 'Early warning window', icon: Clock },
  { value: '$2.1M', label: 'Saved per prevented failure', icon: DollarSign },
  { value: '60%', label: 'Fewer unnecessary truck rolls', icon: Truck },
];

export default function CaseStudyTeaser() {
  return (
    <section className="relative py-24 sm:py-32">
      <div className="absolute inset-0 bg-[#0C1018]" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left: Results headline */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.5 }}
          >
            <p className="text-[11px] font-semibold text-[#C4A77D] uppercase tracking-[0.15em] mb-6">Results</p>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white leading-snug mb-6">
              One bearing failure caught{' '}
              <span className="text-[#C4A77D]">two days early</span>{' '}
              paid for six months of Altaviz.
            </h2>

            <p className="text-base text-white/50 leading-relaxed mb-8 max-w-lg">
              A high-utilization compressor showed early vibration drift that would have caused an emergency shutdown. Altaviz flagged it 48 hours out — and the AI agent generated a work order before the crew even knew there was a problem.
            </p>

            <Link
              href="/signup"
              className="inline-flex items-center gap-2 text-sm font-medium text-[#C4A77D] hover:text-[#D4C5A9] transition-colors"
            >
              Start monitoring your fleet
              <ArrowRight className="size-4" />
            </Link>
          </motion.div>

          {/* Right: Metrics grid */}
          <motion.div
            className="grid grid-cols-2 gap-4"
            variants={{
              hidden: { opacity: 0 },
              visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.15 } },
            }}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
          >
            {METRICS.map(({ value, label, icon: Icon }) => (
              <motion.div
                key={label}
                className="rounded-xl bg-white/[0.04] border border-white/[0.06] p-6"
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] as const } },
                }}
                whileHover={{
                  borderColor: 'rgba(196, 167, 125, 0.3)',
                  boxShadow: '0 0 20px rgba(196, 167, 125, 0.1)',
                  transition: { duration: 0.2 },
                }}
              >
                <Icon className="size-5 text-[#C4A77D]/60 mb-3" />
                <p className="text-2xl sm:text-3xl font-bold font-mono text-[#C4A77D] mb-1">{value}</p>
                <p className="text-xs text-white/40 leading-snug">{label}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
