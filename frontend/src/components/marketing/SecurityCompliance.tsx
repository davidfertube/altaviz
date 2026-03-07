'use client';

import { motion } from 'framer-motion';
import { Shield, FileCheck, Leaf, Activity, Lock, Bot } from 'lucide-react';

const BADGES = [
  {
    icon: Shield,
    title: 'SOC 2 Type II',
    description: 'Enterprise security controls audited annually',
    accent: '#6366F1',
    iconBg: '#6366F115',
  },
  {
    icon: FileCheck,
    title: '49 CFR 192 / PHMSA',
    description: 'Compressor safety and integrity management compliance',
    accent: '#F59E0B',
    iconBg: '#F59E0B15',
  },
  {
    icon: Leaf,
    title: 'EPA Subpart W',
    description: 'Automated methane emissions monitoring and reporting',
    accent: '#10B981',
    iconBg: '#10B98115',
  },
  {
    icon: Bot,
    title: 'AI Agent Guardrails',
    description: 'Cost caps, confidence thresholds, and human-in-the-loop approval gates',
    accent: '#8B5CF6',
    iconBg: '#8B5CF615',
  },
  {
    icon: Activity,
    title: 'ISO 10816',
    description: 'Vibration severity evaluation for rotating machinery',
    accent: '#06B6D4',
    iconBg: '#06B6D415',
  },
  {
    icon: Lock,
    title: 'SSO / SAML',
    description: 'Enterprise single sign-on and identity federation',
    accent: '#EC4899',
    iconBg: '#EC489915',
  },
];

const CHECKLIST = [
  { text: 'Complete data isolation — your fleet data is never shared', color: '#6366F1' },
  { text: 'Encrypted at rest and in transit (TLS 1.3, AES-256)', color: '#10B981' },
  { text: 'Full audit trail for every access and configuration change', color: '#F59E0B' },
  { text: 'Role-based access: Owner, Admin, Operator, Viewer', color: '#8B5CF6' },
  { text: 'SOC 2 Type II controls with annual third-party audits', color: '#06B6D4' },
];

const cardVariants = {
  hidden: { opacity: 0, y: 28, scale: 0.92 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.5,
      delay: i * 0.1,
      ease: [0.25, 0.46, 0.45, 0.94] as const,
    },
  }),
};

const checklistVariants = {
  hidden: { opacity: 0, x: -16 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: { duration: 0.4, delay: 0.3 + i * 0.08 },
  }),
};

export default function SecurityCompliance() {
  return (
    <section id="security" className="relative py-24 sm:py-32 overflow-hidden">
      <div className="absolute inset-0 bg-[#F5F5F5]" />
      {/* Animated ambient glow orbs */}
      <motion.div
        className="absolute top-1/4 left-0 w-[500px] h-[500px] bg-[#6366F1]/[0.08] rounded-full blur-[140px]"
        animate={{ x: [0, 30, 0], y: [0, -20, 0], scale: [1, 1.1, 1] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute bottom-1/4 right-0 w-[500px] h-[500px] bg-[#8B5CF6]/[0.08] rounded-full blur-[140px]"
        animate={{ x: [0, -30, 0], y: [0, 20, 0], scale: [1, 1.15, 1] }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute top-1/2 left-1/3 w-[300px] h-[300px] bg-[#10B981]/[0.06] rounded-full blur-[120px]"
        animate={{ x: [0, 20, 0], y: [0, -15, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-start">
          {/* Left: Content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.5 }}
          >
            <motion.p
              className="text-[11px] font-semibold text-[#F5C518] uppercase tracking-[0.15em] mb-3"
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4 }}
            >
              Security & Compliance
            </motion.p>
            <h2 className="text-3xl sm:text-4xl font-bold text-[#0A0A0A] mb-4">
              Your data. Your control.{' '}
              <motion.span
                className="bg-gradient-to-r from-[#F5C518] via-[#F59E0B] to-[#F5C518] bg-clip-text text-transparent"
                animate={{ backgroundPosition: ['0% center', '200% center'] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
                style={{ backgroundSize: '200% auto' }}
              >
                Fully compliant.
              </motion.span>
            </h2>
            <p className="text-base text-[#6B7280] leading-relaxed mb-6">
              Your fleet data is isolated at every level — no other customer can ever access it.
              All access is audit-logged, encrypted in transit and at rest, and protected by
              role-based permissions. Built for the same security standards your enterprise IT team demands.
            </p>
            <ul className="space-y-3">
              {CHECKLIST.map((item, i) => (
                <motion.li
                  key={item.text}
                  className="flex items-start gap-2.5 text-sm text-[#6B7280]"
                  custom={i}
                  variants={checklistVariants}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, margin: '-40px' }}
                >
                  <motion.div
                    whileHover={{ scale: 1.2, rotate: 10 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                  >
                    <Shield className="size-4 mt-0.5 shrink-0" style={{ color: item.color }} />
                  </motion.div>
                  {item.text}
                </motion.li>
              ))}
            </ul>
          </motion.div>

          {/* Right: Badge grid */}
          <div className="grid grid-cols-2 gap-4">
            {BADGES.map(({ icon: Icon, title, description, accent, iconBg }, i) => (
              <motion.div
                key={title}
                className="group relative rounded-xl bg-white border border-[#E5E5E5] p-5 overflow-hidden"
                custom={i}
                variants={cardVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-60px' }}
                whileHover={{
                  y: -8,
                  scale: 1.03,
                  borderColor: accent,
                  boxShadow: `0 24px 48px -12px ${accent}25, 0 0 0 1px ${accent}30`,
                  transition: { duration: 0.25, ease: 'easeOut' },
                }}
              >
                {/* Shimmer effect on hover */}
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  style={{
                    background: `linear-gradient(135deg, transparent 30%, ${accent}10 50%, transparent 70%)`,
                  }}
                />
                {/* Animated accent top line */}
                <motion.div
                  className="absolute top-0 left-0 right-0 h-[3px]"
                  style={{ background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }}
                  initial={{ scaleX: 0, opacity: 0 }}
                  whileInView={{ scaleX: 1, opacity: 0.8 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.8, delay: 0.3 + i * 0.1 }}
                />
                {/* Animated bottom accent */}
                <motion.div
                  className="absolute bottom-0 left-0 h-[2px]"
                  style={{ backgroundColor: accent }}
                  initial={{ width: 0 }}
                  whileInView={{ width: '40%' }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: 0.5 + i * 0.1 }}
                />

                <div className="relative">
                  <motion.div
                    className="w-11 h-11 rounded-xl flex items-center justify-center mb-3"
                    style={{ backgroundColor: iconBg }}
                    whileHover={{
                      scale: 1.15,
                      rotate: 5,
                      backgroundColor: `${accent}25`,
                      transition: { type: 'spring', stiffness: 400, damping: 15 },
                    }}
                  >
                    <Icon className="size-5" style={{ color: accent }} />
                  </motion.div>
                  <p className="text-sm font-semibold text-[#0A0A0A] mb-1">{title}</p>
                  <p className="text-xs text-[#9CA3AF] leading-snug">{description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
