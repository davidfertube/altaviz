'use client';

import Link from 'next/link';
import { motion, useMotionValue, useTransform, animate, useInView } from 'framer-motion';
import {
  ShieldCheck,
  Clock,
  AlertTriangle,
  ArrowRight,
  Eye,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
    label: 'Incidents Preventable',
    icon: ShieldCheck,
  },
  {
    target: 48,
    suffix: 'hr',
    label: 'Advance Warning',
    icon: Clock,
  },
  {
    target: 2.1,
    suffix: 'M',
    prefix: '$',
    label: 'Avg Incident Cost',
    icon: AlertTriangle,
    decimals: 1,
  },
];

/* ------------------------------------------------------------------ */
/*  Pipeline network topology nodes                                    */
/* ------------------------------------------------------------------ */
const NODES = [
  { id: 'S1', label: 'Station Alpha', x: 60, y: 35, status: 'healthy' as const },
  { id: 'S2', label: 'Station Beta', x: 200, y: 20, status: 'healthy' as const },
  { id: 'S3', label: 'Station Gamma', x: 340, y: 45, status: 'warning' as const },
  { id: 'P1', label: 'PL-001', x: 130, y: 80, status: 'healthy' as const },
  { id: 'P2', label: 'PL-002', x: 270, y: 75, status: 'critical' as const },
  { id: 'P3', label: 'PL-003', x: 130, y: 130, status: 'healthy' as const },
  { id: 'P4', label: 'PL-004', x: 270, y: 135, status: 'healthy' as const },
  { id: 'H', label: 'Hub', x: 200, y: 105, status: 'healthy' as const },
];

const EDGES = [
  ['S1', 'P1'], ['S2', 'P1'], ['S2', 'P2'], ['S3', 'P2'],
  ['P1', 'H'], ['P2', 'H'], ['H', 'P3'], ['H', 'P4'],
];

const STATUS_COLORS = {
  healthy: { dot: '#10B981', glow: 'rgba(16,185,129,0.4)', ring: 'rgba(16,185,129,0.15)' },
  warning: { dot: '#F59E0B', glow: 'rgba(245,158,11,0.4)', ring: 'rgba(245,158,11,0.15)' },
  critical: { dot: '#EF4444', glow: 'rgba(239,68,68,0.5)', ring: 'rgba(239,68,68,0.2)' },
};

