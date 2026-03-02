'use client';

import { motion } from 'framer-motion';
import { Cable, BrainCircuit, Bot, Wrench } from 'lucide-react';

const STEPS = [
  {
    number: '01',
    title: 'Connect',
    icon: Cable,
    description: 'Plug in your existing SCADA systems or upload CSVs. Altaviz ingests pressure, temperature, vibration, and flow data from your entire fleet — without disrupting operations.',
    detail: 'Supports OSIsoft PI, Honeywell Experion, Emerson DeltaV, and OPC-UA. Most fleets go live in under a week.',
  },
  {
    number: '02',
    title: 'Detect',
    icon: BrainCircuit,
    description: 'ML models learn the healthy baseline of each pipeline asset. When sensor patterns start to deviate, you get an alert — 24 to 48 hours before a traditional threshold alarm.',
    detail: 'Models retrain quarterly on your data. Tuned for zero false positives — so your crew trusts every alert.',
  },
  {
    number: '03',
    title: 'Investigate',
    icon: Bot,
    description: 'AI agents automatically trace root cause, check maintenance history, and search the knowledge base. You get a diagnosis — not just an alarm.',
    detail: 'Root cause analysis in seconds, not hours. 87% confidence threshold before any recommendation ships.',
  },
  {
    number: '04',
    title: 'Fix',
    icon: Wrench,
    description: 'Work orders auto-generated with parts list, priority level, and cost estimate. The right technician gets notified. You approve and they act.',
    detail: 'Human-in-the-loop approval gates. Nothing ships without your sign-off.',
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="relative py-24 sm:py-32">
      <div className="absolute inset-0 bg-[#FAFAFA]" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.5 }}
        >
          <p className="text-[11px] font-semibold text-[#F5C518] uppercase tracking-[0.15em] mb-3">How It Works</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-[#0A0A0A] mb-4">
            From your SCADA system to work orders in the field
          </h2>
          <p className="text-lg text-[#6B7280] max-w-2xl mx-auto">
            Less than 25% of operators use predictive maintenance today. Go live in under a week.
          </p>
        </motion.div>

        {/* Vertical timeline */}
        <div className="relative max-w-3xl mx-auto">
          {/* Connecting line */}
          <div className="absolute left-8 sm:left-10 top-0 bottom-0 w-px bg-gradient-to-b from-[#F5C518]/30 via-[#F5C518]/20 to-transparent" />

          {/* Animated glowing dot that travels down */}
          <motion.div
            className="absolute left-[29px] sm:left-[37px] w-[5px] h-[5px] rounded-full bg-[#F5C518] z-20"
            style={{ boxShadow: '0 0 8px rgba(245,197,24,0.6), 0 0 16px rgba(245,197,24,0.3)' }}
            initial={{ top: 0, opacity: 0 }}
            whileInView={{ top: '100%', opacity: [0, 1, 1, 0] }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 3, ease: 'easeInOut' }}
          />

          <div className="space-y-12">
            {STEPS.map((step, i) => (
              <motion.div
                key={step.number}
                className="relative flex gap-6 sm:gap-8"
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                whileHover={{ x: 4, transition: { duration: 0.2 } }}
              >
                {/* Step icon */}
                <div className="relative z-10 shrink-0">
                  <motion.div
                    className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white border border-[#E5E5E5] flex flex-col items-center justify-center shadow-sm"
                    whileInView={{ borderColor: ['rgba(231,224,213,1)', 'rgba(245,197,24,0.5)', 'rgba(231,224,213,1)'] }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.5 + i * 0.7, duration: 0.6 }}
                  >
                    <step.icon className="size-5 sm:size-6 text-[#F5C518] mb-1" />
                    <span className="text-[9px] font-bold text-[#9CA3AF] font-mono">{step.number}</span>
                  </motion.div>
                </div>

                {/* Step content */}
                <div className="pt-2 pb-2">
                  <h3 className="text-xl sm:text-2xl font-bold text-[#0A0A0A] mb-2">
                    {step.title}
                  </h3>
                  <p className="text-sm sm:text-base text-[#6B7280] leading-relaxed mb-2">
                    {step.description}
                  </p>
                  <p className="text-xs text-[#9CA3AF] leading-relaxed">
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
