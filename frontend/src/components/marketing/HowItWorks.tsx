'use client';

import { motion } from 'framer-motion';
import { Cable, BrainCircuit, Bot, Wrench, CheckCircle, AlertTriangle, ClipboardCheck, ArrowRight } from 'lucide-react';
import { EASE_STANDARD } from './motion-constants';

/* ------------------------------------------------------------------ */
/*  Step 1: Connect mockup — data ingestion streams                    */
/* ------------------------------------------------------------------ */
function ConnectMockup() {
  const protocols = [
    { name: 'OSIsoft PI', count: '2,340', status: 'streaming' },
    { name: 'Honeywell Experion', count: '1,180', status: 'streaming' },
    { name: 'OPC-UA', count: '890', status: 'streaming' },
    { name: 'CSV Upload', count: '290', status: 'complete' },
  ];

  return (
    <div className="rounded-2xl bg-[#0C1018] p-5 border border-white/[0.06]">
      <div className="flex items-center justify-between mb-4">
        <span className="text-[10px] text-white/40 font-mono uppercase tracking-wider">Data Ingestion</span>
        <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
          <motion.div
            className="w-1.5 h-1.5 rounded-full bg-emerald-400"
            animate={{ opacity: [1, 0.4, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          <span className="text-[8px] text-emerald-400 font-mono">INGESTING</span>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        {[
          { label: 'Sources', value: '4', color: 'text-[#F5C518]' },
          { label: 'Sensors/min', value: '18.4K', color: 'text-emerald-400' },
          { label: 'Latency', value: '< 2s', color: 'text-blue-400' },
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

      {/* Protocol streams */}
      <div className="space-y-1.5">
        {protocols.map((proto, i) => (
          <motion.div
            key={proto.name}
            className="flex items-center gap-2.5 rounded-lg bg-white/[0.02] border border-white/[0.04] px-3 py-2"
            initial={{ opacity: 0, x: -12 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.5 + i * 0.15, duration: 0.4 }}
          >
            <motion.div
              className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0"
              animate={proto.status === 'streaming' ? { opacity: [1, 0.3, 1] } : {}}
              transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.3 }}
              style={proto.status === 'complete' ? { backgroundColor: '#3B82F6' } : {}}
            />
            <span className="text-[9px] text-white/50 font-mono flex-1">{proto.name}</span>
            <span className="text-[8px] text-white/25 font-mono">{proto.count} pts</span>
            {/* Animated data bar */}
            <div className="w-16 h-1 rounded-full bg-white/[0.04] overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-emerald-400/60"
                animate={proto.status === 'streaming' ? { x: ['-100%', '100%'] } : {}}
                transition={{ duration: 1.2, repeat: Infinity, ease: 'linear', delay: i * 0.2 }}
                style={{ width: '60%' }}
              />
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Step 2: Detect mockup — ML anomaly scoring                         */
/* ------------------------------------------------------------------ */
function DetectMockup() {
  return (
    <div className="rounded-2xl bg-[#0C1018] p-5 border border-white/[0.06]">
      <div className="flex items-center justify-between mb-4">
        <span className="text-[10px] text-white/40 font-mono uppercase tracking-wider">ML Anomaly Scoring</span>
        <span className="text-[8px] text-amber-400 font-mono px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20">3 FLAGGED</span>
      </div>

      {/* Anomaly score chart — baseline vs actual */}
      <div className="rounded-lg bg-white/[0.02] border border-white/[0.04] p-3 mb-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[8px] text-white/25 uppercase tracking-wide">Isolation Forest Score — Fleet</span>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <div className="w-3 h-[2px] rounded-full bg-emerald-400/60" />
              <span className="text-[6px] text-white/20 font-mono">Baseline</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-[2px] rounded-full bg-[#F5C518]" />
              <span className="text-[6px] text-white/20 font-mono">Actual</span>
            </div>
          </div>
        </div>
        <svg viewBox="0 0 300 70" className="w-full h-16">
          <defs>
            <linearGradient id="detectFill" x1="0" y1="0" x2="0" y2="70" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="rgba(245,197,24,0.10)" />
              <stop offset="100%" stopColor="rgba(245,197,24,0)" />
            </linearGradient>
          </defs>
          {/* Anomaly threshold */}
          <line x1="0" y1="18" x2="300" y2="18" stroke="rgba(239,68,68,0.2)" strokeWidth="0.5" strokeDasharray="3 3" />
          <text x="300" y="16" textAnchor="end" className="text-[5px] fill-rose-400/40 font-mono">ANOMALY -0.5</text>
          {/* Baseline (stable) */}
          <motion.path
            d="M0,48 L30,47 L60,49 L90,47 L120,48 L150,47 L180,48 L210,47 L240,48 L270,47 L300,48"
            fill="none"
            stroke="rgba(16,185,129,0.4)"
            strokeWidth="1"
            strokeDasharray="4 2"
            initial={{ pathLength: 0 }}
            whileInView={{ pathLength: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2 }}
          />
          {/* Actual scores — diverging */}
          <motion.path
            d="M0,48 L30,47 L60,48 L90,45 L120,42 L150,38 L180,32 L210,28 L240,22 L270,16 L300,12"
            fill="none"
            stroke="#F5C518"
            strokeWidth="1.5"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            whileInView={{ pathLength: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1.2, delay: 0.4 }}
          />
          <motion.path
            d="M0,48 L30,47 L60,48 L90,45 L120,42 L150,38 L180,32 L210,28 L240,22 L270,16 L300,12 L300,70 L0,70 Z"
            fill="url(#detectFill)"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.8, duration: 0.6 }}
          />
          {/* Anomaly point */}
          <motion.circle
            cx="270" cy="16" r="4" fill="none" stroke="#EF4444" strokeWidth="1"
            initial={{ scale: 0 }}
            whileInView={{ scale: [0, 1.5, 1] }}
            viewport={{ once: true }}
            transition={{ delay: 1.6, duration: 0.4 }}
          />
          <motion.circle
            cx="270" cy="16" r="2" fill="#EF4444"
            style={{ filter: 'drop-shadow(0 0 4px rgba(239,68,68,0.6))' }}
            initial={{ scale: 0 }}
            whileInView={{ scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 1.6 }}
          />
        </svg>
      </div>

      {/* Flagged assets */}
      <div className="space-y-1.5">
        {[
          { id: 'COMP-2847', score: '-0.82', sensor: 'Vibration', severity: 'critical' as const },
          { id: 'COMP-0891', score: '-0.64', sensor: 'Temperature', severity: 'warning' as const },
          { id: 'COMP-1455', score: '-0.51', sensor: 'Pressure', severity: 'warning' as const },
        ].map((asset, i) => (
          <motion.div
            key={asset.id}
            className="flex items-center gap-2 rounded-md bg-white/[0.02] border border-white/[0.04] px-2.5 py-1.5"
            initial={{ opacity: 0, x: -10 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 1.8 + i * 0.12 }}
          >
            <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${asset.severity === 'critical' ? 'bg-rose-400' : 'bg-amber-400'}`} />
            <span className="text-[8px] text-white/40 font-mono w-16 shrink-0">{asset.id}</span>
            <span className="text-[8px] text-white/25 font-mono flex-1">{asset.sensor}</span>
            <span className={`text-[8px] font-mono font-bold ${asset.severity === 'critical' ? 'text-rose-400' : 'text-amber-400'}`}>
              {asset.score}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Step 3: Investigate mockup — AI root cause analysis                */
/* ------------------------------------------------------------------ */
function InvestigateMockup() {
  const steps = [
    { label: 'Sensor data retrieved', detail: '72hr window · 864 readings', color: '#3B82F6', done: true },
    { label: 'Pattern match found', detail: 'Bearing wear signature — 93% match', color: '#8B5CF6', done: true },
    { label: 'Maintenance history checked', detail: 'Last bearing swap: 14 months ago', color: '#F5C518', done: true },
    { label: 'Knowledge base searched', detail: '3 similar incidents found', color: '#10B981', done: true },
    { label: 'Root cause determined', detail: 'Bearing degradation — 87% confidence', color: '#10B981', done: false },
  ];

  return (
    <div className="rounded-2xl bg-[#0C1018] p-5 border border-white/[0.06]">
      <div className="flex items-center justify-between mb-4">
        <span className="text-[10px] text-white/40 font-mono uppercase tracking-wider">AI Investigation</span>
        <motion.span
          className="text-[8px] text-purple-400 font-mono px-2 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/20"
          animate={{ opacity: [1, 0.5, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          ANALYZING
        </motion.span>
      </div>

      {/* Investigation ID */}
      <motion.div
        className="flex items-center gap-2 rounded-lg bg-white/[0.02] border border-white/[0.04] px-3 py-2 mb-3"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 0.2 }}
      >
        <span className="text-[8px] text-white/20 font-mono">INV-2026-00847</span>
        <div className="flex-1" />
        <span className="text-[8px] text-white/20 font-mono">COMP-2847</span>
        <div className="w-1.5 h-1.5 rounded-full bg-rose-400" />
      </motion.div>

      {/* Analysis steps */}
      <div className="relative">
        <div className="absolute left-[11px] top-3 bottom-3 w-px bg-gradient-to-b from-blue-500/30 via-purple-500/20 to-emerald-500/30" />
        <div className="space-y-2">
          {steps.map((step, i) => (
            <motion.div
              key={step.label}
              className="relative flex items-start gap-3 pl-1"
              initial={{ opacity: 0, x: -8 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4 + i * 0.35, duration: 0.35 }}
            >
              <motion.div
                className="relative z-10 w-[22px] h-[22px] rounded-full flex items-center justify-center shrink-0 mt-0.5"
                style={{ backgroundColor: `${step.color}15`, border: `1px solid ${step.color}30` }}
                initial={{ scale: 0 }}
                whileInView={{ scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.5 + i * 0.35, type: 'spring', stiffness: 300, damping: 15 }}
              >
                {step.done ? (
                  <CheckCircle className="size-3" style={{ color: step.color }} />
                ) : (
                  <motion.div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: step.color }}
                    animate={{ scale: [1, 1.3, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  />
                )}
              </motion.div>
              <div className="min-w-0 flex-1">
                <p className="text-[9px] font-medium text-white/50">{step.label}</p>
                <p className="text-[7px] text-white/25 font-mono truncate">{step.detail}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Confidence bar */}
      <motion.div
        className="mt-3 rounded-lg bg-white/[0.02] border border-white/[0.04] px-3 py-2"
        initial={{ opacity: 0, y: 6 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 2.2 }}
      >
        <div className="flex items-center justify-between mb-1">
          <span className="text-[7px] text-white/25 uppercase tracking-wide">Confidence</span>
          <span className="text-[9px] font-mono font-bold text-emerald-400">87%</span>
        </div>
        <div className="w-full h-1.5 rounded-full bg-white/[0.04] overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-blue-400 via-purple-400 to-emerald-400"
            initial={{ width: 0 }}
            whileInView={{ width: '87%' }}
            viewport={{ once: true }}
            transition={{ duration: 1, delay: 2.4, ease: 'easeOut' }}
          />
        </div>
      </motion.div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Step 4: Fix mockup — work order generation                         */
/* ------------------------------------------------------------------ */
function FixMockup() {
  return (
    <div className="rounded-2xl bg-[#0C1018] p-5 border border-white/[0.06]">
      <div className="flex items-center justify-between mb-4">
        <span className="text-[10px] text-white/40 font-mono uppercase tracking-wider">Work Order</span>
        <motion.span
          className="text-[8px] text-[#F5C518] font-mono px-2 py-0.5 rounded-full bg-[#F5C518]/10 border border-[#F5C518]/20"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
        >
          PENDING APPROVAL
        </motion.span>
      </div>

      {/* Work order card */}
      <motion.div
        className="rounded-lg bg-white/[0.03] border border-white/[0.06] p-3 mb-3"
        initial={{ opacity: 0, y: 8 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.3, duration: 0.4 }}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-semibold text-white/60">WO-2026-04821</span>
          <span className="text-[7px] text-rose-400 font-mono px-1.5 py-0.5 rounded bg-rose-500/10 border border-rose-500/20">HIGH</span>
        </div>
        <p className="text-[9px] text-white/40 mb-3">Replace bearing assembly — COMP-2847</p>

        {/* Details grid */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          {[
            { label: 'Est. Cost', value: '$2,400' },
            { label: 'Downtime', value: '3hr' },
            { label: 'Station', value: 'Alpha-07' },
            { label: 'Assigned', value: 'Crew B' },
          ].map((detail, i) => (
            <motion.div
              key={detail.label}
              className="rounded-md bg-white/[0.02] border border-white/[0.04] px-2 py-1.5"
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.6 + i * 0.1 }}
            >
              <p className="text-[6px] text-white/20 uppercase tracking-wide">{detail.label}</p>
              <p className="text-[10px] font-mono font-bold text-white/50">{detail.value}</p>
            </motion.div>
          ))}
        </div>

        {/* Parts list */}
        <div className="rounded-md bg-white/[0.02] border border-white/[0.04] px-2.5 py-2">
          <p className="text-[7px] text-white/20 uppercase tracking-wide mb-1.5">Parts Required</p>
          {[
            { part: 'Bearing assembly (SKF 6312)', qty: '1x', cost: '$890' },
            { part: 'Seal kit', qty: '1x', cost: '$145' },
            { part: 'Lubricant (ISO VG 68)', qty: '2L', cost: '$65' },
          ].map((part, i) => (
            <motion.div
              key={part.part}
              className="flex items-center gap-2 py-0.5"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 1.0 + i * 0.1 }}
            >
              <span className="text-[7px] text-white/30 flex-1 truncate">{part.part}</span>
              <span className="text-[7px] text-white/20 font-mono shrink-0">{part.qty}</span>
              <span className="text-[7px] text-white/40 font-mono shrink-0">{part.cost}</span>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Approval buttons */}
      <motion.div
        className="flex items-center gap-2"
        initial={{ opacity: 0, y: 6 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 1.4 }}
      >
        <motion.div
          className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 py-2 cursor-default"
          whileInView={{ borderColor: ['rgba(16,185,129,0.2)', 'rgba(16,185,129,0.5)', 'rgba(16,185,129,0.2)'] }}
          viewport={{ once: true }}
          transition={{ delay: 1.8, duration: 1.2 }}
        >
          <CheckCircle className="size-3 text-emerald-400" />
          <span className="text-[9px] font-semibold text-emerald-400">Approve</span>
        </motion.div>
        <div className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-white/[0.02] border border-white/[0.04] py-2 cursor-default">
          <span className="text-[9px] text-white/30">Reject</span>
        </div>
        <div className="flex items-center justify-center rounded-lg bg-white/[0.02] border border-white/[0.04] py-2 px-3 cursor-default">
          <span className="text-[9px] text-white/30">Edit</span>
        </div>
      </motion.div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Step definitions                                                   */
/* ------------------------------------------------------------------ */
const STEPS = [
  {
    number: '01',
    title: 'Connect',
    icon: Cable,
    description: 'Plug in your existing SCADA systems or upload CSVs. Altaviz ingests pressure, temperature, vibration, and flow data from your entire fleet — without disrupting operations.',
    detail: 'Supports OSIsoft PI, Honeywell Experion, Emerson DeltaV, and OPC-UA. Most fleets go live in under a week.',
    Mockup: ConnectMockup,
  },
  {
    number: '02',
    title: 'Detect',
    icon: BrainCircuit,
    description: 'ML models learn the healthy baseline of each pipeline asset. When sensor patterns start to deviate, you get an alert — 24 to 48 hours before a traditional threshold alarm.',
    detail: 'Models retrain quarterly on your data. Tuned for zero false positives — so your crew trusts every alert.',
    Mockup: DetectMockup,
  },
  {
    number: '03',
    title: 'Investigate',
    icon: Bot,
    description: 'AI agents automatically trace root cause, check maintenance history, and search the knowledge base. You get a diagnosis — not just an alarm.',
    detail: 'Root cause analysis in seconds, not hours. 87% confidence threshold before any recommendation ships.',
    Mockup: InvestigateMockup,
  },
  {
    number: '04',
    title: 'Fix',
    icon: Wrench,
    description: 'Work orders auto-generated with parts list, priority level, and cost estimate. The right technician gets notified. You approve and they act.',
    detail: 'Human-in-the-loop approval gates. Nothing ships without your sign-off.',
    Mockup: FixMockup,
  },
];

/* ================================================================== */
/*  How It Works Section                                               */
/* ================================================================== */
export default function HowItWorks() {
  return (
    <section id="how-it-works" className="relative py-24 sm:py-32">
      <div className="absolute inset-0 bg-[#FAFAFA]" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.5 }}
        >
          <p className="text-[11px] font-semibold text-[#F5C518] uppercase tracking-[0.15em] mb-3">How It Works</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-[#0A0A0A] mb-4">
            From your SCADA system to work orders in the field
          </h2>
          <p className="text-lg text-[#6B7280] max-w-2xl mx-auto">
            Less than 25% of operators use predictive maintenance today. Go live in under a week.
          </p>
        </motion.div>

        {/* Steps — alternating layout */}
        <div className="space-y-16 lg:space-y-24">
          {STEPS.map((step, i) => {
            const isEven = i % 2 === 0;
            return (
              <motion.div
                key={step.number}
                className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ duration: 0.6, ease: EASE_STANDARD }}
              >
                {/* Mockup — left on even, right on odd */}
                <div className={isEven ? 'lg:order-1' : 'lg:order-2'}>
                  <step.Mockup />
                </div>

                {/* Text content */}
                <div className={isEven ? 'lg:order-2' : 'lg:order-1'}>
                  <motion.div
                    className="flex items-center gap-3 mb-4"
                    initial={{ opacity: 0, x: isEven ? 20 : -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.2, duration: 0.4 }}
                  >
                    <div className="w-12 h-12 rounded-xl bg-[#F5C518]/10 border border-[#F5C518]/20 flex items-center justify-center">
                      <step.icon className="size-5 text-[#D4A80F]" />
                    </div>
                    <span className="text-sm font-bold text-[#F5C518] font-mono">{step.number}</span>
                  </motion.div>

                  <motion.h3
                    className="text-2xl sm:text-3xl font-bold text-[#0A0A0A] mb-3"
                    initial={{ opacity: 0, y: 12 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.3, duration: 0.4 }}
                  >
                    {step.title}
                  </motion.h3>

                  <motion.p
                    className="text-base text-[#6B7280] leading-relaxed mb-3 max-w-md"
                    initial={{ opacity: 0, y: 12 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.4, duration: 0.4 }}
                  >
                    {step.description}
                  </motion.p>

                  <motion.p
                    className="text-sm text-[#9CA3AF] leading-relaxed max-w-md"
                    initial={{ opacity: 0, y: 12 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.5, duration: 0.4 }}
                  >
                    {step.detail}
                  </motion.p>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Connecting flow arrows between steps (desktop) */}
        <div className="hidden lg:flex items-center justify-center mt-16 gap-4">
          {STEPS.map((step, i) => (
            <motion.div
              key={step.number}
              className="flex items-center gap-4"
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15, duration: 0.3 }}
            >
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-[#E5E5E5] shadow-sm">
                <step.icon className="size-4 text-[#D4A80F]" />
                <span className="text-sm font-semibold text-[#0A0A0A]">{step.title}</span>
              </div>
              {i < STEPS.length - 1 && (
                <motion.div
                  initial={{ opacity: 0, x: -4 }}
                  whileInView={{ opacity: 0.4, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.3 + i * 0.15 }}
                >
                  <ArrowRight className="size-4 text-[#F5C518]" />
                </motion.div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
