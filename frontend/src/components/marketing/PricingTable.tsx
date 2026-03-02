'use client';

import { useState } from 'react';
import { motion, useInView } from 'framer-motion';
import { Check, Minus, Sparkles, BrainCircuit, Zap } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useRef } from 'react';

const PLANS = [
  {
    name: 'Pilot',
    monthlyPrice: '$0',
    annualPrice: '$0',
    period: '30-day trial',
    description: 'Evaluate Altaviz on a small segment of your fleet.',
    features: [
      'Up to 10 pipeline segments',
      '1-hour aggregation window',
      'Threshold-based alerts',
      'Fleet overview dashboard',
      '30-day data retention',
      'Email support',
    ],
    cta: 'Get Started',
    highlighted: false,
  },
  {
    name: 'Operations',
    monthlyPrice: '$2,499',
    annualPrice: '$1,999',
    period: '/month',
    annualPeriod: '/mo billed annually',
    description: 'Full monitoring with ML predictions for growing operations.',
    features: [
      'Up to 200 pipeline segments',
      '1hr, 4hr, 24hr windows',
      'ML failure predictions',
      'AI agents (investigation + work orders)',
      'SMS + webhook alerts',
      '1-year data retention',
      'API access',
      'Priority support',
    ],
    cta: 'Get Started',
    highlighted: true,
    badge: 'Most Popular',
  },
  {
    name: 'Enterprise',
    monthlyPrice: 'Custom',
    annualPrice: 'Custom',
    period: 'annual contract',
    description: 'Unlimited scale with SSO, SLA, and dedicated support — starting at $50K/year.',
    features: [
      'Unlimited pipeline segments',
      'All aggregation windows',
      'Everything in Operations',
      'Autonomous fleet scans + optimization copilot',
      'SSO / SAML integration',
      'Custom integrations',
      'SLA + dedicated CSM',
      'Bulk export API',
      'On-prem deployment option',
    ],
    cta: 'Contact Sales',
    highlighted: false,
  },
];

