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
              One corrosion anomaly caught{' '}
              <span className="text-[#C4A77D]">two days early</span>{' '}
              paid for six months of Altaviz.
            </h2>

            <p className="text-base text-white/50 leading-relaxed mb-8 max-w-lg">
              A 24-inch transmission segment showed early vibration drift that would have triggered an emergency shutdown. Altaviz flagged it 48 hours out — giving the operations team time to schedule a planned repair instead.
            </p>

            <Link
              href="/contact"
              className="inline-flex items-center gap-2 text-sm font-medium text-[#C4A77D] hover:text-[#D4C5A9] transition-colors"
            >
              See how it works with your data
              <ArrowRight className="size-4" />
            </Link>
          </motion.div>

          {/* Right: Metrics grid */}
          <motion.div
            className="grid grid-cols-2 gap-4"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            {METRICS.map(({ value, label, icon: Icon }) => (
              <div
                key={label}
                className="rounded-xl bg-white/[0.04] border border-white/[0.06] p-6"
              >
                <Icon className="size-5 text-[#C4A77D]/60 mb-3" />
                <p className="text-2xl sm:text-3xl font-bold font-mono text-[#C4A77D] mb-1">{value}</p>
                <p className="text-xs text-white/40 leading-snug">{label}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
