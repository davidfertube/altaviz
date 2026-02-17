'use client';

import { motion } from 'framer-motion';
import { ArrowRight, TrendingDown, Clock, DollarSign, Truck } from 'lucide-react';

const METRICS = [
  { value: '40%', label: 'Fewer unplanned shutdowns', icon: TrendingDown },
  { value: '48hr', label: 'Average advance warning', icon: Clock },
  { value: '$2.1M', label: 'Saved per avoided incident', icon: DollarSign },
  { value: '60%', label: 'Reduction in truck rolls', icon: Truck },
];

export default function CaseStudyTeaser() {
  return (
    <section className="relative py-24 sm:py-32">
      <div className="absolute inset-0 bg-[#0C1018]" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left: Quote */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.5 }}
          >
            <p className="text-[11px] font-semibold text-[#C4A77D] uppercase tracking-[0.15em] mb-6">Case Study</p>

            <blockquote className="text-xl sm:text-2xl lg:text-3xl font-medium text-white leading-snug mb-8">
              <span className="text-[#C4A77D]">&ldquo;</span>
              Caught a corrosion anomaly on a 24-inch transmission segment two days before it would have triggered a shutdown. That one save paid for six months of Altaviz.
              <span className="text-[#C4A77D]">&rdquo;</span>
            </blockquote>

            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 rounded-full bg-[#C4A77D] flex items-center justify-center">
                <span className="text-white font-semibold text-sm">MT</span>
              </div>
              <div>
                <p className="text-sm font-medium text-white">Michael Torres</p>
                <p className="text-xs text-white/40">VP of Pipeline Operations, Permian Basin Midstream</p>
              </div>
            </div>

            <a
              href="#testimonials"
              className="inline-flex items-center gap-2 text-sm font-medium text-[#C4A77D] hover:text-[#D4C5A9] transition-colors"
            >
              Read the full case study
              <ArrowRight className="size-4" />
            </a>
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