const COMPARISON = [
  {
    category: 'Fleet Monitoring',
    accent: '#F5C518',
    features: [
      { name: 'Pipeline segments monitored', pilot: '10', operations: '200', enterprise: 'Unlimited' },
      { name: 'Aggregation windows', pilot: '1hr', operations: '1hr, 4hr, 24hr', enterprise: 'All + custom' },
      { name: 'Real-time fleet dashboard', pilot: true, operations: true, enterprise: true },
      { name: 'Individual asset drill-down', pilot: true, operations: true, enterprise: true },
      { name: 'Multi-basin fleet view', pilot: false, operations: true, enterprise: true },
      { name: 'Custom health score thresholds', pilot: false, operations: true, enterprise: true },
    ],
  },
  {
    category: 'Predictive Intelligence',
    accent: '#6366F1',
    features: [
      { name: 'Threshold-based alerts', pilot: true, operations: true, enterprise: true },
      { name: 'ML anomaly detection (Isolation Forest)', pilot: false, operations: true, enterprise: true },
      { name: 'Temperature drift prediction', pilot: false, operations: true, enterprise: true },
      { name: 'Remaining Useful Life (RUL)', pilot: false, operations: true, enterprise: true },
      { name: 'Emissions estimation (EPA factors)', pilot: false, operations: true, enterprise: true },
      { name: 'Custom model training on your data', pilot: false, operations: false, enterprise: true },
      { name: 'Quarterly model retraining', pilot: false, operations: true, enterprise: true },
    ],
  },
  {
    category: 'AI Agents & Automation',
    accent: '#8B5CF6',
    features: [
      { name: 'AI diagnostic agent', pilot: false, operations: true, enterprise: true },
      { name: 'AI investigation agent (RAG)', pilot: false, operations: true, enterprise: true },
      { name: 'Auto work order generation', pilot: false, operations: true, enterprise: true },
      { name: 'Human-in-the-loop approval gates', pilot: false, operations: true, enterprise: true },
      { name: 'Autonomous fleet scans', pilot: false, operations: false, enterprise: true },
      { name: 'Optimization copilot (chat)', pilot: false, operations: false, enterprise: true },
      { name: 'Knowledge base (learns from fixes)', pilot: false, operations: false, enterprise: true },
    ],
  },
  {
    category: 'Alerts & Notifications',
    accent: '#F59E0B',
    features: [
      { name: 'Email alerts', pilot: true, operations: true, enterprise: true },
      { name: 'SMS alerts', pilot: false, operations: true, enterprise: true },
      { name: 'Webhook integrations', pilot: false, operations: true, enterprise: true },
      { name: 'Custom escalation rules', pilot: false, operations: false, enterprise: true },
    ],
  },
  {
    category: 'Compliance & Reporting',
    accent: '#10B981',
    features: [
      { name: 'EPA Subpart W emissions tracking', pilot: false, operations: true, enterprise: true },
      { name: 'PHMSA-aligned reporting', pilot: false, operations: true, enterprise: true },
      { name: 'Full audit logs', pilot: false, operations: true, enterprise: true },
      { name: 'Compliance data exports', pilot: false, operations: false, enterprise: true },
      { name: 'Custom regulatory reports', pilot: false, operations: false, enterprise: true },
    ],
  },
  {
    category: 'Data & Infrastructure',
    accent: '#06B6D4',
    features: [
      { name: 'Data retention', pilot: '30 days', operations: '1 year', enterprise: 'Unlimited' },
      { name: 'REST API access', pilot: false, operations: true, enterprise: true },
      { name: 'Bulk export API', pilot: false, operations: false, enterprise: true },
      { name: 'SCADA integrations (PI, Experion, DeltaV)', pilot: false, operations: true, enterprise: true },
      { name: 'Custom integrations', pilot: false, operations: false, enterprise: true },
    ],
  },
  {
    category: 'Security & Access',
    accent: '#6366F1',
    features: [
      { name: 'Role-based access control (4 roles)', pilot: true, operations: true, enterprise: true },
      { name: 'SSO / SAML', pilot: false, operations: false, enterprise: true },
      { name: 'Encryption at rest + in transit', pilot: true, operations: true, enterprise: true },
      { name: 'SOC 2 Type II compliance', pilot: true, operations: true, enterprise: true },
      { name: 'On-premises deployment', pilot: false, operations: false, enterprise: true },
    ],
  },
  {
    category: 'Support & Onboarding',
    accent: '#F5C518',
    features: [
      { name: 'Email support', pilot: true, operations: true, enterprise: true },
      { name: 'Priority support (< 4hr SLA)', pilot: false, operations: true, enterprise: true },
      { name: 'Dedicated CSM', pilot: false, operations: false, enterprise: true },
      { name: 'SLA guarantee', pilot: false, operations: false, enterprise: true },
      { name: 'Technical onboarding (< 1 week)', pilot: false, operations: true, enterprise: true },
    ],
  },
];

function CellValue({ value }: { value: boolean | string }) {
  if (typeof value === 'string') {
    return <span className="text-sm text-[#0A0A0A] font-medium">{value}</span>;
  }
  return value ? (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      whileInView={{ scale: 1, opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.3, type: 'spring', stiffness: 400, damping: 15 }}
    >
      <Check className="size-4 text-[#6366F1] mx-auto" />
    </motion.div>
  ) : (
    <Minus className="size-4 text-[#E5E5E5] mx-auto" />
  );
}

