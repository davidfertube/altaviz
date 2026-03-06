'use client';

import Link from 'next/link';
import { motion, useMotionValue, useTransform, animate, useInView } from 'framer-motion';
import {
  ShieldCheck,
  Clock,
  AlertTriangle,
  ArrowRight,
  Gauge,
  FileCheck,
  Leaf,
  BrainCircuit,
  ClipboardCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEffect, useRef } from 'react';

/* ------------------------------------------------------------------ */
/*  Animated counter                                                   */
/* ------------------------------------------------------------------ */
function AnimatedCounter({
  target,
  suffix = '',
  prefix = '',
  duration = 2,
  decimals = 0,
}: {
  target: number;
  suffix?: string;
  prefix?: string;
  duration?: number;
  decimals?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-40px' });
  const count = useMotionValue(0);
  const rounded = useTransform(count, (v) =>
    decimals > 0 ? v.toFixed(decimals) : Math.round(v).toString()
  );

  useEffect(() => {
    if (isInView) {
      animate(count, target, { duration, ease: 'easeOut' });
    }
  }, [isInView, count, target, duration]);

  return (
    <span ref={ref} className="tabular-nums">
      {prefix}
      <motion.span>{rounded}</motion.span>
      {suffix}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  ROI metrics                                                        */
/* ------------------------------------------------------------------ */
const ROI_METRICS = [
  {
    target: 61,
    suffix: '%',
    label: 'Failures Caught Early',
    icon: ShieldCheck,
  },
  {
    target: 48,
    suffix: 'hr',
    label: 'Warning Before Failure',
    icon: Clock,
  },
  {
    target: 2.1,
    suffix: 'M',
    prefix: '$',
    label: 'Avg Shutdown Cost',
    icon: AlertTriangle,
    decimals: 1,
  },
  {
    target: 4.7,
    suffix: 'K+',
    label: 'Assets Monitored',
    icon: Gauge,
    decimals: 1,
  },
];

/* ------------------------------------------------------------------ */
/*  Data flow mockup with animated pipeline                            */
/* ------------------------------------------------------------------ */
function DataFlowMockup() {
  return (
    <div className="relative w-full max-w-[640px]">
      {/* Ambient glow */}
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/8 via-[#F5C518]/6 to-blue-500/8 rounded-3xl blur-[80px]" />

      <motion.div
        className="relative"
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.9, ease: 'easeOut' }}
      >
        <div className="relative rounded-2xl overflow-hidden">
          <div className="absolute -inset-[1px] rounded-2xl bg-gradient-to-b from-white/[0.12] via-white/[0.04] to-transparent" />

          <div className="relative rounded-2xl bg-[#0C1018] p-6">
            {/* Top bar */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <motion.div
                  className="w-2 h-2 rounded-full bg-emerald-400"
                  animate={{ opacity: [1, 0.4, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
                <span className="text-[12px] font-medium text-white/50 tracking-wider uppercase font-mono">
                  Fleet Overview
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[11px] text-white/25 font-mono">Last sync 4s ago</span>
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                  <motion.div
                    className="w-1.5 h-1.5 rounded-full bg-emerald-400"
                    animate={{ opacity: [1, 0.4, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                  <span className="text-[10px] text-emerald-400 font-mono font-medium">LIVE</span>
                </div>
              </div>
            </div>

            {/* KPI strip */}
            <div className="grid grid-cols-4 gap-2 mb-4">
              {[
                { label: 'Uptime', value: '99.7%', color: 'text-emerald-400', bar: 'bg-emerald-400', pct: '99.7%' },
                { label: 'Fleet Health', value: '94%', color: 'text-[#F5C518]', bar: 'bg-[#F5C518]', pct: '94%' },
                { label: 'Avg RUL', value: '4.2d', color: 'text-blue-400', bar: 'bg-blue-400', pct: '70%' },
                { label: 'Alerts', value: '3', color: 'text-rose-400', bar: 'bg-rose-400', pct: '15%' },
              ].map((kpi) => (
                <div
                  key={kpi.label}
                  className="rounded-lg bg-white/[0.03] border border-white/[0.05] p-2.5"
                >
                  <p className="text-[9px] text-white/25 tracking-wide mb-1 uppercase">{kpi.label}</p>
                  <p className={`text-xl font-bold font-mono ${kpi.color} leading-none mb-1.5`}>{kpi.value}</p>
                  <div className="w-full h-[2px] rounded-full bg-white/[0.06]">
                    <motion.div
                      className={`h-full rounded-full ${kpi.bar}`}
                      initial={{ width: 0 }}
                      animate={{ width: kpi.pct }}
                      transition={{ duration: 1.2, delay: 0.5, ease: 'easeOut' }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Vibration trend chart (animated line drawing) */}
            <div className="rounded-lg bg-white/[0.02] border border-white/[0.05] p-3 mb-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[9px] text-white/25 tracking-wide uppercase">Vibration Trend — COMP-2847</p>
                <motion.span
                  className="text-[9px] text-rose-400/70 font-mono"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.5 }}
                >
                  +12% 24h
                </motion.span>
              </div>
              <svg viewBox="0 0 400 60" className="w-full h-[52px]">
                <defs>
                  <linearGradient id="heroGrad" x1="0" y1="0" x2="400" y2="0" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="rgba(245,197,24,0.7)" />
                    <stop offset="70%" stopColor="rgba(245,197,24,0.5)" />
                    <stop offset="100%" stopColor="rgba(239,68,68,0.8)" />
                  </linearGradient>
                  <linearGradient id="heroFill" x1="0" y1="0" x2="0" y2="60" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="rgba(245,197,24,0.10)" />
                    <stop offset="100%" stopColor="rgba(245,197,24,0)" />
                  </linearGradient>
                </defs>
                <line x1="0" y1="16" x2="400" y2="16" stroke="rgba(239,68,68,0.15)" strokeWidth="0.5" strokeDasharray="3 3" />
                <text x="398" y="14" textAnchor="end" className="text-[5px] fill-rose-400/30 font-mono">WARN</text>
                {/* Fill area — fades in while line draws */}
                <motion.path
                  d="M0,42 L40,40 L80,38 L120,39 L160,35 L200,32 L240,28 L280,25 L320,20 L360,16 L400,13 L400,60 L0,60 Z"
                  fill="url(#heroFill)"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.8, delay: 1.2 }}
                />
                {/* Animated line that draws itself */}
                <motion.path
                  d="M0,42 L40,40 L80,38 L120,39 L160,35 L200,32 L240,28 L280,25 L320,20 L360,16 L400,13"
                  fill="none"
                  stroke="url(#heroGrad)"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 1.8, delay: 0.6, ease: 'easeOut' }}
                />
                {/* Warning markers — appear when line crosses threshold */}
                <motion.circle
                  cx="360" cy="16" r="3" fill="none" stroke="#EF4444" strokeWidth="0.8"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 2.0 }}
                />
                <motion.circle
                  cx="360" cy="16" r="1.5" fill="#EF4444"
                  style={{ filter: 'drop-shadow(0 0 3px rgba(239,68,68,0.5))' }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 2.0 }}
                />
                <motion.circle
                  cx="400" cy="13" r="2.5"
                  fill="#EF4444"
                  style={{ filter: 'drop-shadow(0 0 3px rgba(239,68,68,0.5))' }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 2.2 }}
                />
              </svg>
            </div>

            {/* AI Response Pipeline — sequential reveal */}
            <motion.div
              className="rounded-lg bg-white/[0.02] border border-white/[0.05] p-3 mb-3"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 2.2, duration: 0.4 }}
            >
              <p className="text-[9px] text-white/25 tracking-wide uppercase mb-2.5">AI Response Pipeline</p>
              <div className="flex items-center gap-1.5">
                <motion.div
                  className="flex-1 flex items-center gap-1.5 rounded-md bg-amber-500/10 border border-amber-500/20 px-2 py-1.5"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 2.4, duration: 0.3, type: 'spring', stiffness: 300, damping: 20 }}
                >
                  <AlertTriangle className="size-3 shrink-0 text-amber-400" />
                  <span className="text-[9px] font-mono text-amber-400">Anomaly</span>
                </motion.div>
                <motion.div
                  className="shrink-0"
                  initial={{ opacity: 0, scaleX: 0 }}
                  animate={{ opacity: 0.3, scaleX: 1 }}
                  transition={{ delay: 2.6, duration: 0.2 }}
                >
                  <ArrowRight className="size-3 text-white" />
                </motion.div>
                <motion.div
                  className="flex-1 flex items-center gap-1.5 rounded-md bg-purple-500/10 border border-purple-500/20 px-2 py-1.5"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 2.8, duration: 0.3, type: 'spring', stiffness: 300, damping: 20 }}
                >
                  <BrainCircuit className="size-3 shrink-0 text-purple-400" />
                  <span className="text-[9px] font-mono text-purple-400">Investigate</span>
                </motion.div>
                <motion.div
                  className="shrink-0"
                  initial={{ opacity: 0, scaleX: 0 }}
                  animate={{ opacity: 0.3, scaleX: 1 }}
                  transition={{ delay: 3.0, duration: 0.2 }}
                >
                  <ArrowRight className="size-3 text-white" />
                </motion.div>
                <motion.div
                  className="flex-1 flex items-center gap-1.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 px-2 py-1.5"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 3.2, duration: 0.3, type: 'spring', stiffness: 300, damping: 20 }}
                >
                  <ClipboardCheck className="size-3 shrink-0 text-emerald-400" />
                  <span className="text-[9px] font-mono text-emerald-400">Work Order</span>
                </motion.div>
              </div>
            </motion.div>

            {/* Compressor fleet status */}
            <div className="rounded-lg bg-white/[0.02] border border-white/[0.05] p-3">
              <div className="flex items-center justify-between mb-2.5">
                <p className="text-[9px] text-white/25 tracking-wide uppercase">Pipeline Fleet</p>
                <p className="text-[9px] text-white/20 font-mono">6 active</p>
              </div>
              <div className="grid grid-cols-6 gap-2">
                {[
                  { id: 'COMP-001', health: 98, status: 'healthy' as const },
                  { id: 'COMP-002', health: 42, status: 'critical' as const },
                  { id: 'COMP-003', health: 95, status: 'healthy' as const },
                  { id: 'COMP-004', health: 91, status: 'healthy' as const },
                  { id: 'COMP-005', health: 73, status: 'warning' as const },
                  { id: 'COMP-006', health: 88, status: 'healthy' as const },
                ].map((comp) => {
                  const colors = {
                    healthy: '#10B981',
                    warning: '#F59E0B',
                    critical: '#EF4444',
                  };
                  const color = colors[comp.status];
                  return (
                    <div key={comp.id} className="text-center">
                      <div className="relative w-10 h-10 mx-auto mb-1">
                        <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                          <circle cx="18" cy="18" r="15" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="2.5" />
                          <circle
                            cx="18" cy="18" r="15" fill="none"
                            stroke={color}
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeDasharray={`${comp.health * 0.942} 100`}
                          />
                        </svg>
                        <span className="absolute inset-0 flex items-center justify-center text-[8px] font-mono text-white/40">
                          {comp.health}
                        </span>
                      </div>
                      <p className="text-[8px] text-white/20 font-mono">{comp.id}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Stagger variants                                                   */
/* ------------------------------------------------------------------ */
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
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

/* ================================================================== */
/*  Hero Section                                                      */
/* ================================================================== */
export default function Hero() {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-[#FAFAFA]">
        <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-[#F5C518]/8 rounded-full blur-[128px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-[#2563EB]/6 rounded-full blur-[128px]" />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(28,25,23,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(28,25,23,0.08) 1px, transparent 1px)',
            backgroundSize: '64px 64px',
          }}
        />
      </div>

      {/* Content: split layout */}
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-16 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left: Text */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <motion.h1
              className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-[#0A0A0A] leading-[1.05] tracking-tight mb-5"
              variants={itemVariants}
            >
              Predict Failures Early.
            </motion.h1>

            <motion.p
              className="text-lg text-[#6B7280] max-w-lg mb-8 leading-relaxed"
              variants={itemVariants}
            >
              AI agents that catch pipeline failures 48 hours early.
            </motion.p>

            {/* CTAs */}
            <motion.div
              className="flex flex-col sm:flex-row items-start gap-3 mb-8"
              variants={itemVariants}
            >
              <Button
                asChild
                size="lg"
                className="h-16 w-full sm:w-auto px-28 text-lg font-semibold rounded-full bg-[#F5C518] text-[#0A0A0A] shadow-lg shadow-[#F5C518]/25 hover:shadow-xl hover:bg-[#FFD84D] transition-all border-0"
              >
                <Link href="/dashboard">
                  Try Demo
                  <ArrowRight className="size-5 ml-2" />
                </Link>
              </Button>
            </motion.div>

            {/* Trust badges */}
            <motion.div className="flex flex-wrap items-center gap-4 mb-10" variants={itemVariants}>
              {[
                { icon: ShieldCheck, label: 'SOC 2 Type II' },
                { icon: FileCheck, label: 'PHMSA Aligned' },
                { icon: Leaf, label: 'EPA Subpart W' },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-1.5 text-[11px] text-[#9CA3AF]">
                  <Icon className="size-3.5 text-[#F5C518]/60" />
                  <span>{label}</span>
                </div>
              ))}
            </motion.div>

            {/* ROI metrics */}
            <motion.div
              className="grid grid-cols-2 sm:grid-cols-4 gap-3"
              variants={itemVariants}
            >
              {ROI_METRICS.map(({ target, suffix, prefix, label, icon: Icon, ...rest }, idx) => (
                <div
                  key={label}
                  className="relative flex flex-col items-center text-center rounded-xl border border-[#E5E5E5]/80 bg-white/60 backdrop-blur-sm px-4 py-4 shadow-sm"
                >
                  <Icon className="size-4 text-[#F5C518] mb-2" />
                  <span className="text-2xl font-bold font-mono text-[#0A0A0A] leading-none">
                    <AnimatedCounter target={target} suffix={suffix} prefix={prefix} duration={2 + idx * 0.3} decimals={'decimals' in rest ? (rest as { decimals: number }).decimals : 0} />
                  </span>
                  <p className="text-[11px] text-[#9CA3AF] mt-1">{label}</p>
                </div>
              ))}
            </motion.div>
          </motion.div>

          {/* Right: Animated Data Flow Mockup */}
          <motion.div
            className="hidden lg:flex items-center justify-center"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.3, ease: 'easeOut' }}
          >
            <DataFlowMockup />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
