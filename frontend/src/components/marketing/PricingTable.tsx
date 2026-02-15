'use client';

import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

const PLANS = [
  {
    name: 'Pilot',
    price: '$0',
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
    price: '$499',
    period: '/month',
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
    price: 'Custom',
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

export default function PricingTable() {
  return (
    <section id="pricing" className="section-viewport relative py-24 sm:py-32">
      <div className="absolute inset-0 bg-[#FAF9F6]" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-[#1C1917] mb-4">
            Plans that scale with your fleet
          </h2>
          <p className="text-lg text-[#78716C] max-w-xl mx-auto">
            Start with a pilot. Scale to enterprise.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 max-w-5xl mx-auto">
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
                  <span className="text-4xl font-bold text-[#1C1917]">{plan.price}</span>
                  <span className="text-sm text-[#A8A29E]">{plan.period}</span>
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
      </div>
    </section>
  );
}
