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

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.15 },
  },
};

const fadeInUp = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] as const },
  },
};

export default function TrustBar() {
  return (
    <section className="relative py-10 sm:py-14 overflow-hidden">
      <div className="absolute inset-0 bg-[#FAFAFA]" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.p
          className="text-center text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-[0.15em] mb-8"
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          Trusted by operators across major U.S. basins
        </motion.p>

        <motion.div
          className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
        >
          {OPERATORS.map((name) => (
            <motion.span
              key={name}
              className="text-sm sm:text-base font-semibold text-[#0A0A0A]/25 whitespace-nowrap tracking-tight hover:text-[#0A0A0A]/40 transition-colors"
              variants={fadeInUp}
            >
              {name}
            </motion.span>
          ))}
        </motion.div>

        <motion.p
          className="text-center text-xs text-[#9CA3AF] mt-6"
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          4,700+ compressors monitored across 10 basins. Zero undetected failures.
        </motion.p>
      </div>
    </section>
  );
}