function AnimatedSection({ section, index }: { section: typeof COMPARISON[0]; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0 }}
      animate={isInView ? { opacity: 1 } : { opacity: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
    >
      {/* Category header */}
      <div className="relative px-4 py-3 bg-[#FAFAFA]/50 border-b border-[#E5E5E5] overflow-hidden">
        <motion.div
          className="absolute left-0 top-0 bottom-0 w-[3px]"
          style={{ backgroundColor: section.accent }}
          initial={{ scaleY: 0 }}
          animate={isInView ? { scaleY: 1 } : { scaleY: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        />
        <div className="flex items-center gap-2">
          {section.category === 'AI Agents & Automation' && (
            <BrainCircuit className="size-3.5 text-[#8B5CF6]" />
          )}
          {section.category === 'Predictive Intelligence' && (
            <Sparkles className="size-3.5 text-[#6366F1]" />
          )}
          {section.category === 'Alerts & Notifications' && (
            <Zap className="size-3.5 text-[#F59E0B]" />
          )}
          <span className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-wider">
            {section.category}
          </span>
        </div>
      </div>
      {/* Feature rows */}
      {section.features.map((feature, i) => (
        <motion.div
          key={feature.name}
          className={cn(
            'grid grid-cols-4 items-center group/row hover:bg-[#FAFAFA]/80 transition-colors',
            i < section.features.length - 1 && 'border-b border-[#E5E5E5]/50'
          )}
          initial={{ opacity: 0, x: -10 }}
          animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -10 }}
          transition={{ duration: 0.3, delay: 0.1 + i * 0.04 }}
        >
          <div className="px-4 py-3 text-sm text-[#6B7280] group-hover/row:text-[#0A0A0A] transition-colors">
            {feature.name}
          </div>
          <div className="px-4 py-3 text-center"><CellValue value={feature.pilot} /></div>
          <div className="px-4 py-3 text-center"><CellValue value={feature.operations} /></div>
          <div className="px-4 py-3 text-center"><CellValue value={feature.enterprise} /></div>
        </motion.div>
      ))}
    </motion.div>
  );
}

