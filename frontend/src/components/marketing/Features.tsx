'use client';

import { motion } from 'framer-motion';
import { Activity, Bell, BarChart3, Shield, Cpu, Gauge } from 'lucide-react';
import GlassCard from './GlassCard';

const FEATURES = [
  {
    icon: Activity,
    title: 'Real-Time Monitoring',
    description: 'Track vibration, temperature, pressure, and flow metrics across your entire fleet with 10-minute sensor intervals and hourly aggregations.',
    gradient: 'from-[#1F77B4] to-[#4A9BD9]',
  },
  {
    icon: Bell,
    title: 'Intelligent Alerts',
    description: 'Multi-threshold alerting with 4-sigma outlier detection. Get warnings before critical failures happen, not after.',
    gradient: 'from-[#FF7F0E] to-[#FFB347]',
  },
  {
    icon: BarChart3,
    title: 'Fleet Analytics',
    description: 'Rolling window aggregations (1hr, 4hr, 24hr) with rate-of-change analysis. Spot degradation trends across your entire fleet.',
    gradient: 'from-[#2CA02C] to-[#47C747]',
  },
  {
    icon: Shield,
    title: 'Data Quality Assurance',
    description: 'Automated data quality checks for freshness, completeness, consistency, and accuracy with 15-minute SLA monitoring.',
    gradient: 'from-[#6C5CE7] to-[#B07CD8]',
  },
  {
    icon: Cpu,
    title: 'ML-Powered Predictions',
    description: 'LSTM models predict Remaining Useful Life (RUL) and failure probability, enabling planned maintenance over emergency repairs.',
    gradient: 'from-[#D62728] to-[#E85D5E]',
  },
  {
    icon: Gauge,
    title: 'Scalable Architecture',
    description: 'PySpark ETL with Delta Lake processes 10,000+ readings daily. Azure-native with Fabric integration for enterprise scale.',
    gradient: 'from-[#1F77B4] to-[#6C5CE7]',
  },
];

export default function Features() {
  return (
    <section id="features" className="relative py-24 sm:py-32">
      <div className="absolute inset-0 bg-[#0A0E17]" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Everything you need to prevent downtime
          </h2>
          <p className="text-lg text-white/40 max-w-2xl mx-auto">
            From sensor data ingestion to ML-powered failure prediction, Altaviz provides
            end-to-end monitoring for natural gas compression equipment.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-100px' }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
            >
              <GlassCard className="h-full">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-4`}>
                  <feature.icon className="size-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-white/40 leading-relaxed">
                  {feature.description}
                </p>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
