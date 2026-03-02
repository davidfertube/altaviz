'use client';

import { notFound } from 'next/navigation';
import Link from 'next/link';
import { use } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Activity,
  Shield,
  Bell,
  Leaf,
  Gauge,
  Wrench,
  FileCheck,
  Radio,
  Thermometer,
  AlertTriangle,
  BarChart3,
  Clock,
  Smartphone,
  MapPin,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] as const },
  },
};

interface Feature {
  icon: React.ElementType;
  title: string;
  description: string;
}

interface SolutionData {
  title: string;
  subtitle: string;
  description: string;
  features: Feature[];
  metrics: { label: string; value: string }[];
}

const SOLUTIONS: Record<string, SolutionData> = {
  'transmission-pipelines': {
    title: 'Gas Compression Fleets',
    subtitle: 'End-to-end monitoring for large-scale compressor operations',
    description:
      'Monitor thousands of compressors with ML-powered anomaly detection, AI-driven diagnostics, and automated work orders — all from a single dashboard.',
    features: [
      {
        icon: MapPin,
        title: 'Fleet-Wide Visibility',
        description:
          'Interactive map with real-time health status for every compressor across your fleet — 4,700+ units at a glance.',
      },
      {
        icon: Activity,
        title: 'Anomaly Detection',
        description:
          'Isolation Forest ML models detect unusual vibration patterns 24-48 hours before equipment failure.',
      },
      {
        icon: FileCheck,
        title: 'AI-Powered Diagnostics',
        description:
          'AI agents automatically trace root cause, check maintenance history, and generate work orders with parts and cost estimates.',
      },
      {
        icon: Gauge,
        title: 'Pressure & Temperature Monitoring',
        description:
          'Continuous sensor surveillance with configurable thresholds and automatic alert escalation.',
      },
    ],
    metrics: [
      { label: 'Early Warning', value: '48hr' },
      { label: 'Downtime Reduction', value: '61%' },
      { label: 'Annual Savings', value: '$2.1M' },
    ],
  },
  'gathering-systems': {
    title: 'Station Operations',
    subtitle: 'Multi-station monitoring and optimization',
    description:
      'Purpose-built for operators managing compressor stations across distributed basins. Real-time health monitoring for every unit at every station.',
    features: [
      {
        icon: Radio,
        title: 'SCADA Integration',
        description:
          'Seamless data ingestion from existing SCADA systems with PySpark ETL processing at scale.',
      },
      {
        icon: Thermometer,
        title: 'Temperature Drift Prediction',
        description:
          'Linear regression models predict hours until temperature warning and critical thresholds.',
      },
      {
        icon: AlertTriangle,
        title: 'Failure Pattern Detection',
        description:
          'Early identification of bearing wear, valve failures, and fouling through multi-sensor trend analysis.',
      },
      {
        icon: BarChart3,
        title: 'Station Analytics',
        description:
          'Hourly aggregation across 1hr, 4hr, and 24hr windows for comprehensive station visibility.',
      },
    ],
    metrics: [
      { label: 'Data Reduction', value: '83%' },
      { label: 'Compressors Monitored', value: '4,700+' },
      { label: 'Processing Time', value: '21s' },
    ],
  },
  'reliability-engineers': {
    title: 'Reliability Engineers',
    subtitle: 'Predictive maintenance intelligence at your fingertips',
    description:
      'Shift from reactive to predictive maintenance with ML models that estimate remaining useful life, detect anomalies, and prioritize work orders by risk.',
    features: [
      {
        icon: Clock,
        title: 'RUL Estimation',
        description:
          'Heuristic models calculate remaining useful life from sensor degradation patterns across your fleet.',
      },
      {
        icon: Activity,
        title: 'Vibration Analysis',
        description:
          'Isolation Forest anomaly detection on vibration data with configurable sensitivity thresholds.',
      },
      {
        icon: Wrench,
        title: 'Maintenance Prioritization',
        description:
          'Risk-scored alert queue that automatically escalates unacknowledged warnings to critical after 4 hours.',
      },
      {
        icon: BarChart3,
        title: 'Trend Analysis',
        description:
          'Time-series charts with radial gauges showing real-time and historical sensor performance.',
      },
    ],
    metrics: [
      { label: 'Failure Prediction', value: '48hr' },
      { label: 'Alert Accuracy', value: '94%' },
      { label: 'MTTR Reduction', value: '37%' },
    ],
  },
  'compliance-officers': {
    title: 'Compliance & Reporting',
    subtitle: 'Automated regulatory reporting and audit trails',
    description:
      'Meet EPA Subpart W and industry compliance requirements with automated emissions estimation, immutable audit logs, and one-click reporting.',
    features: [
      {
        icon: Leaf,
        title: 'EPA Subpart W',
        description:
          'Automated CH4 and CO2e emissions estimation using EPA emission factors and real-time sensor data.',
      },
      {
        icon: Shield,
        title: 'Audit Logging',
        description:
          'Every action logged to an immutable audit trail with user, timestamp, and change details for SOC 2 compliance.',
      },
      {
        icon: FileCheck,
        title: 'Compliance Dashboard',
        description:
          'Real-time compliance status across all regulatory frameworks with exportable audit reports.',
      },
      {
        icon: Bell,
        title: 'Regulatory Alerts',
        description:
          'Automatic notifications when emissions or operational metrics approach regulatory thresholds.',
      },
    ],
    metrics: [
      { label: 'Report Generation', value: '1-click' },
      { label: 'Compliance Coverage', value: '100%' },
      { label: 'Audit Prep Time', value: '-80%' },
    ],
  },
  'field-operations': {
    title: 'Field Technicians',
    subtitle: 'AI-generated work orders and mobile dashboards for crews in the field',
    description:
      'Empower field crews with AI-generated work orders, mobile-ready dashboards, and prioritized alert queues so technicians know exactly what to fix and why.',
    features: [
      {
        icon: Smartphone,
        title: 'Mobile-Ready Dashboards',
        description:
          'Responsive interface built for tablets and phones so field crews have full visibility on-site.',
      },
      {
        icon: Bell,
        title: 'Smart Alert Queue',
        description:
          'Prioritized alerts with acknowledge/resolve workflow and automatic escalation after 4 hours.',
      },
      {
        icon: MapPin,
        title: 'Station Mapping',
        description:
          'Interactive fleet map with GPS coordinates for every compressor station and real-time health indicators.',
      },
      {
        icon: Wrench,
        title: 'AI Work Orders',
        description:
          'AI agents generate work orders with parts list, cost estimate, and priority — technicians approve and act.',
      },
    ],
    metrics: [
      { label: 'Response Time', value: '-45%' },
      { label: 'First-Fix Rate', value: '89%' },
      { label: 'Daily Alerts', value: '419' },
    ],
  },
};