export default function PricingTable() {
  const [annual, setAnnual] = useState(false);

  return (
    <section id="pricing" className="relative py-24 sm:py-32 overflow-hidden">
      <div className="absolute inset-0 bg-[#FAFAFA]" />
      {/* Ambient glow */}
      <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-[#6366F1]/4 rounded-full blur-[140px]" />
      <div className="absolute bottom-1/4 left-1/4 w-[400px] h-[400px] bg-[#8B5CF6]/4 rounded-full blur-[120px]" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          className="text-center mb-10"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.5 }}
        >
          <p className="text-[11px] font-semibold text-[#F5C518] uppercase tracking-[0.15em] mb-3">Pricing</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-[#0A0A0A] mb-4">
            Plans that scale with your fleet
          </h2>
          <p className="text-lg text-[#6B7280] max-w-xl mx-auto mb-8">
            Start with a pilot. Scale to enterprise.
          </p>

          {/* Annual/Monthly toggle */}
          <div className="inline-flex items-center gap-3 bg-white rounded-full border border-[#E5E5E5] p-1">
            <button
              onClick={() => setAnnual(false)}
              className={cn(
                'text-sm font-medium px-4 py-2 rounded-full transition-all',
                !annual ? 'bg-[#0A0A0A] text-white' : 'text-[#6B7280] hover:text-[#0A0A0A]'
              )}
            >
              Monthly
            </button>
            <button
              onClick={() => setAnnual(true)}
              className={cn(
                'text-sm font-medium px-4 py-2 rounded-full transition-all flex items-center gap-2',
                annual ? 'bg-[#0A0A0A] text-white' : 'text-[#6B7280] hover:text-[#0A0A0A]'
              )}
            >
              Annual
              <span className={cn(
                'text-[10px] font-semibold px-2 py-0.5 rounded-full',
                annual ? 'bg-emerald-500/20 text-emerald-300' : 'bg-emerald-500/10 text-emerald-600'
              )}>
                Save 20%
              </span>
            </button>
          </div>
        </motion.div>

        {/* Pricing cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 max-w-6xl mx-auto mb-16">
          {PLANS.map((plan, i) => (
            <motion.div
              key={plan.name}
              className={cn(
                'relative rounded-2xl border flex flex-col',
                plan.highlighted
                  ? 'border-[#6366F1]/30 bg-white shadow-xl shadow-[#6366F1]/10 overflow-visible pt-8 lg:pt-10 px-6 lg:px-8 pb-6 lg:pb-8'
                  : 'border-[#E5E5E5] bg-white overflow-hidden p-6 lg:p-8'
              )}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-100px' }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              whileHover={{
                y: -4,
                boxShadow: plan.highlighted
                  ? '0 25px 50px -12px rgba(99, 102, 241, 0.2)'
                  : '0 20px 40px -12px rgba(0, 0, 0, 0.08)',
                transition: { duration: 0.2 },
              }}
            >
              {/* Gradient accent line at top */}
              {plan.highlighted && (
                <motion.div
                  className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#6366F1] via-[#8B5CF6] to-[#F5C518]"
                  initial={{ scaleX: 0 }}
                  whileInView={{ scaleX: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.8, delay: 0.3 }}
                />
              )}

              {plan.badge && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-10">
                  <span className="text-xs font-semibold text-white bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] rounded-full px-4 py-1.5 shadow-lg shadow-[#6366F1]/25">
                    {plan.badge}
                  </span>
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-lg font-semibold text-[#0A0A0A] mb-1">{plan.name}</h3>
                <p className="text-sm text-[#6B7280] mb-4">{plan.description}</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-[#0A0A0A]">
                    {annual ? plan.annualPrice : plan.monthlyPrice}
                  </span>
                  <span className="text-sm text-[#9CA3AF]">
                    {annual && plan.annualPeriod ? plan.annualPeriod : plan.period}
                  </span>
                </div>
              </div>

              <ul className="space-y-3 mb-8 flex-1">
                {plan.features.map((feature, fi) => (
                  <motion.li
                    key={feature}
                    className="flex items-start gap-3"
                    initial={{ opacity: 0, x: -8 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.3, delay: 0.2 + fi * 0.05 }}
                  >
                    <Check className={cn(
                      'size-4 mt-0.5 shrink-0',
                      plan.highlighted ? 'text-[#6366F1]' : 'text-[#F5C518]'
                    )} />
                    <span className="text-sm text-[#6B7280]">{feature}</span>
                  </motion.li>
                ))}
              </ul>

              <Link
                href={plan.name === 'Enterprise' ? 'mailto:sales@altaviz.com' : '/signup'}
                className={cn(
                  'block text-center text-base font-semibold py-4 rounded-full transition-all',
                  plan.highlighted
                    ? 'text-white bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] hover:from-[#5558E6] hover:to-[#7C54E8] shadow-lg shadow-[#6366F1]/20'
                    : 'text-[#6B7280] border border-[#E5E5E5] hover:border-[#6366F1] hover:text-[#0A0A0A]'
                )}
              >
                {plan.cta}
              </Link>
            </motion.div>
          ))}
        </div>

        {/* Feature comparison table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.5 }}
        >
          <h3 className="text-xl font-bold text-[#0A0A0A] text-center mb-8">
            Full feature comparison
          </h3>

          <div className="rounded-2xl border border-[#E5E5E5] bg-white overflow-hidden max-w-5xl mx-auto shadow-sm">
            {/* Header */}
            <div className="grid grid-cols-4 border-b border-[#E5E5E5] bg-gradient-to-r from-[#FAFAFA] via-white to-[#FAFAFA]">
              <div className="p-4" />
              <div className="p-4 text-center text-sm font-semibold text-[#0A0A0A]">Pilot</div>
              <div className="p-4 text-center">
                <span className="text-sm font-semibold bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] bg-clip-text text-transparent">
                  Operations
                </span>
              </div>
              <div className="p-4 text-center text-sm font-semibold text-[#0A0A0A]">Enterprise</div>
            </div>

            {COMPARISON.map((section, idx) => (
              <AnimatedSection key={section.category} section={section} index={idx} />
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
