'use client';

import { motion } from 'framer-motion';
import { Cable, BrainCircuit, TrendingUp, Bell } from 'lucide-react';

const STEPS = [
  {
    number: '01',
    title: 'Ingest',
    icon: Cable,
    description: 'Connect existing SCADA systems, historians, or deploy edge sensors. PySpark pipeline processes 10,000+ readings per day through Bronze/Silver/Gold medallion architecture.',
    detail: 'No rip-and-replace. Connects to OSIsoft PI, Honeywell Experion, and standard OPC-UA sources.',
  },
  {
    number: '02',
    title: 'Detect',
    icon: BrainCircuit,
    description: 'Isolation Forest ML models baseline healthy behavior per pipeline segment. Anomaly scores flag degradation patterns 24-48 hours before threshold alerts.',
    detail: 'Models retrain quarterly on your fleet data. Zero false-positive tuning included.',
  },
  {
    number: '03',
    title: 'Predict',
    icon: TrendingUp,
    description: 'Temperature drift prediction, remaining useful life estimation, and EPA Subpart W emissions calculations run automatically on every data window.',
    detail: 'Four ML models run in parallel across 1hr, 4hr, and 24hr aggregation windows.',
  },
  {
    number: '04',
    title: 'Act',
    icon: Bell,
    description: 'Prioritized alerts route to the right team. Automated workflows escalate, resolve, and audit without manual intervention.',
    detail: 'Configurable escalation: unacknowledged warnings auto-escalate to critical after 4 hours.',
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="relative py-24 sm:py-32">
      <div className="absolute inset-0 bg-[#FAF9F6]" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.5 }}
        >
          <p className="text-[11px] font-semibold text-[#C4A77D] uppercase tracking-[0.15em] mb-3">How It Works</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-[#1C1917] mb-4">
            From raw sensor data to actionable intelligence
          </h2>
          <p className="text-lg text-[#78716C] max-w-2xl mx-auto">
            Four automated stages. No manual data wrangling. Results in under 30 seconds.
          </p>
        </motion.div>

        {/* Vertical timeline */}
        <div className="relative max-w-3xl mx-auto">
          {/* Connecting line */}
          <div className="absolute left-8 sm:left-10 top-0 bottom-0 w-px bg-gradient-to-b from-[#C4A77D]/30 via-[#C4A77D]/20 to-transparent" />

          <div className="space-y-12">
            {STEPS.map((step, i) => (
              <motion.div
                key={step.number}
                className="relative flex gap-6 sm:gap-8"
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
              >
                {/* Step icon */}
                <div className="relative z-10 shrink-0">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white border border-[#E7E0D5] flex flex-col items-center justify-center shadow-sm">
                    <step.icon className="size-5 sm:size-6 text-[#C4A77D] mb-1" />
                    <span className="text-[9px] font-bold text-[#A8A29E] font-mono">{step.number}</span>
                  </div>
                </div>

                {/* Step content */}
                <div className="pt-2 pb-2">
                  <h3 className="text-xl sm:text-2xl font-bold text-[#1C1917] mb-2">
                    {step.title}
                  </h3>
                  <p className="text-sm sm:text-base text-[#78716C] leading-relaxed mb-2">
                    {step.description}
                  </p>
                  <p className="text-xs text-[#A8A29E] leading-relaxed">
                    {step.detail}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
