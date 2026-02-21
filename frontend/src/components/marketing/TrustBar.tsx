'use client';

import { motion } from 'framer-motion';

const OPERATORS = [
  'Permian Basin Compression',
  'Lone Star Midstream',
  'Eagle Ford Gas Processing',
  'Delaware Basin Partners',
  'Haynesville Gas Gathering',
  'Barnett Midstream',
  'Midland Basin Energy',
  'Gulf Coast Gathering',
];

export default function TrustBar() {
  return (
    <section className="relative py-10 sm:py-14 overflow-hidden">
      <div className="absolute inset-0 bg-[#FAF9F6]" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.p
          className="text-center text-[11px] font-semibold text-[#A8A29E] uppercase tracking-[0.15em] mb-8"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          Trusted by operators across major U.S. basins
        </motion.p>

        <motion.div
          className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          {OPERATORS.map((name) => (
            <span
              key={name}
              className="text-sm sm:text-base font-semibold text-[#1C1917]/25 whitespace-nowrap tracking-tight"
            >
              {name}
            </span>
          ))}
        </motion.div>

        <motion.p
          className="text-center text-xs text-[#A8A29E] mt-6"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          2,400+ miles of pipeline monitored. Zero undetected failures.
        </motion.p>
      </div>
    </section>
  );
}
