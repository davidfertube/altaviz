'use client';

import { motion } from 'framer-motion';

const INTEGRATIONS = [
  { name: 'OSIsoft PI', category: 'Historian' },
  { name: 'Honeywell Experion', category: 'SCADA' },
  { name: 'Emerson DeltaV', category: 'SCADA' },
  { name: 'AVEVA', category: 'Historian' },
  { name: 'AWS IoT', category: 'Cloud' },
  { name: 'Azure IoT Hub', category: 'Cloud' },
  { name: 'Snowflake', category: 'Data' },
  { name: 'OPC-UA', category: 'Protocol' },
];

export default function Integrations() {
  return (
    <section className="relative py-16 sm:py-20">
      <div className="absolute inset-0 bg-[#FAF9F6]" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          className="text-center mb-10"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.5 }}
        >
          <p className="text-[11px] font-semibold text-[#C4A77D] uppercase tracking-[0.15em] mb-3">Integrations</p>
          <h2 className="text-2xl sm:text-3xl font-bold text-[#1C1917] mb-3">
            Connects to the systems you already run
          </h2>
          <p className="text-base text-[#78716C] max-w-xl mx-auto">
            No rip-and-replace. Altaviz ingests data from standard SCADA systems, historians, and cloud platforms.
          </p>
        </motion.div>

        <motion.div
          className="flex flex-wrap items-center justify-center gap-4 sm:gap-6"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          {INTEGRATIONS.map(({ name, category }) => (
            <div
              key={name}
              className="flex items-center gap-2.5 rounded-xl bg-white border border-[#E7E0D5] px-5 py-3 hover:border-[#C4A77D]/40 hover:shadow-sm transition-all"
            >
              <div className="w-2 h-2 rounded-full bg-[#C4A77D]/40" />
              <div>
                <p className="text-sm font-medium text-[#1C1917]">{name}</p>
                <p className="text-[10px] text-[#A8A29E]">{category}</p>
              </div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
