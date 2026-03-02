'use client';

import { motion } from 'framer-motion';
import { AlertTriangle, BrainCircuit, ClipboardCheck, CheckCircle } from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Fleet Overview mockup                                              */
/* ------------------------------------------------------------------ */
function FleetOverviewMockup() {
  const compressors = [
    { id: 'COMP-001', health: 98, status: 'healthy' as const },
    { id: 'COMP-002', health: 42, status: 'critical' as const },
    { id: 'COMP-003', health: 95, status: 'healthy' as const },
    { id: 'COMP-004', health: 73, status: 'warning' as const },
  ];
  const colors = {
    healthy: '#10B981',
    warning: '#F59E0B',
    critical: '#EF4444',
  };

  return (
    <div className="rounded-2xl bg-[#0C1018] p-5 border border-white/[0.06]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400" />
          <span className="text-[10px] text-white/40 font-mono uppercase tracking-wider">Fleet Overview</span>
        </div>
        <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <span className="text-[8px] text-emerald-400 font-mono">LIVE</span>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        {[
          { label: 'Online', value: '4,612/4,700', color: 'text-emerald-400' },
          { label: 'Avg Health', value: '94%', color: 'text-[#C4A77D]' },
          { label: 'Active Alerts', value: '7', color: 'text-rose-400' },
        ].map((kpi) => (
          <motion.div
            key={kpi.label}
            className="rounded-lg bg-white/[0.03] border border-white/[0.05] p-2.5"
            initial={{ opacity: 0, y: 6 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
          >
            <p className="text-[7px] text-white/25 uppercase tracking-wide mb-0.5">{kpi.label}</p>
            <p className={`text-base font-bold font-mono ${kpi.color}`}>{kpi.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Health sparkline bars */}
      <div className="flex items-end gap-1 h-12 mb-3">
        {[98, 95, 91, 88, 42, 97, 73, 96, 94, 89, 98, 85, 92, 90, 44, 97, 88, 95, 91, 93].map((h, i) => (
          <motion.div
            key={i}
            className="flex-1 rounded-t-sm"
            style={{ backgroundColor: h > 80 ? '#10B981' : h > 60 ? '#F59E0B' : '#EF4444', opacity: 0.7 }}
            initial={{ height: 0 }}
            whileInView={{ height: `${h}%` }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.4 + i * 0.03 }}
          />
        ))}
      </div>

      {/* Compressor cards */}
      <div className="grid grid-cols-4 gap-1.5">
        {compressors.map((comp, i) => (
          <motion.div
            key={comp.id}
            className="rounded-md bg-white/[0.02] border border-white/[0.04] p-2 text-center"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.6 + i * 0.08 }}
          >
            <div
              className="w-2 h-2 rounded-full mx-auto mb-1"
              style={{ backgroundColor: colors[comp.status], boxShadow: `0 0 6px ${colors[comp.status]}40` }}
            />
            <p className="text-[7px] text-white/30 font-mono">{comp.id}</p>
            <p className="text-[9px] font-mono font-bold" style={{ color: colors[comp.status] }}>{comp.health}%</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Anomaly Detection mockup                                           */
/* ------------------------------------------------------------------ */
function AnomalyDetectionMockup() {
  return (
    <div className="rounded-2xl bg-[#0C1018] p-5 border border-white/[0.06]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-[10px] text-white/40 font-mono uppercase tracking-wider">Anomaly Detection</span>
        <span className="text-[8px] text-rose-400 font-mono px-2 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/20">2 ANOMALIES</span>
      </div>

      {/* Vibration chart */}
      <div className="rounded-lg bg-white/[0.02] border border-white/[0.04] p-3 mb-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[8px] text-white/25 uppercase tracking-wide">COMP-2847 Vibration (mm/s)</span>
          <span className="text-[7px] text-rose-400/70 font-mono">7.8 mm/s &uarr;</span>
        </div>
        <svg viewBox="0 0 300 70" className="w-full h-16">
          <defs>
            <linearGradient id="anomGrad" x1="0" y1="0" x2="300" y2="0" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="rgba(16,185,129,0.6)" />
              <stop offset="60%" stopColor="rgba(196,167,125,0.6)" />
              <stop offset="100%" stopColor="rgba(239,68,68,0.9)" />
            </linearGradient>
            <linearGradient id="anomFill" x1="0" y1="0" x2="0" y2="70" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="rgba(239,68,68,0.08)" />
              <stop offset="100%" stopColor="rgba(239,68,68,0)" />
            </linearGradient>
          </defs>
          {/* Warning threshold */}
          <line x1="0" y1="20" x2="300" y2="20" stroke="rgba(245,158,11,0.25)" strokeWidth="0.5" strokeDasharray="3 3" />
          <text x="300" y="18" textAnchor="end" className="text-[5px] fill-amber-400/40 font-mono">WARN 6.0</text>
          {/* Critical threshold */}
          <line x1="0" y1="10" x2="300" y2="10" stroke="rgba(239,68,68,0.25)" strokeWidth="0.5" strokeDasharray="3 3" />
          <text x="300" y="8" textAnchor="end" className="text-[5px] fill-rose-400/40 font-mono">CRIT 8.0</text>
          {/* Area fill */}
          <motion.path
            d="M0,50 L30,48 L60,50 L90,46 L120,44 L150,40 L180,35 L210,28 L240,22 L270,16 L300,12 L300,70 L0,70 Z"
            fill="url(#anomFill)"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.6 }}
          />
          {/* Line */}
          <motion.path
            d="M0,50 L30,48 L60,50 L90,46 L120,44 L150,40 L180,35 L210,28 L240,22 L270,16 L300,12"
            fill="none"
            stroke="url(#anomGrad)"
            strokeWidth="1.5"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            whileInView={{ pathLength: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1.2, delay: 0.3 }}
          />
          {/* Anomaly marker */}
          <motion.circle
            cx="270" cy="16" r="4"
            fill="none"
            stroke="#EF4444"
            strokeWidth="1"
            initial={{ scale: 0 }}
            whileInView={{ scale: [0, 1.5, 1] }}
            viewport={{ once: true }}
            transition={{ delay: 1.5, duration: 0.4 }}
          />
          <motion.circle
            cx="270" cy="16" r="2"
            fill="#EF4444"
            style={{ filter: 'drop-shadow(0 0 4px rgba(239,68,68,0.6))' }}
            initial={{ scale: 0 }}
            whileInView={{ scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 1.5 }}
          />
        </svg>
      </div>

      {/* Alert row */}
      <div className="space-y-1.5">
        {[
          { time: '14:32', msg: 'Vibration anomaly detected — Isolation Forest score -0.82', severity: 'critical' },
          { time: '14:32', msg: 'RUL prediction: 72hr to threshold breach', severity: 'warning' },
        ].map((alert, i) => (
          <motion.div
            key={i}
            className="flex items-center gap-2 rounded-md bg-white/[0.02] border border-white/[0.04] px-2.5 py-1.5"
            initial={{ opacity: 0, x: -10 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 1.8 + i * 0.15 }}
          >
            <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${alert.severity === 'critical' ? 'bg-rose-400' : 'bg-amber-400'}`} />
            <span className="text-[7px] text-white/20 font-mono shrink-0">{alert.time}</span>
            <span className="text-[8px] text-white/40 truncate">{alert.msg}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  AI Agent Pipeline mockup (replaces EPA Compliance)                 */
/* ------------------------------------------------------------------ */
function AIAgentMockup() {
  const steps = [
    { label: 'Anomaly Detected', detail: 'COMP-2847 · Vibration drift +12%', color: '#EF4444', Icon: AlertTriangle },
    { label: 'Root Cause Found', detail: 'Bearing wear — 87% confidence', color: '#8B5CF6', Icon: BrainCircuit },
    { label: 'Work Order Created', detail: 'WO-4821 · Priority: High · Est. $2,400', color: '#C4A77D', Icon: ClipboardCheck },
    { label: 'Technician Assigned', detail: 'Field crew notified · ETA 4hr', color: '#10B981', Icon: CheckCircle },
  ];

  return (
    <div className="rounded-2xl bg-[#0C1018] p-5 border border-white/[0.06]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-[10px] text-white/40 font-mono uppercase tracking-wider">AI Agent Pipeline</span>
        <motion.span
          className="text-[8px] text-purple-400 font-mono px-2 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/20"
          animate={{ opacity: [1, 0.5, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          ACTIVE
        </motion.span>
      </div>

      {/* Steps */}
      <div className="relative">
        {/* Connecting line */}
        <div className="absolute left-[19px] top-5 bottom-5 w-px bg-gradient-to-b from-rose-500/30 via-purple-500/20 to-emerald-500/30" />

        <div className="space-y-2.5">
          {steps.map((step, i) => (
            <motion.div
              key={step.label}
              className="relative flex items-center gap-3 rounded-lg bg-white/[0.02] border border-white/[0.04] px-3 py-2.5"
              initial={{ opacity: 0, x: -12 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 + i * 0.4, duration: 0.4 }}
            >
              {/* Step icon */}
              <div
                className="relative z-10 w-[38px] h-[38px] rounded-lg flex items-center justify-center shrink-0"
                style={{ backgroundColor: `${step.color}15`, border: `1px solid ${step.color}30` }}
              >
                <step.Icon className="size-4" style={{ color: step.color }} />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-semibold text-white/60">{step.label}</p>
                <p className="text-[8px] text-white/25 font-mono truncate">{step.detail}</p>
              </div>

              {/* Step number */}
              <span className="text-[7px] font-mono text-white/10 shrink-0">{String(i + 1).padStart(2, '0')}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Platform showcase data                                             */
/* ------------------------------------------------------------------ */
const SHOWCASES = [
  {
    title: 'See every compressor. In real time.',
    description: 'Health scores, vibration trends, and thermal maps across your entire fleet — updated every 5 minutes. Drill down to any compressor, any sensor, in one click.',
    Mockup: FleetOverviewMockup,
  },
  {
    title: 'Catch failures 48 hours early',
    description: 'ML models learn each compressor\u2019s normal behavior. When vibration, temperature, or pressure starts to drift — you know first.',
    Mockup: AnomalyDetectionMockup,
  },
  {
    title: 'AI investigates. You approve.',
    description: 'When Altaviz detects a problem, AI agents trace root cause, check maintenance history, and generate a work order — complete with parts list and cost estimate.',
    Mockup: AIAgentMockup,
  },
];

/* ================================================================== */
/*  Platform Section                                                   */
/* ================================================================== */
export default function Features() {
  return (
    <section id="platform" className="section-viewport relative py-24 sm:py-32">
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
            One platform. Complete fleet visibility.
          </h2>
          <p className="text-lg text-[#78716C] max-w-2xl mx-auto">
            From the sensor on the compressor to the work order in the field.
          </p>
        </motion.div>

        <div className="space-y-16 lg:space-y-24">
          {SHOWCASES.map(({ title, description, Mockup }, i) => {
            const isReversed = i % 2 === 1;
            return (
              <motion.div
                key={title}
                className={`grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center ${isReversed ? 'lg:direction-rtl' : ''}`}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ duration: 0.6 }}
              >
                <div className={isReversed ? 'lg:order-2' : ''}>
                  <Mockup />
                </div>
                <div className={isReversed ? 'lg:order-1' : ''}>
                  <h3 className="text-2xl sm:text-3xl font-bold text-[#1C1917] mb-3">
                    {title}
                  </h3>
                  <p className="text-base text-[#78716C] leading-relaxed max-w-md">
                    {description}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
