'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ShieldCheck,
  BarChart3,
  HardHat,
  FileCheck,
  MapPin,
  ArrowRight,
  Activity,
  Clock,
  TrendingUp,
  Gauge,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Animation variants                                                 */
/* ------------------------------------------------------------------ */
const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] as const },
  },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.1 },
  },
};

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */
const VALUES = [
  {
    icon: ShieldCheck,
    title: 'Safety First',
    description:
      'Every feature we build starts with the same question: does this make pipeline operations safer? Public safety and environmental protection are non-negotiable priorities in everything we do.',
  },
  {
    icon: BarChart3,
    title: 'Data-Driven',
    description:
      'Decisions should come from data, not gut feel. We turn raw SCADA telemetry into actionable intelligence so operators know exactly where to focus before problems escalate.',
  },
  {
    icon: HardHat,
    title: 'Operator-Built',
    description:
      'Our team has spent years in control rooms and field offices. Altaviz is built by people who understand the reality of running pipeline infrastructure day-to-day.',
  },
  {
    icon: FileCheck,
    title: 'Regulatory Aligned',
    description:
      'Compliance is not an afterthought. Automated reporting for 49 CFR 192/195, PHMSA Mega Rule, and EPA Subpart W is built into the platform from the ground up.',
  },
];

const STATS = [
  {
    value: '2,400+',
    label: 'Miles Monitored',
    icon: Activity,
  },
  {
    value: '48hr',
    label: 'Advance Warning',
    icon: Clock,
  },
  {
    value: '99.7%',
    label: 'Platform Uptime',
    icon: TrendingUp,
  },
  {
    value: '40%',
    label: 'Fewer Shutdowns',
    icon: Gauge,
  },
];

