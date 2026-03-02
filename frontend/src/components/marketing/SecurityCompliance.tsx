'use client';

import { motion } from 'framer-motion';
import { Shield, FileCheck, Leaf, Activity, Lock, Bot } from 'lucide-react';

const BADGES = [
  {
    icon: Shield,
    title: 'SOC 2 Type II',
    description: 'Enterprise security controls audited annually',
  },
  {
    icon: FileCheck,
    title: '49 CFR 192 / PHMSA',
    description: 'Pipeline safety and integrity management compliance',
  },
  {
    icon: Leaf,
    title: 'EPA Subpart W',
    description: 'Automated methane emissions monitoring and reporting',
  },
  {
    icon: Bot,
    title: 'AI Agent Guardrails',
    description: 'Cost caps, confidence thresholds, and human-in-the-loop approval gates',
  },
  {
    icon: Activity,
    title: 'ISO 10816',
    description: 'Vibration severity evaluation for rotating machinery',
  },
  {
    icon: Lock,
    title: 'SSO / SAML',
    description: 'Enterprise single sign-on and identity federation',
  },
];

export default function SecurityCompliance() {
  return (
    <section id="security" className="relative py-24 sm:py-32">
      <div className="absolute inset-0 bg-[#F5F0E8]" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-start">
          {/* Left: Content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.5 }}
          >
            <p className="text-[11px] font-semibold text-[#C4A77D] uppercase tracking-[0.15em] mb-3">Security & Compliance</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-[#1C1917] mb-4">
              Your data. Your control.{' '}
              <span className="text-[#C4A77D]">Fully compliant.</span>
            </h2>
            <p className="text-base text-[#78716C] leading-relaxed mb-6">
              Your fleet data is isolated at every level — no other customer can ever access it.
              All access is audit-logged, encrypted in transit and at rest, and protected by
              role-based permissions. Built for the same security standards your enterprise IT team demands.
            </p>
            <ul className="space-y-3">
              {[
                'Complete data isolation — your fleet data is never shared',
                'Encrypted at rest and in transit (TLS 1.3, AES-256)',
                'Full audit trail for every access and configuration change',
                'Role-based access: Owner, Admin, Operator, Viewer',
                'SOC 2 Type II controls with annual third-party audits',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm text-[#78716C]">
                  <Shield className="size-4 text-[#C4A77D] mt-0.5 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Right: Badge grid */}
          <motion.div
            className="grid grid-cols-2 gap-4"
            variants={{
              hidden: { opacity: 0 },
              visible: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.15 } },
            }}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
          >
            {BADGES.map(({ icon: Icon, title, description }) => (
              <motion.div
                key={title}
                className="rounded-xl bg-white border border-[#E7E0D5] p-5 hover:border-[#C4A77D]/40 hover:shadow-lg hover:shadow-[#C4A77D]/5 transition-colors"
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] as const } },
                }}
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
              >
                <div className="w-10 h-10 rounded-lg bg-[#C4A77D]/10 flex items-center justify-center mb-3">
                  <Icon className="size-5 text-[#A68B5B]" />
                </div>
                <p className="text-sm font-semibold text-[#1C1917] mb-1">{title}</p>
                <p className="text-xs text-[#A8A29E] leading-snug">{description}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