export default function SolutionPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const solution = SOLUTIONS[slug];

  if (!solution) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      {/* Hero */}
      <section className="pt-32 pb-16 sm:pt-40 sm:pb-20">
        <motion.div
          className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.p
            className="text-sm font-medium text-[#F5C518] uppercase tracking-wider mb-4"
            variants={itemVariants}
          >
            Solutions
          </motion.p>
          <motion.h1
            className="text-4xl sm:text-5xl md:text-6xl font-bold text-[#0A0A0A] leading-[1.08] tracking-tight mb-6"
            variants={itemVariants}
          >
            {solution.title}
          </motion.h1>
          <motion.p
            className="text-xl text-[#6B7280] mb-4"
            variants={itemVariants}
          >
            {solution.subtitle}
          </motion.p>
          <motion.p
            className="text-base text-[#9CA3AF] max-w-2xl mx-auto mb-10 leading-relaxed"
            variants={itemVariants}
          >
            {solution.description}
          </motion.p>
          <motion.div
            className="flex flex-col sm:flex-row items-center justify-center gap-3"
            variants={itemVariants}
          >
            <Button
              asChild
              size="lg"
              className="h-16 w-full sm:w-auto px-28 text-lg font-semibold rounded-full bg-[#0A0A0A] text-white shadow-lg shadow-[#0A0A0A]/15 hover:shadow-xl hover:bg-[#1A1A1A] transition-all border-0"
            >
              <Link href="/signup">
                Get Started
                <ArrowRight className="size-5 ml-1" />
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="h-16 px-16 text-lg font-medium rounded-full border-[#E5E5E5] text-[#6B7280] hover:text-[#0A0A0A] hover:border-[#F5C518] hover:bg-[#F5C518]/5 bg-transparent"
            >
              <Link href="/pricing">See Pricing</Link>
            </Button>
          </motion.div>
        </motion.div>
      </section>

      {/* Metrics */}
      <section className="pb-16">
        <motion.div
          className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
          variants={containerVariants}
        >
          <div className="grid grid-cols-3 gap-6">
            {solution.metrics.map((metric) => (
              <motion.div
                key={metric.label}
                className="text-center p-6 rounded-2xl bg-white border border-[#E5E5E5]/60"
                variants={itemVariants}
              >
                <p className="text-3xl sm:text-4xl font-bold text-[#0A0A0A] font-mono">
                  {metric.value}
                </p>
                <p className="text-sm text-[#6B7280] mt-1">{metric.label}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Features */}
      <section className="py-16 sm:py-24">
        <motion.div
          className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
          variants={containerVariants}
        >
          <motion.h2
            className="text-3xl sm:text-4xl font-bold text-[#0A0A0A] text-center mb-4"
            variants={itemVariants}
          >
            How Altaviz Helps
          </motion.h2>
          <motion.p
            className="text-base text-[#6B7280] text-center max-w-xl mx-auto mb-12"
            variants={itemVariants}
          >
            Purpose-built capabilities for {solution.title.toLowerCase()}.
          </motion.p>
          <div className="grid md:grid-cols-2 gap-6">
            {solution.features.map((feature) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={feature.title}
                  className="p-6 rounded-2xl bg-white border border-[#E5E5E5]/60 hover:border-[#F5C518]/30 hover:shadow-lg transition-all"
                  variants={itemVariants}
                >
                  <div className="w-10 h-10 rounded-xl bg-[#F5C518]/10 flex items-center justify-center mb-4">
                    <Icon className="size-5 text-[#D4A80F]" />
                  </div>
                  <h3 className="text-lg font-semibold text-[#0A0A0A] mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-[#6B7280] leading-relaxed">
                    {feature.description}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      </section>

      {/* CTA */}
      <section className="py-16 sm:py-24">
        <motion.div
          className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
          variants={containerVariants}
        >
          <motion.div
            className="p-10 sm:p-14 rounded-3xl bg-[#0A0A0A]"
            variants={itemVariants}
          >
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
              Ready to Get Started?
            </h2>
            <p className="text-base text-white/60 mb-8 max-w-md mx-auto">
              See how Altaviz transforms {solution.title.toLowerCase()} with ML-powered monitoring and predictive maintenance.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button
                asChild
                size="lg"
                className="h-16 px-28 text-lg font-semibold rounded-full bg-white text-[#0A0A0A] hover:bg-white/90 transition-all border-0"
              >
                <Link href="/signup">
                  Get Started
                  <ArrowRight className="size-5 ml-1" />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="h-16 px-16 text-lg font-medium rounded-full border-white/20 text-white/80 hover:text-white hover:border-white/40 bg-transparent"
              >
                <Link href="/pricing">See Pricing</Link>
              </Button>
            </div>
          </motion.div>
        </motion.div>
      </section>
    </div>
  );
}
