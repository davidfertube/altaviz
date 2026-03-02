'use client';

import { motion } from 'framer-motion';
import { Shield, FileCheck, Leaf, Activity, Lock, Bot } from 'lucide-react';

const BADGES = [
  {
    icon: Shield,
    title: 'SOC 2 Type II',
    description: 'Enterprise security controls audited annually',
    accent: '#6366F1',
  },
  {
    icon: FileCheck,
    title: '49 CFR 192 / PHMSA',
    description: 'Pipeline safety and integrity management compliance',
    accent: '#F5C518',
  },
  {
    icon: Leaf,
    title: 'EPA Subpart W',
    description: 'Automated methane emissions monitoring and reporting',
    accent: '#10B981',
  },
  {
    icon: Bot,
    title: 'AI Agent Guardrails',
    description: 'Cost caps, confidence thresholds, and human-in-the-loop approval gates',
    accent: '#8B5CF6',
  },
  {
    icon: Activity,
    title: 'ISO 10816',
    description: 'Vibration severity evaluation for rotating machinery',
    accent: '#06B6D4',
  },
  {
    icon: Lock,
    title: 'SSO / SAML',
    description: 'Enterprise single sign-on and identity federation',
    accent: '#F5C518',
  },
];

export default function SecurityCompliance() {
  return (
    <section id="security" className="relative py-24 sm:py-32 overflow-hidden">
      <div className="absolute inset-0 bg-[#F5F5F5]" />
      {/* Ambient glow orbs */}
      <div className="absolute top-1/4 left-0 w-[400px] h-[400px] bg-[#6366F1]/5 rounded-full blur-[120px]" />
      <div className="absolute bottom-1/4 right-0 w-[400px] h-[400px] bg-[#8B5CF6]/5 rounded-full blur-[120px]" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-start">
          {/* Left: Content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.5 }}
          >
            <p className="text-[11px] font-semibold text-[#F5C518] uppercase tracking-[0.15em] mb-3">Security & Compliance</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-[#0A0A0A] mb-4">
              Your data. Your control.{' '}
              <span className="text-[#F5C518]">Fully compliant.</span>
            </h2>
            <p className="text-base text-[#6B7280] leading-relaxed mb-6">
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
                <li key={item} className="flex items-start gap-2.5 text-sm text-[#6B7280]">
                  <Shield className="size-4 text-[#F5C518] mt-0.5 shrink-0" />
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
              visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.2 } },
            }}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
          >
            {BADGES.map(({ icon: Icon, title, description, accent }) => (
              <motion.div
                key={title}
                className="group relative rounded-xl bg-white border border-[#E5E5E5] p-5 overflow-hidden"
                variants={{
                  hidden: { opacity: 0, y: 24, scale: 0.95 },
                  visible: {
                    opacity: 1,
                    y: 0,
                    scale: 1,
                    transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] as const },
                  },
                }}
                whileHover={{
                  y: -6,
                  scale: 1.02,
                  borderColor: accent,
                  boxShadow: `0 20px 40px -12px ${accent}20, 0 0 0 1px ${accent}30`,
                  transition: { duration: 0.25, ease: 'easeOut' },
                }}
              >
                {/* Shimmer effect on hover */}
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  style={{
                    background: `linear-gradient(135deg, transparent 40%, ${accent}08 50%, transparent 60%)`,
                  }}
                />
                {/* Accent top line */}
                <motion.div
                  className="absolute top-0 left-0 right-0 h-[2px]"
                  style={{ background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }}
                  initial={{ scaleX: 0, opacity: 0 }}
                  whileInView={{ scaleX: 1, opacity: 0.6 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.8, delay: 0.5 }}
                />

                <div className="relative">
                  <motion.div
                    className="w-10 h-10 rounded-lg flex items-center justify-center mb-3"
                    style={{ backgroundColor: `${accent}15` }}
                    whileHover={{
                      scale: 1.1,
                      backgroundColor: `${accent}25`,
                      transition: { duration: 0.2 },
                    }}
                  >
                    <Icon className="size-5" style={{ color: accent }} />
                  </motion.div>
                  <p className="text-sm font-semibold text-[#0A0A0A] mb-1">{title}</p>
                  <p className="text-xs text-[#9CA3AF] leading-snug">{description}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
