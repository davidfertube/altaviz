'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Minus } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

const PLANS = [
  {
    name: 'Pilot',
    monthlyPrice: '$0',
    annualPrice: '$0',
    period: '30-day trial',
    description: 'Evaluate Altaviz on a small segment of your network.',
    features: [
      'Up to 5 pipelines',
      '1-hour aggregation window',
      'Threshold-based alerts',
      'Fleet overview dashboard',
      '30-day data retention',
      'Email support',
    ],
    cta: 'Start Pilot',
    highlighted: false,
  },
  {
    name: 'Operations',
    monthlyPrice: '$499',
    annualPrice: '$399',
    period: '/month',
    annualPeriod: '/mo billed annually',
    description: 'Full monitoring with ML predictions for growing operations.',
    features: [
      'Up to 50 pipelines',
      '1hr, 4hr, 24hr windows',
      'ML failure predictions',
      'SMS + webhook alerts',
      '1-year data retention',
      'API access',
      'Priority support',
    ],
    cta: 'Start Trial',
    highlighted: true,
    badge: 'Most Popular',
  },
  {
    name: 'Enterprise',
    monthlyPrice: 'Custom',
    annualPrice: 'Custom',
    period: 'annual contract',
    description: 'Unlimited scale with SSO, SLA, and dedicated support.',
    features: [
      'Unlimited pipelines',
      'All aggregation windows',
      'Everything in Operations',
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
    category: 'Monitoring',
    features: [
      { name: 'Pipelines', pilot: '5', operations: '50', enterprise: 'Unlimited' },
      { name: 'Aggregation windows', pilot: '1hr', operations: '1hr, 4hr, 24hr', enterprise: 'All + custom' },
      { name: 'Real-time dashboard', pilot: true, operations: true, enterprise: true },
      { name: 'Data retention', pilot: '30 days', operations: '1 year', enterprise: 'Unlimited' },
    ],
  },
  {
    category: 'Intelligence',
    features: [
      { name: 'Threshold alerts', pilot: true, operations: true, enterprise: true },
      { name: 'ML anomaly detection', pilot: false, operations: true, enterprise: true },
      { name: 'Temperature drift prediction', pilot: false, operations: true, enterprise: true },
      { name: 'RUL estimation', pilot: false, operations: true, enterprise: true },
      { name: 'Custom model training', pilot: false, operations: false, enterprise: true },
    ],
  },
  {
    category: 'Compliance',
    features: [
      { name: 'EPA Subpart W tracking', pilot: false, operations: true, enterprise: true },
      { name: 'PHMSA reporting', pilot: false, operations: true, enterprise: true },
      { name: 'Audit logs', pilot: false, operations: true, enterprise: true },
      { name: 'Compliance exports', pilot: false, operations: false, enterprise: true },
    ],
  },
  {
    category: 'Support & Security',
    features: [
      { name: 'Email support', pilot: true, operations: true, enterprise: true },
      { name: 'Priority support', pilot: false, operations: true, enterprise: true },
      { name: 'Dedicated CSM', pilot: false, operations: false, enterprise: true },
      { name: 'SSO / SAML', pilot: false, operations: false, enterprise: true },
      { name: 'SLA guarantee', pilot: false, operations: false, enterprise: true },
      { name: 'API access', pilot: false, operations: true, enterprise: true },
    ],
  },
];

function CellValue({ value }: { value: boolean | string }) {
  if (typeof value === 'string') {
    return <span className="text-sm text-[#1C1917] font-medium">{value}</span>;
  }
  return value ? (
    <Check className="size-4 text-[#C4A77D] mx-auto" />
  ) : (
    <Minus className="size-4 text-[#E7E0D5] mx-auto" />
  );
}

export default function PricingTable() {
  const [annual, setAnnual] = useState(false);

  return (
    <section id="pricing" className="relative py-24 sm:py-32">
      <div className="absolute inset-0 bg-[#FAF9F6]" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          className="text-center mb-10"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.5 }}
        >
          <p className="text-[11px] font-semibold text-[#C4A77D] uppercase tracking-[0.15em] mb-3">Pricing</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-[#1C1917] mb-4">
            Plans that scale with your fleet
          </h2>
          <p className="text-lg text-[#78716C] max-w-xl mx-auto mb-8">
            Start with a pilot. Scale to enterprise.
          </p>

          {/* Annual/Monthly toggle */}
          <div className="inline-flex items-center gap-3 bg-white rounded-full border border-[#E7E0D5] p-1">
            <button
              onClick={() => setAnnual(false)}
              className={cn(
                'text-sm font-medium px-4 py-2 rounded-full transition-all',
                !annual ? 'bg-[#1C1917] text-white' : 'text-[#78716C] hover:text-[#1C1917]'
              )}
            >
              Monthly
            </button>
            <button
              onClick={() => setAnnual(true)}
              className={cn(
                'text-sm font-medium px-4 py-2 rounded-full transition-all flex items-center gap-2',
                annual ? 'bg-[#1C1917] text-white' : 'text-[#78716C] hover:text-[#1C1917]'
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
                'relative rounded-2xl border p-6 lg:p-8 flex flex-col',
                plan.highlighted
                  ? 'border-[#C4A77D]/50 bg-white shadow-xl shadow-[#C4A77D]/10'
                  : 'border-[#E7E0D5] bg-white'
              )}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-100px' }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
            >
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="text-xs font-semibold text-white bg-[#C4A77D] rounded-full px-4 py-1">
                    {plan.badge}
                  </span>
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-lg font-semibold text-[#1C1917] mb-1">{plan.name}</h3>
                <p className="text-sm text-[#78716C] mb-4">{plan.description}</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-[#1C1917]">
                    {annual ? plan.annualPrice : plan.monthlyPrice}
                  </span>
                  <span className="text-sm text-[#A8A29E]">
                    {annual && plan.annualPeriod ? plan.annualPeriod : plan.period}
                  </span>
                </div>
              </div>

              <ul className="space-y-3 mb-8 flex-1">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <Check className="size-4 text-[#C4A77D] mt-0.5 shrink-0" />
                    <span className="text-sm text-[#78716C]">{feature}</span>
                  </li>
                ))}
              </ul>

              <Link
                href="/signup"
                className={cn(
                  'block text-center text-sm font-semibold py-3 rounded-full transition-all',
                  plan.highlighted
                    ? 'text-white bg-[#1C1917] hover:bg-[#2D2D2D] shadow-lg shadow-[#1C1917]/15'
                    : 'text-[#78716C] border border-[#E7E0D5] hover:border-[#C4A77D] hover:text-[#1C1917]'
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
          <h3 className="text-xl font-bold text-[#1C1917] text-center mb-8">
            Full feature comparison
          </h3>

          <div className="rounded-2xl border border-[#E7E0D5] bg-white overflow-hidden max-w-5xl mx-auto">
            {/* Header */}
            <div className="grid grid-cols-4 border-b border-[#E7E0D5] bg-[#FAF9F6]">
              <div className="p-4" />
              <div className="p-4 text-center text-sm font-semibold text-[#1C1917]">Pilot</div>
              <div className="p-4 text-center text-sm font-semibold text-[#C4A77D]">Operations</div>
              <div className="p-4 text-center text-sm font-semibold text-[#1C1917]">Enterprise</div>
            </div>

            {COMPARISON.map((section) => (
              <div key={section.category}>
                {/* Category header */}
                <div className="px-4 py-3 bg-[#FAF9F6]/50 border-b border-[#E7E0D5]">
                  <span className="text-xs font-semibold text-[#A8A29E] uppercase tracking-wider">
                    {section.category}
                  </span>
                </div>
                {/* Feature rows */}
                {section.features.map((feature, i) => (
                  <div
                    key={feature.name}
                    className={cn(
                      'grid grid-cols-4 items-center',
                      i < section.features.length - 1 && 'border-b border-[#E7E0D5]/50'
                    )}
                  >
                    <div className="px-4 py-3 text-sm text-[#78716C]">{feature.name}</div>
                    <div className="px-4 py-3 text-center"><CellValue value={feature.pilot} /></div>
                    <div className="px-4 py-3 text-center"><CellValue value={feature.operations} /></div>
                    <div className="px-4 py-3 text-center"><CellValue value={feature.enterprise} /></div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
