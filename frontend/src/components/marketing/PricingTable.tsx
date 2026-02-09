'use client';

import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

const PLANS = [
  {
    name: 'Free',
    price: '$0',
    period: 'forever',
    description: 'Perfect for evaluating Altaviz with a small fleet.',
    features: [
      'Up to 2 compressors',
      '1-hour aggregation window',
      'Basic threshold alerts',
      'Fleet overview dashboard',
      '7-day data retention',
      'Community support',
    ],
    cta: 'Start Free',
    highlighted: false,
  },
  {
    name: 'Pro',
    price: '$49',
    period: '/month',
    description: 'For growing operations that need deeper monitoring.',
    features: [
      'Up to 20 compressors',
      '1hr, 4hr, 24hr windows',
      'Priority alerts + SMS',
      'Full analytics dashboard',
      '90-day data retention',
      'API access',
      'Email support',
    ],
    cta: 'Start Pro Trial',
    highlighted: true,
    badge: 'Most Popular',
  },
  {
    name: 'Enterprise',
    price: '$199',
    period: '/month',
    description: 'For large fleets with ML-powered predictions.',
    features: [
      'Unlimited compressors',
      'All aggregation windows',
      'Priority + SMS + webhooks',
      'ML failure predictions',
      '1-year data retention',
      'Bulk export API',
      'Custom integrations',
      'Dedicated support',
    ],
    cta: 'Contact Sales',
    highlighted: false,
  },
];

export default function PricingTable() {
  return (
    <section id="pricing" className="relative py-24 sm:py-32">
      <div className="absolute inset-0 bg-[#0A0E17]" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#6C5CE7]/5 to-transparent" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Simple, transparent pricing
          </h2>
          <p className="text-lg text-white/40 max-w-xl mx-auto">
            Start free and scale as your fleet grows. No hidden fees.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 max-w-5xl mx-auto">
          {PLANS.map((plan, i) => (
            <motion.div
              key={plan.name}
              className={cn(
                'relative rounded-2xl border p-6 lg:p-8 flex flex-col',
                plan.highlighted
                  ? 'border-[#1F77B4]/50 bg-gradient-to-b from-[#1F77B4]/10 to-transparent shadow-xl shadow-[#1F77B4]/10'
                  : 'border-white/10 bg-white/[0.02]'
              )}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-100px' }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
            >
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="text-xs font-semibold text-white bg-gradient-to-r from-[#1F77B4] to-[#6C5CE7] rounded-full px-4 py-1">
                    {plan.badge}
                  </span>
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-lg font-semibold text-white mb-1">{plan.name}</h3>
                <p className="text-sm text-white/40 mb-4">{plan.description}</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-white">{plan.price}</span>
                  <span className="text-sm text-white/40">{plan.period}</span>
                </div>
              </div>

              <ul className="space-y-3 mb-8 flex-1">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <Check className="size-4 text-[#2CA02C] mt-0.5 shrink-0" />
                    <span className="text-sm text-white/60">{feature}</span>
                  </li>
                ))}
              </ul>

              <Link
                href="/dashboard"
                className={cn(
                  'block text-center text-sm font-semibold py-3 rounded-full transition-all',
                  plan.highlighted
                    ? 'text-white bg-gradient-to-r from-[#1F77B4] to-[#6C5CE7] hover:opacity-90 shadow-lg shadow-[#1F77B4]/25'
                    : 'text-white/70 border border-white/20 hover:border-white/40 hover:text-white'
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
