'use client';

import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity,
  BrainCircuit,
  ClipboardCheck,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Search,
  BookOpen,
  GitCompare,
  Loader2,
  Zap,
  ShieldCheck,
  Clock,
  DollarSign,
  Wrench,
  MessageSquare,
  User,
  Bot,
  ArrowRight,
} from 'lucide-react';
import Link from 'next/link';
import { useAutoTabs } from '@/hooks/useAutoTabs';
import { useTypewriter } from '@/hooks/useTypewriter';
import { EASE_STANDARD, springPop } from './motion-constants';
import { useState, useEffect, useRef } from 'react';
import { useInView } from 'framer-motion';

/* ------------------------------------------------------------------ */
/*  Tab definitions                                                    */
/* ------------------------------------------------------------------ */
const TABS = [
  { label: 'Fleet Monitoring', icon: Activity, color: '#10B981' },
  { label: 'Investigation', icon: BrainCircuit, color: '#8B5CF6' },
  { label: 'Work Orders', icon: ClipboardCheck, color: '#F5C518' },
  { label: 'Optimization', icon: TrendingUp, color: '#3B82F6' },
];

const tabContentVariants = {
  enter: { opacity: 0, y: 12 },
  center: { opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE_STANDARD } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.25 } },
};

/* ------------------------------------------------------------------ */
/*  Tab 1: Fleet Monitoring                                            */
/* ------------------------------------------------------------------ */
function FleetMonitoringTab() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true });
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    if (!isInView) return;
    const timers = [
      setTimeout(() => setPhase(1), 400),   // grid appears
      setTimeout(() => setPhase(2), 1600),   // sensor data
      setTimeout(() => setPhase(3), 2800),   // anomaly detected
      setTimeout(() => setPhase(4), 4000),   // alert card
      setTimeout(() => setPhase(5), 5200),   // RUL prediction
    ];
    return () => timers.forEach(clearTimeout);
  }, [isInView]);

  const compressors = [
    { id: 'COMP-001', health: 98 },
    { id: 'COMP-002', health: phase >= 3 ? 42 : phase >= 2 ? 71 : 94 },
    { id: 'COMP-003', health: 95 },
    { id: 'COMP-004', health: 91 },
    { id: 'COMP-005', health: 88 },
    { id: 'COMP-006', health: 96 },
  ];

  const getColor = (h: number) => h > 80 ? '#10B981' : h > 60 ? '#F59E0B' : '#EF4444';

  return (
    <div ref={ref} className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] gap-4 min-h-[320px]">
      {/* Left: Sensor stream */}
      <div className="rounded-xl bg-white/[0.02] border border-white/[0.04] p-4 overflow-hidden">
        <p className="text-[8px] text-white/25 uppercase tracking-wide mb-3">Sensor Data Stream</p>
        <div className="space-y-1.5 font-mono text-[9px]">
          {[
            { time: '14:30:05', vib: '3.2', temp: '185', psi: '842' },
            { time: '14:30:10', vib: '3.4', temp: '186', psi: '840' },
            { time: '14:30:15', vib: '4.1', temp: '188', psi: '838' },
            { time: '14:30:20', vib: '5.8', temp: '192', psi: '835' },
            { time: '14:30:25', vib: '7.2', temp: '198', psi: '831' },
            { time: '14:30:30', vib: '7.8', temp: '201', psi: '828' },
          ].map((row, i) => (
            <motion.div
              key={row.time}
              className="flex items-center gap-3"
              initial={{ opacity: 0, x: -8 }}
              animate={phase >= 2 ? { opacity: 1, x: 0 } : {}}
              transition={{ delay: i * 0.12, duration: 0.3 }}
            >
              <span className="text-white/15">{row.time}</span>
              <span className={i >= 3 && phase >= 3 ? 'text-rose-400' : 'text-white/30'}>
                vib: {row.vib}
              </span>
              <span className={i >= 4 && phase >= 3 ? 'text-amber-400' : 'text-white/30'}>
                temp: {row.temp}
              </span>
              <span className="text-white/30">psi: {row.psi}</span>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Center: Compressor grid + ML */}
      <div className="flex flex-col items-center gap-3">
        <div className="grid grid-cols-3 gap-2">
          {compressors.map((comp, i) => {
            const color = getColor(comp.health);
            return (
              <motion.div
                key={comp.id}
                className="w-20 h-20 rounded-lg bg-white/[0.02] border border-white/[0.04] flex flex-col items-center justify-center"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={phase >= 1 ? { opacity: 1, scale: 1 } : {}}
                transition={{ delay: i * 0.06, ...springPop }}
              >
                <motion.div
                  className="w-2.5 h-2.5 rounded-full mb-1"
                  animate={{ backgroundColor: color, boxShadow: `0 0 6px ${color}40` }}
                  transition={{ duration: 0.4 }}
                />
                <p className="text-[7px] text-white/30 font-mono">{comp.id}</p>
                <motion.p
                  className="text-[9px] font-mono font-bold"
                  animate={{ color }}
                  transition={{ duration: 0.4 }}
                >
                  {comp.health}%
                </motion.p>
              </motion.div>
            );
          })}
        </div>

        {/* ML brain */}
        <motion.div
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-purple-500/10 border border-purple-500/20"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={phase >= 3 ? { opacity: 1, scale: 1 } : {}}
          transition={springPop}
        >
          <motion.div
            animate={phase >= 3 ? { rotate: 360 } : {}}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          >
            <BrainCircuit className="size-4 text-purple-400" />
          </motion.div>
          <span className="text-[9px] font-mono text-purple-400">ML Analysis</span>
        </motion.div>

        {/* SVG connecting line from grid to ML */}
        <svg className="absolute inset-0 pointer-events-none" style={{ overflow: 'visible' }}>
          <motion.line
            x1="50%" y1="45%" x2="50%" y2="55%"
            stroke="rgba(139,92,246,0.3)"
            strokeWidth="1"
            strokeDasharray="3 3"
            initial={{ pathLength: 0 }}
            animate={phase >= 3 ? { pathLength: 1 } : {}}
            transition={{ duration: 0.6 }}
          />
        </svg>
      </div>

      {/* Right: Alert panel */}
      <div className="space-y-3">
        <motion.div
          className="rounded-xl bg-white/[0.02] border border-rose-500/20 p-4"
          initial={{ opacity: 0, x: 20 }}
          animate={phase >= 4 ? { opacity: 1, x: 0 } : { opacity: 0, x: 20 }}
          transition={{ duration: 0.4, ...springPop }}
        >
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="size-3.5 text-rose-400" />
            <span className="text-[10px] font-semibold text-rose-400">Anomaly Detected</span>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-[8px] text-white/25 font-mono">Asset</span>
              <span className="text-[9px] text-white/50 font-mono font-bold">COMP-002</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[8px] text-white/25 font-mono">Sensor</span>
              <span className="text-[9px] text-rose-400 font-mono">Vibration 7.8 mm/s</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[8px] text-white/25 font-mono">Score</span>
              <span className="text-[9px] text-rose-400 font-mono">-0.82 (anomalous)</span>
            </div>
          </div>
          <div className="mt-2 flex items-center gap-1 px-2 py-1 rounded-md bg-rose-500/10 border border-rose-500/20 w-fit">
            <div className="w-1.5 h-1.5 rounded-full bg-rose-400" />
            <span className="text-[8px] font-semibold text-rose-400 uppercase">Critical</span>
          </div>
        </motion.div>

        <motion.div
          className="rounded-xl bg-white/[0.02] border border-amber-500/20 p-4"
          initial={{ opacity: 0, x: 20 }}
          animate={phase >= 5 ? { opacity: 1, x: 0 } : { opacity: 0, x: 20 }}
          transition={{ duration: 0.4, delay: 0.15, ...springPop }}
        >
          <div className="flex items-center gap-2 mb-1">
            <Clock className="size-3.5 text-amber-400" />
            <span className="text-[10px] font-semibold text-amber-400">RUL Prediction</span>
          </div>
          <p className="text-[9px] text-white/40 font-mono">Remaining Useful Life: <span className="text-amber-400 font-bold">72 hours</span></p>
          <div className="mt-1.5 flex items-center gap-1.5">
            <span className="text-[8px] text-white/25">Confidence:</span>
            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
              <span className="text-[8px] text-emerald-400 font-mono font-semibold">High (91%)</span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Tab 2: Investigation Agent                                         */
/* ------------------------------------------------------------------ */
const EVIDENCE_STEPS = [
  {
    icon: Activity,
    source: 'sensor_readings',
    action: 'Analyzing sensor patterns',
    finding: 'Vibration increased 312% in 72 hours',
    confidence: 94,
  },
  {
    icon: Search,
    source: 'maintenance_events',
    action: 'Checking maintenance history',
    finding: 'Last bearing inspection 8 months ago',
    confidence: 89,
  },
  {
    icon: BookOpen,
    source: 'knowledge_base',
    action: 'Searching knowledge base',
    finding: '3 similar incidents: all bearing wear',
    confidence: 73,
  },
  {
    icon: GitCompare,
    source: 'similar_incidents',
    action: 'Cross-referencing failure patterns',
    finding: 'Pattern matches bearing wear signature',
    confidence: 87,
  },
];

function InvestigationTab() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true });
  const [resolvedSteps, setResolvedSteps] = useState<number[]>([]);
  const [showReport, setShowReport] = useState(false);

  useEffect(() => {
    if (!isInView) return;
    const timers = EVIDENCE_STEPS.map((_, i) =>
      setTimeout(() => setResolvedSteps((prev) => [...prev, i]), 1200 + i * 1400)
    );
    timers.push(setTimeout(() => setShowReport(true), 1200 + EVIDENCE_STEPS.length * 1400 + 600));
    return () => timers.forEach(clearTimeout);
  }, [isInView]);

  return (
    <div ref={ref} className="max-w-xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <span className="text-[10px] text-white/50 font-mono">COMP-002</span>
        <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/20">
          <div className="w-1.5 h-1.5 rounded-full bg-rose-400" />
          <span className="text-[8px] text-rose-400 font-semibold uppercase">Critical</span>
        </div>
      </div>

      {/* Evidence chain */}
      <div className="relative">
        {/* Connecting line */}
        <div className="absolute left-[15px] top-4 bottom-4 w-px bg-gradient-to-b from-purple-500/30 via-purple-500/20 to-transparent" />

        <div className="space-y-4">
          {EVIDENCE_STEPS.map((step, i) => {
            const isVisible = i === 0 || resolvedSteps.includes(i - 1);
            const isResolved = resolvedSteps.includes(i);
            const StepIcon = step.icon;

            return (
              <motion.div
                key={i}
                className="relative flex gap-3"
                initial={{ opacity: 0, x: -12 }}
                animate={isVisible ? { opacity: 1, x: 0 } : {}}
                transition={{ duration: 0.4, ease: EASE_STANDARD }}
              >
                {/* Step number */}
                <div className="relative z-10 w-[30px] h-[30px] rounded-full bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shrink-0">
                  {isResolved ? (
                    <CheckCircle className="size-3.5 text-emerald-400" />
                  ) : (
                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
                      <Loader2 className="size-3.5 text-purple-400" />
                    </motion.div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 rounded-lg bg-white/[0.02] border border-white/[0.04] p-3">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5">
                      <StepIcon className="size-3 text-purple-400/60" />
                      <span className="text-[9px] text-white/40">
                        {isResolved ? step.finding : step.action}
                      </span>
                    </div>
                    <span className="text-[7px] text-white/15 font-mono">{step.source}</span>
                  </div>
                  {isResolved && (
                    <motion.div
                      className="flex items-center gap-2 mt-1.5"
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <CheckCircle className="size-3 text-emerald-400" />
                      <span className="text-[8px] text-emerald-400/60 font-mono">Supports hypothesis</span>
                      <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 ml-auto">
                        <span className="text-[7px] text-emerald-400 font-mono font-semibold">{step.confidence}%</span>
                      </div>
                    </motion.div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Final report */}
      <AnimatePresence>
        {showReport && (
          <motion.div
            className="mt-5 rounded-xl bg-white/[0.03] border border-[#F5C518]/30 p-4"
            style={{ boxShadow: '0 0 20px rgba(245,197,24,0.08)' }}
            initial={{ opacity: 0, y: 16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={springPop}
          >
            <div className="flex items-center gap-2 mb-2">
              <BrainCircuit className="size-4 text-[#F5C518]" />
              <span className="text-[11px] font-semibold text-white/70">Root Cause Identified</span>
            </div>
            <p className="text-sm font-bold text-white/80 mb-1">Bearing Wear</p>
            <p className="text-[9px] text-white/35 mb-2">Exponential vibration increase matches bearing degradation curve. 3 similar historical incidents confirm pattern.</p>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                <span className="text-[8px] text-emerald-400 font-mono font-semibold">Confidence: 87%</span>
              </div>
              <span className="text-[8px] text-white/20">Immediate bearing replacement recommended</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Tab 3: Work Orders                                                 */
/* ------------------------------------------------------------------ */
const WO_STATES = [
  { label: 'Draft', color: '#6B7280' },
  { label: 'Pending', color: '#F59E0B' },
  { label: 'Approved', color: '#3B82F6' },
  { label: 'Assigned', color: '#8B5CF6' },
  { label: 'In Progress', color: '#F5C518' },
  { label: 'Completed', color: '#10B981' },
  { label: 'Verified', color: '#10B981' },
];

function WorkOrderTab() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true });
  const [phase, setPhase] = useState(0);
  const [activeState, setActiveState] = useState(0);

  useEffect(() => {
    if (!isInView) return;
    const timers = [
      setTimeout(() => setPhase(1), 400),   // card builds
      setTimeout(() => setPhase(2), 1200),   // priority + details
      setTimeout(() => setPhase(3), 2000),   // parts list
      setTimeout(() => setPhase(4), 2800),   // state: pending_approval
      setTimeout(() => { setPhase(5); setActiveState(1); }, 2800),
      setTimeout(() => setPhase(6), 4800),   // auto-approve
      setTimeout(() => { setActiveState(2); }, 5000),
      setTimeout(() => { setActiveState(3); }, 5400),
      setTimeout(() => { setActiveState(4); }, 5800),
      setTimeout(() => { setPhase(7); }, 6200), // show timeline
    ];
    return () => timers.forEach(clearTimeout);
  }, [isInView]);

  return (
    <div ref={ref} className="grid grid-cols-1 lg:grid-cols-2 gap-4 min-h-[320px]">
      {/* Left: Work order card */}
      <div className="space-y-3">
        {/* State machine ribbon */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1">
          {WO_STATES.map((state, i) => (
            <motion.div
              key={state.label}
              className="flex items-center gap-1 px-2 py-1 rounded-full border text-[7px] font-mono shrink-0"
              animate={{
                borderColor: i <= activeState ? `${state.color}40` : 'rgba(255,255,255,0.06)',
                backgroundColor: i === activeState ? `${state.color}15` : 'transparent',
                color: i <= activeState ? state.color : 'rgba(255,255,255,0.2)',
              }}
              transition={{ duration: 0.3 }}
            >
              {i === activeState && (
                <motion.div
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: state.color }}
                  layoutId="wo-state-dot"
                />
              )}
              {state.label}
            </motion.div>
          ))}
        </div>

        {/* Work order content */}
        <motion.div
          className="rounded-xl bg-white/[0.02] border border-white/[0.04] p-4"
          initial={{ opacity: 0, y: 12 }}
          animate={phase >= 1 ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.4 }}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[8px] text-white/20 font-mono">WO-2026-04821</span>
            <motion.div
              className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/20"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={phase >= 2 ? { opacity: 1, scale: 1 } : {}}
              transition={springPop}
            >
              <Zap className="size-2.5 text-rose-400" />
              <span className="text-[8px] text-rose-400 font-semibold">Urgent</span>
            </motion.div>
          </div>

          <p className="text-[11px] font-semibold text-white/60 mb-3">
            Replace bearing assembly — COMP-002
          </p>

          {/* Details grid */}
          <motion.div
            className="grid grid-cols-3 gap-2 mb-3"
            initial={{ opacity: 0 }}
            animate={phase >= 2 ? { opacity: 1 } : {}}
            transition={{ delay: 0.2, duration: 0.3 }}
          >
            {[
              { icon: DollarSign, label: 'Est. Cost', value: '$2,400', color: 'text-[#F5C518]' },
              { icon: Clock, label: 'Est. Hours', value: '6h', color: 'text-blue-400' },
              { icon: Wrench, label: 'Shutdown', value: 'Yes', color: 'text-amber-400' },
            ].map((d) => (
              <div key={d.label} className="rounded-md bg-white/[0.02] border border-white/[0.04] p-2 text-center">
                <d.icon className="size-3 mx-auto mb-0.5" style={{ color: d.color.includes('#') ? '#F5C518' : undefined }} />
                <p className="text-[7px] text-white/20 mb-0.5">{d.label}</p>
                <p className={`text-[9px] font-mono font-bold ${d.color}`}>{d.value}</p>
              </div>
            ))}
          </motion.div>

          {/* Parts list */}
          <motion.div
            className="space-y-1"
            initial={{ opacity: 0 }}
            animate={phase >= 3 ? { opacity: 1 } : {}}
            transition={{ duration: 0.3 }}
          >
            <p className="text-[8px] text-white/25 uppercase tracking-wide mb-1">Parts Required</p>
            {['Bearing kit (SKU-4821)', 'Alignment shims', 'Lubricant ISO VG 68'].map((part, i) => (
              <motion.div
                key={part}
                className="flex items-center gap-2 text-[8px] text-white/35 font-mono"
                initial={{ opacity: 0, x: -8 }}
                animate={phase >= 3 ? { opacity: 1, x: 0 } : {}}
                transition={{ delay: i * 0.1, duration: 0.2 }}
              >
                <div className="w-1 h-1 rounded-full bg-white/15" />
                {part}
              </motion.div>
            ))}
          </motion.div>
        </motion.div>

        {/* Approval gate */}
        <AnimatePresence>
          {phase >= 5 && phase < 6 && (
            <motion.div
              className="rounded-xl border border-[#F5C518]/30 p-3"
              style={{ boxShadow: '0 0 16px rgba(245,197,24,0.08)' }}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={springPop}
            >
              <div className="flex items-center gap-2 mb-2">
                <motion.div
                  animate={{ opacity: [1, 0.5, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  <ShieldCheck className="size-4 text-[#F5C518]" />
                </motion.div>
                <span className="text-[10px] font-semibold text-[#F5C518]">Human Approval Required</span>
              </div>
              <p className="text-[8px] text-white/30 mb-2">Cost exceeds $1K threshold. Shutdown required.</p>
              <motion.button
                className="px-3 py-1.5 rounded-md bg-[#F5C518]/20 border border-[#F5C518]/30 text-[9px] font-semibold text-[#F5C518]"
                animate={{ scale: [1, 1.03, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
              >
                Approve Work Order
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Right: Timeline */}
      <motion.div
        className="rounded-xl bg-white/[0.02] border border-white/[0.04] p-4"
        initial={{ opacity: 0 }}
        animate={phase >= 7 ? { opacity: 1 } : {}}
        transition={{ duration: 0.4 }}
      >
        <p className="text-[8px] text-white/25 uppercase tracking-wide mb-4">Status Timeline</p>
        <div className="relative">
          <div className="absolute left-[7px] top-2 bottom-2 w-px bg-gradient-to-b from-[#F5C518]/30 to-transparent" />
          <div className="space-y-4">
            {[
              { status: 'Draft', time: '14:32', who: 'AI Agent', color: '#6B7280' },
              { status: 'Pending Approval', time: '14:32', who: 'System', color: '#F59E0B' },
              { status: 'Approved', time: '14:34', who: 'John Miller', color: '#3B82F6' },
              { status: 'Assigned', time: '14:35', who: 'Field Crew #4', color: '#8B5CF6' },
              { status: 'In Progress', time: '14:48', who: 'Field Crew #4', color: '#F5C518' },
            ].map((entry, i) => (
              <motion.div
                key={entry.status}
                className="flex items-start gap-3"
                initial={{ opacity: 0, x: -8 }}
                animate={phase >= 7 ? { opacity: 1, x: 0 } : {}}
                transition={{ delay: i * 0.2, duration: 0.3 }}
              >
                <div
                  className="w-[15px] h-[15px] rounded-full border-2 shrink-0 mt-0.5"
                  style={{ borderColor: entry.color, backgroundColor: i === 4 ? entry.color : 'transparent' }}
                />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-semibold" style={{ color: entry.color }}>{entry.status}</span>
                    <span className="text-[7px] text-white/15 font-mono">{entry.time}</span>
                  </div>
                  <span className="text-[8px] text-white/25">{entry.who}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Tab 4: Optimization                                                */
/* ------------------------------------------------------------------ */
function OptimizationTab() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true });
  const [phase, setPhase] = useState(0);
  const [scanX, setScanX] = useState(0);

  const chatResponse = "Deferring COMP-002 bearing replacement by 7 days increases failure probability to 84%. Estimated downtime cost: $2.1M. I recommend immediate action.";
  const { displayText, isComplete: chatDone } = useTypewriter(chatResponse, 25, 0, phase >= 5);

  useEffect(() => {
    if (!isInView) return;
    const timers = [
      setTimeout(() => setPhase(1), 300),    // grid appears
      setTimeout(() => setPhase(2), 800),    // scan starts
      setTimeout(() => setPhase(3), 3500),   // scan done, cards appear
      setTimeout(() => setPhase(4), 5000),   // chat user message
      setTimeout(() => setPhase(5), 5800),   // chat response typing
    ];
    return () => timers.forEach(clearTimeout);
  }, [isInView]);

  // Scan animation
  useEffect(() => {
    if (phase < 2 || phase >= 3) return;
    let raf: number;
    const start = Date.now();
    const duration = 2500;
    const tick = () => {
      const pct = Math.min((Date.now() - start) / duration, 1);
      setScanX(pct * 100);
      if (pct < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase]);

  const flagged = [4, 11, 17]; // indices of flagged compressors

  const recommendations = [
    { title: 'Replace bearing — COMP-002', savings: '$2,400', uptime: '+1.2%', priority: 'urgent' },
    { title: 'Packing inspection — COMP-047', savings: '$800', uptime: '+0.4%', priority: 'high' },
    { title: 'Defer cooler service — COMP-891', savings: '$0', uptime: 'No risk', priority: 'low' },
  ];

  return (
    <div ref={ref} className="space-y-4 min-h-[320px]">
      {/* Fleet scan grid */}
      <div className="relative rounded-xl bg-white/[0.02] border border-white/[0.04] p-4">
        <p className="text-[8px] text-white/25 uppercase tracking-wide mb-3">Fleet Scan — 4,700 pipeline assets</p>
        <div className="relative grid grid-cols-10 gap-1.5">
          {Array.from({ length: 20 }).map((_, i) => {
            const isFlagged = flagged.includes(i);
            const scanReached = phase >= 2 && (scanX / 100) * 10 > (i % 10);
            const showFlagged = phase >= 3 && isFlagged;
            return (
              <motion.div
                key={i}
                className="h-5 rounded-sm"
                initial={{ opacity: 0 }}
                animate={phase >= 1 ? {
                  opacity: 1,
                  backgroundColor: showFlagged
                    ? 'rgba(245,158,11,0.6)'
                    : scanReached
                      ? 'rgba(255,255,255,0.12)'
                      : 'rgba(255,255,255,0.04)',
                } : {}}
                transition={{ delay: i * 0.02, duration: 0.2 }}
              />
            );
          })}

          {/* Scan line */}
          {phase >= 2 && phase < 3 && (
            <motion.div
              className="absolute top-0 bottom-0 w-[2px] bg-[#F5C518] z-10"
              style={{
                left: `${scanX}%`,
                boxShadow: '0 0 8px rgba(245,197,24,0.6), 0 0 16px rgba(245,197,24,0.3)',
              }}
            />
          )}
        </div>
        {phase >= 3 && (
          <motion.p
            className="text-[8px] text-amber-400 font-mono mt-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            3 assets flagged for attention
          </motion.p>
        )}
      </div>

      {/* Recommendation cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {recommendations.map((rec, i) => (
          <motion.div
            key={rec.title}
            className="rounded-xl bg-white/[0.02] border border-white/[0.04] p-3"
            initial={{ opacity: 0, y: 16 }}
            animate={phase >= 3 ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: i * 0.2, ...springPop }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[8px] text-white/20 font-mono uppercase">Recommendation</span>
              <span
                className="text-[7px] font-semibold px-1.5 py-0.5 rounded-full border"
                style={{
                  color: rec.priority === 'urgent' ? '#EF4444' : rec.priority === 'high' ? '#F59E0B' : '#6B7280',
                  borderColor: rec.priority === 'urgent' ? '#EF444430' : rec.priority === 'high' ? '#F59E0B30' : '#6B728030',
                  backgroundColor: rec.priority === 'urgent' ? '#EF444410' : rec.priority === 'high' ? '#F59E0B10' : '#6B728010',
                }}
              >
                {rec.priority}
              </span>
            </div>
            <p className="text-[9px] text-white/50 font-medium mb-2">{rec.title}</p>
            <div className="flex items-center gap-3 text-[8px] font-mono">
              <span className="text-emerald-400">{rec.savings} saved</span>
              <span className="text-blue-400">{rec.uptime}</span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Mini chat */}
      <div className="rounded-xl bg-white/[0.02] border border-white/[0.04] p-4">
        <div className="flex items-center gap-2 mb-3">
          <MessageSquare className="size-3 text-blue-400" />
          <span className="text-[8px] text-white/25 uppercase tracking-wide">Optimization Copilot</span>
        </div>
        <div className="space-y-2">
          {/* User message */}
          <motion.div
            className="flex justify-end"
            initial={{ opacity: 0, y: 8 }}
            animate={phase >= 4 ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.3 }}
          >
            <div className="flex items-start gap-2 max-w-[80%]">
              <div className="rounded-lg bg-blue-500/15 border border-blue-500/20 px-3 py-2">
                <p className="text-[9px] text-blue-300">What if we defer COMP-002?</p>
              </div>
              <div className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0 mt-0.5">
                <User className="size-2.5 text-blue-400" />
              </div>
            </div>
          </motion.div>

          {/* Bot response */}
          <motion.div
            className="flex justify-start"
            initial={{ opacity: 0, y: 8 }}
            animate={phase >= 5 ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.3 }}
          >
            <div className="flex items-start gap-2 max-w-[85%]">
              <div className="w-5 h-5 rounded-full bg-[#F5C518]/20 flex items-center justify-center shrink-0 mt-0.5">
                <Bot className="size-2.5 text-[#F5C518]" />
              </div>
              <div className="rounded-lg bg-white/[0.03] border border-white/[0.06] px-3 py-2">
                <p className="text-[9px] text-white/40 leading-relaxed">
                  {displayText}
                  {!chatDone && (
                    <motion.span
                      className="inline-block w-[1px] h-3 bg-white/40 ml-0.5 align-middle"
                      animate={{ opacity: [1, 0, 1] }}
                      transition={{ duration: 0.8, repeat: Infinity }}
                    />
                  )}
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

/* ================================================================== */
/*  Main Component                                                     */
/* ================================================================== */
export default function AgentFlowDemo() {
  const { activeTab, selectTab, progress, containerRef } = useAutoTabs(4, 8000);

  const TAB_COMPONENTS = [FleetMonitoringTab, InvestigationTab, WorkOrderTab, OptimizationTab];
  const ActiveComponent = TAB_COMPONENTS[activeTab];

  return (
    <section className="relative py-24 sm:py-32 overflow-hidden">
      <div className="absolute inset-0 bg-[#0C1018]" />

      <div ref={containerRef} className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.5 }}
        >
          <p className="text-[11px] font-semibold text-[#F5C518] uppercase tracking-[0.15em] mb-3">See It In Action</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-white/90 mb-4">
            AI agents that monitor, investigate, and fix
          </h2>
          <p className="text-lg text-white/40 max-w-2xl mx-auto">
            Watch how Altaviz detects an anomaly, traces root cause, and generates a work order — autonomously.
          </p>
        </motion.div>

        {/* Tab bar */}
        <div className="flex items-center justify-center gap-1 mb-8 overflow-x-auto pb-2">
          {TABS.map((tab, i) => {
            const isActive = activeTab === i;
            const TabIcon = tab.icon;
            return (
              <button
                key={tab.label}
                onClick={() => selectTab(i)}
                className="relative flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors shrink-0"
                style={{
                  color: isActive ? tab.color : 'rgba(255,255,255,0.3)',
                  backgroundColor: isActive ? `${tab.color}10` : 'transparent',
                }}
              >
                <TabIcon className="size-4" />
                <span className="hidden sm:inline">{tab.label}</span>
                {/* Progress bar */}
                {isActive && (
                  <motion.div
                    className="absolute bottom-0 left-0 h-[2px] rounded-full"
                    style={{ backgroundColor: tab.color, width: `${progress * 100}%` }}
                    layoutId="tab-progress"
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-6 sm:p-10 min-h-[480px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              variants={tabContentVariants}
              initial="enter"
              animate="center"
              exit="exit"
            >
              <ActiveComponent />
            </motion.div>
          </AnimatePresence>
        </div>

        {/* CTA */}
        <motion.div
          className="text-center mt-10"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-3 text-base font-medium text-[#0A0A0A] border-2 border-[#F5C518] bg-[#F5C518] hover:bg-[#FFD84D] hover:border-[#FFD84D] transition-all px-7 py-3.5 rounded-lg"
          >
            See It In Action
            <ArrowRight className="size-4" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
