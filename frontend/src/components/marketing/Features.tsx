'use client';

import { useState } from 'react';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { AlertTriangle, BrainCircuit, ClipboardCheck, CheckCircle, Activity, Gauge, Bot, Thermometer, Leaf, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { EASE_STANDARD } from './motion-constants';

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
          { label: 'Avg Health', value: '94%', color: 'text-[#F5C518]' },
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
            <linearGradient id="anomGradTab" x1="0" y1="0" x2="300" y2="0" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="rgba(16,185,129,0.6)" />
              <stop offset="60%" stopColor="rgba(245,197,24,0.6)" />
              <stop offset="100%" stopColor="rgba(239,68,68,0.9)" />
            </linearGradient>
            <linearGradient id="anomFillTab" x1="0" y1="0" x2="0" y2="70" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="rgba(239,68,68,0.08)" />
              <stop offset="100%" stopColor="rgba(239,68,68,0)" />
            </linearGradient>
          </defs>
          <line x1="0" y1="20" x2="300" y2="20" stroke="rgba(245,158,11,0.25)" strokeWidth="0.5" strokeDasharray="3 3" />
          <text x="300" y="18" textAnchor="end" className="text-[5px] fill-amber-400/40 font-mono">WARN 6.0</text>
          <line x1="0" y1="10" x2="300" y2="10" stroke="rgba(239,68,68,0.25)" strokeWidth="0.5" strokeDasharray="3 3" />
          <text x="300" y="8" textAnchor="end" className="text-[5px] fill-rose-400/40 font-mono">CRIT 8.0</text>
          <motion.path
            d="M0,50 L30,48 L60,50 L90,46 L120,44 L150,40 L180,35 L210,28 L240,22 L270,16 L300,12 L300,70 L0,70 Z"
            fill="url(#anomFillTab)"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.6 }}
          />
          <motion.path
            d="M0,50 L30,48 L60,50 L90,46 L120,44 L150,40 L180,35 L210,28 L240,22 L270,16 L300,12"
            fill="none"
            stroke="url(#anomGradTab)"
            strokeWidth="1.5"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            whileInView={{ pathLength: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1.2, delay: 0.3 }}
          />
          <motion.circle
            cx="270" cy="16" r="4"
            fill="none" stroke="#EF4444" strokeWidth="1"
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
/*  AI Agent Pipeline mockup                                           */
/* ------------------------------------------------------------------ */
function AIAgentMockup() {
  const steps = [
    { label: 'Anomaly Detected', detail: 'COMP-2847 · Vibration drift +12%', color: '#EF4444', Icon: AlertTriangle },
    { label: 'Root Cause Found', detail: 'Bearing wear — 87% confidence', color: '#8B5CF6', Icon: BrainCircuit },
    { label: 'Work Order Created', detail: 'WO-4821 · Priority: High · Est. $2,400', color: '#F5C518', Icon: ClipboardCheck },
    { label: 'Technician Assigned', detail: 'Field crew notified · ETA 4hr', color: '#10B981', Icon: CheckCircle },
  ];

  return (
    <div className="rounded-2xl bg-[#0C1018] p-5 border border-white/[0.06]">
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

      <div className="relative">
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
              <div
                className="relative z-10 w-[38px] h-[38px] rounded-lg flex items-center justify-center shrink-0"
                style={{ backgroundColor: `${step.color}15`, border: `1px solid ${step.color}30` }}
              >
                <step.Icon className="size-4" style={{ color: step.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-semibold text-white/60">{step.label}</p>
                <p className="text-[8px] text-white/25 font-mono truncate">{step.detail}</p>
              </div>
              <span className="text-[7px] font-mono text-white/10 shrink-0">{String(i + 1).padStart(2, '0')}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Temperature Drift mockup                                           */
/* ------------------------------------------------------------------ */
function TempDriftMockup() {
  const predictions = [
    { id: 'COMP-2847', current: '218°F', warnIn: '14hr', critIn: '31hr', drift: '+2.4°F/hr', severity: 'warning' as const },
    { id: 'COMP-1203', current: '205°F', warnIn: '38hr', critIn: '72hr', drift: '+0.9°F/hr', severity: 'healthy' as const },
    { id: 'COMP-0891', current: '226°F', warnIn: '4hr', critIn: '12hr', drift: '+3.1°F/hr', severity: 'critical' as const },
  ];
  const severityColors = { healthy: '#10B981', warning: '#F59E0B', critical: '#EF4444' };

  return (
    <div className="rounded-2xl bg-[#0C1018] p-5 border border-white/[0.06]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-[10px] text-white/40 font-mono uppercase tracking-wider">Temperature Drift</span>
        <span className="text-[8px] text-amber-400 font-mono px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20">1 CRITICAL</span>
      </div>

      {/* Temperature trend chart */}
      <div className="rounded-lg bg-white/[0.02] border border-white/[0.04] p-3 mb-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[8px] text-white/25 uppercase tracking-wide">COMP-0891 Discharge Temp (°F)</span>
          <span className="text-[7px] text-rose-400/70 font-mono">+3.1°F/hr</span>
        </div>
        <svg viewBox="0 0 300 80" className="w-full h-16">
          <defs>
            <linearGradient id="tempGrad" x1="0" y1="0" x2="300" y2="0" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="rgba(16,185,129,0.6)" />
              <stop offset="50%" stopColor="rgba(245,158,11,0.6)" />
              <stop offset="100%" stopColor="rgba(239,68,68,0.9)" />
            </linearGradient>
            <linearGradient id="tempFill" x1="0" y1="0" x2="0" y2="80" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="rgba(245,158,11,0.08)" />
              <stop offset="100%" stopColor="rgba(245,158,11,0)" />
            </linearGradient>
          </defs>
          {/* Threshold lines */}
          <line x1="0" y1="25" x2="300" y2="25" stroke="rgba(245,158,11,0.25)" strokeWidth="0.5" strokeDasharray="3 3" />
          <text x="300" y="23" textAnchor="end" className="text-[5px] fill-amber-400/40 font-mono">WARN 230°F</text>
          <line x1="0" y1="12" x2="300" y2="12" stroke="rgba(239,68,68,0.25)" strokeWidth="0.5" strokeDasharray="3 3" />
          <text x="300" y="10" textAnchor="end" className="text-[5px] fill-rose-400/40 font-mono">CRIT 250°F</text>
          {/* Actual temp line — rising curve */}
          <motion.path
            d="M0,60 L30,58 L60,55 L90,52 L120,48 L150,44 L180,40 L210,36 L240,32 L270,28 L300,24"
            fill="none"
            stroke="url(#tempGrad)"
            strokeWidth="1.5"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            whileInView={{ pathLength: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1.2, delay: 0.3 }}
          />
          {/* Predicted line (dashed continuation) */}
          <motion.path
            d="M300,24 L340,20 L380,15 L420,10"
            fill="none"
            stroke="rgba(239,68,68,0.4)"
            strokeWidth="1"
            strokeLinecap="round"
            strokeDasharray="4 3"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 1.5, duration: 0.5 }}
          />
          {/* Fill area */}
          <motion.path
            d="M0,60 L30,58 L60,55 L90,52 L120,48 L150,44 L180,40 L210,36 L240,32 L270,28 L300,24 L300,80 L0,80 Z"
            fill="url(#tempFill)"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.6 }}
          />
        </svg>
      </div>

      {/* Predictions table */}
      <div className="space-y-1.5">
        {predictions.map((pred, i) => (
          <motion.div
            key={pred.id}
            className="flex items-center gap-2 rounded-md bg-white/[0.02] border border-white/[0.04] px-2.5 py-2"
            initial={{ opacity: 0, x: -10 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 1.6 + i * 0.15 }}
          >
            <div
              className="w-1.5 h-1.5 rounded-full shrink-0"
              style={{ backgroundColor: severityColors[pred.severity], boxShadow: `0 0 6px ${severityColors[pred.severity]}40` }}
            />
            <span className="text-[8px] text-white/40 font-mono shrink-0 w-16">{pred.id}</span>
            <span className="text-[8px] text-white/30 font-mono shrink-0 w-10">{pred.current}</span>
            <div className="flex-1" />
            <span className="text-[7px] text-white/20 font-mono">warn</span>
            <span className="text-[8px] font-mono font-bold" style={{ color: severityColors[pred.severity] }}>{pred.warnIn}</span>
            <span className="text-[7px] text-white/20 font-mono">crit</span>
            <span className="text-[8px] text-white/30 font-mono">{pred.critIn}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Emissions Tracking mockup                                          */
/* ------------------------------------------------------------------ */
function EmissionsTrackingMockup() {
  const stations = [
    { name: 'Station Alpha', ch4: 12.4, co2e: 310, status: 'compliant' as const },
    { name: 'Station Bravo', ch4: 18.1, co2e: 453, status: 'warning' as const },
    { name: 'Station Charlie', ch4: 8.7, co2e: 218, status: 'compliant' as const },
  ];
  const statusColors = { compliant: '#10B981', warning: '#F59E0B' };

  return (
    <div className="rounded-2xl bg-[#0C1018] p-5 border border-white/[0.06]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-[10px] text-white/40 font-mono uppercase tracking-wider">Emissions Tracking</span>
        <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <span className="text-[8px] text-emerald-400 font-mono">EPA COMPLIANT</span>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        {[
          { label: 'CH\u2084 (tons/yr)', value: '39.2', color: 'text-emerald-400' },
          { label: 'CO\u2082e (tons/yr)', value: '981', color: 'text-[#F5C518]' },
          { label: 'OOOOb Status', value: 'Pass', color: 'text-emerald-400' },
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

      {/* Emissions bar chart */}
      <div className="rounded-lg bg-white/[0.02] border border-white/[0.04] p-3 mb-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[8px] text-white/25 uppercase tracking-wide">Monthly CH\u2084 by Station</span>
          <span className="text-[7px] text-white/20 font-mono">tons/month</span>
        </div>
        <div className="space-y-2">
          {stations.map((station, i) => (
            <motion.div key={station.name} className="flex items-center gap-2"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.5 + i * 0.15 }}
            >
              <span className="text-[7px] text-white/30 font-mono w-16 shrink-0 truncate">{station.name}</span>
              <div className="flex-1 h-3 rounded-full bg-white/[0.04] overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ backgroundColor: statusColors[station.status] }}
                  initial={{ width: 0 }}
                  whileInView={{ width: `${(station.ch4 / 25) * 100}%` }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.8, delay: 0.7 + i * 0.15 }}
                />
              </div>
              <span className="text-[8px] font-mono font-bold shrink-0" style={{ color: statusColors[station.status] }}>
                {station.ch4}
              </span>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Compliance badges */}
      <div className="flex items-center gap-2">
        {['EPA Subpart W', '49 CFR 192', 'OOOOb'].map((badge, i) => (
          <motion.div
            key={badge}
            className="flex items-center gap-1 px-2 py-1 rounded-md bg-white/[0.02] border border-white/[0.04]"
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 1.4 + i * 0.1 }}
          >
            <Leaf className="size-2.5 text-emerald-400/60" />
            <span className="text-[7px] text-white/30 font-mono">{badge}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Tab definitions                                                    */
/* ------------------------------------------------------------------ */
const FEATURE_TABS = [
  {
    label: 'Fleet Overview',
    icon: Gauge,
    title: 'See every pipeline asset. In real time.',
    description: 'Health scores, vibration trends, and thermal maps across your entire fleet — updated every 5 minutes. Drill down to any asset, any sensor, in one click.',
    Mockup: FleetOverviewMockup,
  },
  {
    label: 'Anomaly Detection',
    icon: Activity,
    title: 'Catch failures 48 hours early',
    description: 'ML models learn each asset\u2019s normal behavior. When vibration, temperature, or pressure starts to drift — you know first.',
    Mockup: AnomalyDetectionMockup,
  },
  {
    label: 'AI Agents',
    icon: Bot,
    title: 'AI investigates. You approve.',
    description: 'When Altaviz detects a problem, AI agents trace root cause, check maintenance history, and generate a work order — complete with parts list and cost estimate.',
    Mockup: AIAgentMockup,
  },
  {
    label: 'Temp Drift',
    icon: Thermometer,
    title: 'Know when heat becomes a threat.',
    description: 'Linear regression models track discharge temperature trends per compressor and predict hours until warning and critical thresholds — so you act before the shutdown.',
    Mockup: TempDriftMockup,
  },
  {
    label: 'Emissions',
    icon: Leaf,
    title: 'Stay compliant. Automatically.',
    description: 'EPA Subpart W emission factors applied to real-time sensor data. CH\u2084 and CO\u2082e tracked per station, per compressor — ready for OOOOb reporting in one click.',
    Mockup: EmissionsTrackingMockup,
  },
];

/* ================================================================== */
/*  Platform Section (Tab-Based)                                       */
/* ================================================================== */
export default function Features() {
  const [activeTab, setActiveTab] = useState(0);
  const { title, description, Mockup } = FEATURE_TABS[activeTab];

  return (
    <section id="platform" className="section-viewport relative py-24 sm:py-32">
      <div className="absolute inset-0 bg-[#FAFAFA]" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-[#0A0A0A] mb-4">
            One platform. Complete fleet visibility.
          </h2>
          <p className="text-lg text-[#6B7280] max-w-2xl mx-auto">
            From the sensor on the pipeline to the work order in the field.
          </p>
        </motion.div>

        {/* Tab bar */}
        <LayoutGroup>
          <div className="flex items-center justify-center gap-2 mb-10">
            {FEATURE_TABS.map((tab, i) => {
              const isActive = activeTab === i;
              const TabIcon = tab.icon;
              return (
                <button
                  key={tab.label}
                  onClick={() => setActiveTab(i)}
                  className={`relative flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'text-[#0A0A0A]'
                      : 'text-[#9CA3AF] hover:text-[#6B7280]'
                  }`}
                >
                  <TabIcon className="size-4" />
                  {tab.label}
                  {isActive && (
                    <motion.div
                      className="absolute bottom-0 left-2 right-2 h-[2px] rounded-full bg-[#F5C518]"
                      layoutId="features-tab-indicator"
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </LayoutGroup>

        {/* Tab content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.4, ease: EASE_STANDARD }}
          >
            <div>
              <Mockup />
            </div>
            <div>
              <h3 className="text-2xl sm:text-3xl font-bold text-[#0A0A0A] mb-3">
                {title}
              </h3>
              <p className="text-base text-[#6B7280] leading-relaxed max-w-md mb-6">
                {description}
              </p>
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-3 text-base font-medium text-[#0A0A0A] border-2 border-[#F5C518] bg-[#F5C518] hover:bg-[#FFD84D] hover:border-[#FFD84D] transition-all px-7 py-3.5 rounded-lg"
              >
                Try the Demo
                <ArrowRight className="size-4" />
              </Link>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}