/* ================================================================== */
/*  About Page                                                         */
/* ================================================================== */
export default function AboutPage() {
  return (
    <div className="pt-20">
      {/* ------------------------------------------------------------ */}
      {/*  Hero                                                         */}
      {/* ------------------------------------------------------------ */}
      <section className="relative py-24 sm:py-32 overflow-hidden">
        <div className="absolute inset-0 bg-[#FAF9F6]">
          <div className="absolute top-1/4 left-1/3 w-[500px] h-[500px] bg-[#C4A77D]/8 rounded-full blur-[128px]" />
          <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-[#A68B5B]/6 rounded-full blur-[128px]" />
        </div>

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
          >
            <motion.p
              className="text-[11px] font-semibold text-[#C4A77D] uppercase tracking-[0.15em] mb-4"
              variants={fadeUp}
            >
              About Altaviz
            </motion.p>
            <motion.h1
              className="text-4xl sm:text-5xl lg:text-6xl font-bold text-[#1C1917] leading-[1.08] tracking-tight mb-6"
              variants={fadeUp}
            >
              Building the future of{' '}
              <span className="text-[#C4A77D]">pipeline integrity</span>
            </motion.h1>
            <motion.p
              className="text-lg sm:text-xl text-[#78716C] max-w-2xl mx-auto leading-relaxed"
              variants={fadeUp}
            >
              Altaviz was founded to modernize how oil and gas operators protect
              their pipeline infrastructure. We believe predictive intelligence
              should be accessible to every operator, not just the largest
              enterprises.
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* ------------------------------------------------------------ */}
      {/*  The Problem                                                  */}
      {/* ------------------------------------------------------------ */}
      <section className="relative py-24 sm:py-32">
        <div className="absolute inset-0 bg-[#0C1018]" />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-start">
            {/* Left: Problem */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-100px' }}
              transition={{ duration: 0.5 }}
            >
              <p className="text-[11px] font-semibold text-[#C4A77D] uppercase tracking-[0.15em] mb-3">
                The Problem
              </p>
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
                Pipeline failures happen{' '}
                <span className="text-[#C4A77D]">between inspections</span>
              </h2>
              <div className="space-y-4 text-white/60 text-base leading-relaxed">
                <p>
                  The United States has over 2.6 million miles of pipeline
                  infrastructure, much of it installed decades ago. PHMSA data
                  shows the average significant incident costs{' '}
                  <span className="text-white font-semibold font-mono">$2.1M</span>{' '}
                  in property damage alone, before factoring in environmental
                  remediation and regulatory penalties.
                </p>
                <p>
                  Most operators still rely on periodic In-Line Inspection (ILI)
                  runs and manual spreadsheets to track integrity. Inspections
                  happen on 5-7 year cycles. Between inspections, degradation
                  goes undetected. Current tools are on-premise, expensive, and
                  completely disconnected from real-time SCADA telemetry.
                </p>
                <p>
                  When a pressure excursion or vibration anomaly appears at 2 AM,
                  operators get a threshold alarm after the problem is already
                  underway. By then, the options are limited: emergency shutdown,
                  costly repairs, or worse.
                </p>
              </div>
            </motion.div>

            {/* Right: Solution */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-100px' }}
              transition={{ duration: 0.5, delay: 0.15 }}
            >
              <p className="text-[11px] font-semibold text-[#C4A77D] uppercase tracking-[0.15em] mb-3">
                Our Approach
              </p>
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
                Catch degradation{' '}
                <span className="text-[#C4A77D]">before the alarm</span>
              </h2>
              <div className="space-y-4 text-white/60 text-base leading-relaxed">
                <p>
                  Altaviz connects directly to your existing SCADA systems and
                  historians. Our PySpark pipeline ingests real-time sensor data
                  through a Bronze/Silver/Gold medallion architecture, feeding
                  ML models that learn the healthy baseline of every pipeline
                  segment in your network.
                </p>
                <p>
                  Isolation Forest anomaly detection flags degradation patterns
                  24-48 hours before traditional threshold alerts fire.
                  Temperature drift prediction, remaining useful life estimation,
                  and EPA Subpart W emissions calculations run automatically on
                  every data window.
                </p>
                <p>
                  Compliance reporting for 49 CFR 192/195 and the PHMSA Mega Rule
                  is automated, not bolted on. MAOP reconfirmation tracking,
                  HCA/MCA assessment scheduling, and exportable audit logs are
                  built into the platform from day one.
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ */}
      {/*  Values                                                       */}
      {/* ------------------------------------------------------------ */}
      <section className="relative py-24 sm:py-32">
        <div className="absolute inset-0 bg-[#FAF9F6]" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.5 }}
          >
            <p className="text-[11px] font-semibold text-[#C4A77D] uppercase tracking-[0.15em] mb-3">
              Our Values
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold text-[#1C1917] mb-4">
              What drives us
            </h2>
            <p className="text-lg text-[#78716C] max-w-2xl mx-auto">
              Every line of code, every model, every dashboard widget starts with
              these four principles.
            </p>
          </motion.div>

          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
          >
            {VALUES.map(({ icon: Icon, title, description }) => (
              <motion.div
                key={title}
                className="rounded-2xl border border-[#E7E0D5] bg-white p-6 hover:border-[#C4A77D]/40 hover:shadow-lg hover:shadow-[#C4A77D]/5 transition-all"
                variants={fadeUp}
              >
                <div className="w-12 h-12 rounded-xl bg-[#C4A77D]/10 flex items-center justify-center mb-4">
                  <Icon className="size-6 text-[#A68B5B]" />
                </div>
                <h3 className="text-lg font-semibold text-[#1C1917] mb-2">
                  {title}
                </h3>
                <p className="text-sm text-[#78716C] leading-relaxed">
                  {description}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ------------------------------------------------------------ */}
      {/*  By the Numbers                                               */}
      {/* ------------------------------------------------------------ */}
      <section className="relative py-24 sm:py-32">
        <div className="absolute inset-0 bg-[#F5F0E8]" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.5 }}
          >
            <p className="text-[11px] font-semibold text-[#C4A77D] uppercase tracking-[0.15em] mb-3">
              By the Numbers
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold text-[#1C1917]">
              Proven impact across pipeline networks
            </h2>
          </motion.div>

          <motion.div
            className="grid grid-cols-2 lg:grid-cols-4 gap-6"
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
          >
            {STATS.map(({ value, label, icon: Icon }) => (
              <motion.div
                key={label}
                className="rounded-2xl border border-[#E7E0D5] bg-white p-8 text-center hover:border-[#C4A77D]/40 hover:shadow-lg hover:shadow-[#C4A77D]/5 transition-all"
                variants={fadeUp}
              >
                <div className="w-12 h-12 rounded-xl bg-[#C4A77D]/10 flex items-center justify-center mx-auto mb-4">
                  <Icon className="size-6 text-[#A68B5B]" />
                </div>
                <p className="text-3xl sm:text-4xl font-bold font-mono text-[#1C1917] mb-2">
                  {value}
                </p>
                <p className="text-sm text-[#78716C]">{label}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ------------------------------------------------------------ */}
      {/*  Location                                                     */}
      {/* ------------------------------------------------------------ */}
      <section className="relative py-16 sm:py-20">
        <div className="absolute inset-0 bg-[#FAF9F6]" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="flex flex-col sm:flex-row items-center justify-center gap-4 text-center sm:text-left"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.5 }}
          >
            <div className="w-12 h-12 rounded-xl bg-[#C4A77D]/10 flex items-center justify-center shrink-0">
              <MapPin className="size-6 text-[#A68B5B]" />
            </div>
            <div>
              <p className="text-lg font-semibold text-[#1C1917]">
                Houston, Texas
              </p>
              <p className="text-sm text-[#78716C]">
                Based in the energy capital of the world. Close to the operators,
                pipelines, and regulatory bodies that shape our industry.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ------------------------------------------------------------ */}
      {/*  CTA                                                          */}
      {/* ------------------------------------------------------------ */}
      <section className="relative py-24 sm:py-32">
        <div className="absolute inset-0 bg-[#0C1018]" />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
              Ready to modernize your{' '}
              <span className="text-[#C4A77D]">integrity program?</span>
            </h2>
            <p className="text-lg text-white/50 max-w-2xl mx-auto mb-10">
              Talk to our engineering team about connecting Altaviz to your
              existing SCADA infrastructure. Most integrations are live within
              one week.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 text-base font-semibold text-[#1C1917] bg-white hover:bg-white/90 transition-colors px-8 py-3.5 rounded-full"
              >
                Contact Sales
                <ArrowRight className="size-4" />
              </Link>
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 text-base font-medium text-white/80 hover:text-white border border-white/20 hover:border-white/40 transition-all px-8 py-3.5 rounded-full"
              >
                Get Started
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
