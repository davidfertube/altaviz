'use client';

import { motion } from 'framer-motion';

const INTEGRATIONS = [
  { name: 'OSIsoft PI', category: 'Historian' },
  { name: 'Honeywell Experion', category: 'SCADA' },
  { name: 'Detechtion IIoT', category: 'Compressor Monitoring' },
  { name: 'Ariel SmartLink', category: 'Compressor OEM' },
  { name: 'Emerson DeltaV', category: 'SCADA' },
  { name: 'AVEVA', category: 'Historian' },
  { name: 'Azure IoT Hub', category: 'Cloud' },
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
          variants={{
            hidden: { opacity: 0 },
            visible: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.15 } },
          }}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
        >
          {INTEGRATIONS.map(({ name, category }) => (
            <motion.div
              key={name}
              className="flex items-center gap-2.5 rounded-xl bg-white border border-[#E7E0D5] px-5 py-3 hover:border-[#C4A77D]/40 hover:shadow-sm transition-colors"
              variants={{
                hidden: { opacity: 0, y: 16 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] as const } },
              }}
              whileHover={{ y: -2, transition: { duration: 0.2 } }}
            >
              <div className="w-2 h-2 rounded-full bg-[#C4A77D]/40" />
              <div>
                <p className="text-sm font-medium text-[#1C1917]">{name}</p>
                <p className="text-[10px] text-[#A8A29E]">{category}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