/* ------------------------------------------------------------------ */
/*  Dashboard visualization (Bittensor-inspired)                       */
/* ------------------------------------------------------------------ */
function DashboardVisualization() {
  const nodeMap = Object.fromEntries(NODES.map((n) => [n.id, n]));

  return (
    <div className="relative w-full min-h-[480px] lg:min-h-[560px] flex items-center justify-center">
      {/* Ambient glow */}
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/8 via-[#C4A77D]/6 to-blue-500/8 rounded-3xl blur-[80px]" />

      <motion.div
        className="relative w-full max-w-[520px]"
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.9, ease: 'easeOut' }}
      >
        {/* Main dashboard card */}
        <div className="relative rounded-2xl overflow-hidden">
          {/* Border glow */}
          <div className="absolute -inset-[1px] rounded-2xl bg-gradient-to-b from-white/[0.12] via-white/[0.04] to-transparent" />

          <div className="relative rounded-2xl bg-[#0C1018] p-5">
            {/* ---- Top bar ---- */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="relative">
                  <div className="w-2 h-2 rounded-full bg-emerald-400" />
                  <div className="absolute inset-0 w-2 h-2 rounded-full bg-emerald-400 animate-ping opacity-40" />
                </div>
                <span className="text-[11px] font-medium text-white/50 tracking-wider uppercase font-mono">
                  Fleet Overview
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[10px] text-white/25 font-mono">Last sync 4s ago</span>
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span className="text-[9px] text-emerald-400 font-mono font-medium">LIVE</span>
                </div>
              </div>
            </div>

            {/* ---- KPI strip ---- */}
            <div className="grid grid-cols-4 gap-2 mb-4">
              {[
                { label: 'Uptime', value: '99.7%', color: 'text-emerald-400', bar: 'bg-emerald-400', pct: '99.7%' },
                { label: 'Fleet Health', value: '94%', color: 'text-[#C4A77D]', bar: 'bg-[#C4A77D]', pct: '94%' },
                { label: 'Avg RUL', value: '4.2d', color: 'text-blue-400', bar: 'bg-blue-400', pct: '70%' },
                { label: 'Alerts', value: '3', color: 'text-rose-400', bar: 'bg-rose-400', pct: '15%' },
              ].map((kpi) => (
                <motion.div
                  key={kpi.label}
                  className="rounded-lg bg-white/[0.03] border border-white/[0.05] p-2.5"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  <p className="text-[8px] text-white/25 tracking-wide mb-1 uppercase">{kpi.label}</p>
                  <p className={`text-lg font-bold font-mono ${kpi.color} leading-none mb-1.5`}>{kpi.value}</p>
                  <div className="w-full h-[2px] rounded-full bg-white/[0.06]">
                    <motion.div
                      className={`h-full rounded-full ${kpi.bar}`}
                      initial={{ width: 0 }}
                      animate={{ width: kpi.pct }}
                      transition={{ duration: 1.2, delay: 0.8, ease: 'easeOut' }}
                    />
                  </div>
                </motion.div>
              ))}
            </div>

            {/* ---- Network topology + Chart row ---- */}
            <div className="grid grid-cols-2 gap-2 mb-3">
              {/* Network graph */}
              <div className="rounded-lg bg-white/[0.02] border border-white/[0.05] p-3">
                <p className="text-[8px] text-white/25 tracking-wide uppercase mb-2">Network Topology</p>
                <svg viewBox="0 0 400 160" className="w-full h-[100px]">
                  {/* Edges */}
                  {EDGES.map(([from, to]) => {
                    const a = nodeMap[from];
                    const b = nodeMap[to];
                    return (
                      <motion.line
                        key={`${from}-${to}`}
                        x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                        stroke="rgba(255,255,255,0.06)"
                        strokeWidth="1"
                        initial={{ pathLength: 0, opacity: 0 }}
                        animate={{ pathLength: 1, opacity: 1 }}
                        transition={{ duration: 0.8, delay: 0.6 }}
                      />
                    );
                  })}
                  {/* Data flow pulses */}
                  {EDGES.map(([from, to], i) => {
                    const a = nodeMap[from];
                    const b = nodeMap[to];
                    return (
                      <motion.circle
                        key={`pulse-${from}-${to}`}
                        r="2"
                        fill="#C4A77D"
                        opacity={0}
                        animate={{
                          cx: [a.x, b.x],
                          cy: [a.y, b.y],
                          opacity: [0, 0.8, 0],
                        }}
                        transition={{
                          duration: 2.5,
                          repeat: Infinity,
                          delay: 1.2 + i * 0.4,
                          ease: 'linear',
                        }}
                      />
                    );
                  })}
                  {/* Nodes */}
                  {NODES.map((node) => {
                    const c = STATUS_COLORS[node.status];
                    return (
                      <g key={node.id}>
                        <motion.circle
                          cx={node.x} cy={node.y} r="14"
                          fill={c.ring}
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: 0.9, type: 'spring' }}
                        />
                        <motion.circle
                          cx={node.x} cy={node.y} r="5"
                          fill={c.dot}
                          style={{ filter: `drop-shadow(0 0 4px ${c.glow})` }}
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: 1.0, type: 'spring' }}
                        />
                        <text x={node.x} y={node.y + 24} textAnchor="middle" className="text-[7px] fill-white/20 font-mono">
                          {node.id}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>

              {/* Trend chart */}
              <div className="rounded-lg bg-white/[0.02] border border-white/[0.05] p-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[8px] text-white/25 tracking-wide uppercase">Vibration Trend</p>
                  <span className="text-[8px] text-rose-400/70 font-mono">+12% 24h</span>
                </div>
                <svg viewBox="0 0 200 80" className="w-full h-[88px]">
                  <defs>
                    <linearGradient id="heroChartGrad" x1="0" y1="0" x2="200" y2="0" gradientUnits="userSpaceOnUse">
                      <stop offset="0%" stopColor="rgba(196,167,125,0.7)" />
                      <stop offset="70%" stopColor="rgba(196,167,125,0.5)" />
                      <stop offset="100%" stopColor="rgba(239,68,68,0.8)" />
                    </linearGradient>
                    <linearGradient id="heroChartFill" x1="0" y1="0" x2="0" y2="80" gradientUnits="userSpaceOnUse">
                      <stop offset="0%" stopColor="rgba(196,167,125,0.12)" />
                      <stop offset="100%" stopColor="rgba(196,167,125,0)" />
                    </linearGradient>
                  </defs>
                  {/* Grid lines */}
                  {[20, 40, 60].map((y) => (
                    <line key={y} x1="0" y1={y} x2="200" y2={y} stroke="rgba(255,255,255,0.03)" strokeWidth="0.5" />
                  ))}
                  {/* Threshold */}
                  <line x1="0" y1="22" x2="200" y2="22" stroke="rgba(239,68,68,0.2)" strokeWidth="0.5" strokeDasharray="3 3" />
                  <text x="200" y="20" textAnchor="end" className="text-[6px] fill-rose-400/40 font-mono">WARN</text>
                  {/* Area fill */}
                  <motion.path
                    d="M0,55 L20,52 L40,48 L60,50 L80,45 L100,42 L120,38 L140,35 L160,28 L180,22 L200,18 L200,80 L0,80 Z"
                    fill="url(#heroChartFill)"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 1, delay: 1.5 }}
                  />
                  {/* Line */}
                  <motion.path
                    d="M0,55 L20,52 L40,48 L60,50 L80,45 L100,42 L120,38 L140,35 L160,28 L180,22 L200,18"
                    fill="none"
                    stroke="url(#heroChartGrad)"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 1.5, delay: 0.8 }}
                  />
                  {/* Data points */}
                  {[[180, 22], [200, 18]].map(([cx, cy], i) => (
                    <motion.circle
                      key={i}
                      cx={cx} cy={cy} r="2.5"
                      fill="#EF4444"
                      style={{ filter: 'drop-shadow(0 0 3px rgba(239,68,68,0.5))' }}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 2.2 + i * 0.15 }}
                    />
                  ))}
                </svg>
              </div>
            </div>

            {/* ---- Pipeline status strip ---- */}
            <div className="rounded-lg bg-white/[0.02] border border-white/[0.05] p-3">
              <div className="flex items-center justify-between mb-2.5">
                <p className="text-[8px] text-white/25 tracking-wide uppercase">Pipeline Status</p>
                <p className="text-[8px] text-white/20 font-mono">6 active</p>
              </div>
              <div className="grid grid-cols-6 gap-2">
                {[
                  { id: 'PL-001', health: 98, status: 'healthy' as const },
                  { id: 'PL-002', health: 42, status: 'critical' as const },
                  { id: 'PL-003', health: 95, status: 'healthy' as const },
                  { id: 'PL-004', health: 91, status: 'healthy' as const },
                  { id: 'PL-005', health: 73, status: 'warning' as const },
                  { id: 'PL-006', health: 88, status: 'healthy' as const },
                ].map((pl, i) => {
                  const c = STATUS_COLORS[pl.status];
                  return (
                    <motion.div
                      key={pl.id}
                      className="text-center"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 1.6 + i * 0.08 }}
                    >
                      <div className="relative w-8 h-8 mx-auto mb-1">
                        <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                          <circle cx="18" cy="18" r="15" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="2.5" />
                          <motion.circle
                            cx="18" cy="18" r="15" fill="none"
                            stroke={c.dot}
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeDasharray={`${pl.health * 0.942} 100`}
                            initial={{ strokeDasharray: '0 100' }}
                            animate={{ strokeDasharray: `${pl.health * 0.942} 100` }}
                            transition={{ duration: 1, delay: 1.8 + i * 0.1 }}
                          />
                        </svg>
                        <span className="absolute inset-0 flex items-center justify-center text-[7px] font-mono text-white/40">
                          {pl.health}
                        </span>
                      </div>
                      <p className="text-[7px] text-white/20 font-mono">{pl.id}</p>
                    </motion.div>
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
      {/* ---- Background ---- */}
      <div className="absolute inset-0 bg-[#FAF9F6]">
        <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-[#C4A77D]/8 rounded-full blur-[128px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-[#A68B5B]/6 rounded-full blur-[128px]" />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(28,25,23,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(28,25,23,0.08) 1px, transparent 1px)',
            backgroundSize: '64px 64px',
          }}
        />
      </div>

      {/* ---- Content: split layout ---- */}
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-16 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* ---- Left: Text ---- */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <motion.div variants={itemVariants}>
              <Badge
                variant="outline"
                className="mb-6 border-[#C4A77D]/30 bg-[#C4A77D]/10 text-[#A68B5B] hover:bg-[#C4A77D]/15 rounded-full px-4 py-1.5 text-sm font-medium gap-2"
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#C4A77D] opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#C4A77D]" />
                </span>
                Pipeline Integrity Management
              </Badge>
            </motion.div>

            <motion.h1
              className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-[#1C1917] leading-[1.05] tracking-tight mb-5"
              variants={itemVariants}
            >
              Predict failures<br />
              <span className="text-[#C4A77D] whitespace-nowrap">
                Prove compliance
              </span>
            </motion.h1>

            <motion.p
              className="text-lg text-[#78716C] max-w-lg mb-8 leading-relaxed"
              variants={itemVariants}
            >
              Real-time integrity monitoring for transmission and gathering pipelines. 49 CFR 192 compliance built in.
            </motion.p>

            {/* CTAs */}
            <motion.div
              className="flex flex-col sm:flex-row items-start gap-3 mb-10"
              variants={itemVariants}
            >
              <Button
                asChild
                size="lg"
                className="h-12 px-8 text-base font-semibold rounded-full bg-[#1C1917] text-white shadow-lg shadow-[#1C1917]/15 hover:shadow-xl hover:bg-[#2D2D2D] transition-all border-0"
              >
                <Link href="/signup">
                  Request Demo
                  <ArrowRight className="size-4 ml-1" />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="h-12 px-8 text-base font-medium rounded-full border-[#E7E0D5] text-[#78716C] hover:text-[#1C1917] hover:border-[#C4A77D] hover:bg-[#C4A77D]/5 bg-transparent"
              >
                <Link href="/demo">
                  <Eye className="size-4 mr-1" />
                  See Platform
                </Link>
              </Button>
            </motion.div>

            {/* ROI metrics — horizontal */}
            <motion.div
              className="flex flex-wrap gap-6"
              variants={itemVariants}
            >
              {ROI_METRICS.map(({ target, suffix, prefix, label, icon: Icon, ...rest }, idx) => (
                <div key={label} className="flex items-center gap-2.5">
                  <Icon className="size-4 text-[#C4A77D]" />
                  <div>
                    <span className="text-xl font-bold font-mono text-[#1C1917]">
                      <AnimatedCounter target={target} suffix={suffix} prefix={prefix} duration={2 + idx * 0.3} decimals={'decimals' in rest ? (rest as { decimals: number }).decimals : 0} />
                    </span>
                    <p className="text-[11px] text-[#A8A29E]">{label}</p>
                  </div>
                </div>
              ))}
            </motion.div>
          </motion.div>

          {/* ---- Right: Holographic Monitor ---- */}
          <motion.div
            className="hidden lg:block"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.3, ease: 'easeOut' }}
          >
            <DashboardVisualization />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
