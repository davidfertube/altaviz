'use client';

import { useRef, useEffect, useState } from 'react';
import { motion, useInView } from 'framer-motion';

/* ------------------------------------------------------------------ */
/*  Animated counter (reused for all KPI headings)                     */
/* ------------------------------------------------------------------ */
function AnimatedCounter({ value, suffix, prefix }: { value: number; suffix: string; prefix: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  useEffect(() => {
    if (!isInView) return;

    const duration = 2000;
    const steps = 60;
    const increment = value / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= value) {
        setCount(value);
        clearInterval(timer);
      } else {
        setCount(current);
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [isInView, value]);

  const formatted = value >= 1000
    ? `${Math.round(count).toLocaleString()}`
    : value % 1 !== 0
      ? count.toFixed(1)
      : Math.round(count).toString();

  return (
    <span ref={ref} className="font-mono">
      {prefix}{formatted}{suffix}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Card 1: Pipeline Coverage — horizontal bar segments                */
/* ------------------------------------------------------------------ */
function PipelineCoverageMockup() {
  const pipelines = [
    { id: 'PL-001', miles: 340, health: 'healthy' as const },
    { id: 'PL-002', miles: 280, health: 'healthy' as const },
    { id: 'PL-003', miles: 410, health: 'healthy' as const },
    { id: 'PL-004', miles: 195, health: 'warning' as const },
    { id: 'PL-005', miles: 320, health: 'healthy' as const },
    { id: 'PL-006', miles: 260, health: 'healthy' as const },
    { id: 'PL-007', miles: 155, health: 'critical' as const },
    { id: 'PL-008', miles: 440, health: 'healthy' as const },
  ];
  const colors = { healthy: '#10B981', warning: '#F59E0B', critical: '#EF4444' };
  const maxMiles = 440;

  return (
    <div className="space-y-1.5 mt-4">
      {pipelines.map((pl, i) => (
        <div key={pl.id} className="flex items-center gap-2">
          <span className="text-[7px] text-white/25 group-hover:text-white/40 transition-colors font-mono w-8 shrink-0">{pl.id}</span>
          <div className="flex-1 h-2.5 group-hover:h-3 transition-all rounded-full bg-white/[0.04] overflow-hidden">
            <motion.div
              className="h-full rounded-full transition-shadow group-hover:shadow-[0_0_8px_var(--bar-color)]"
              style={{ backgroundColor: colors[pl.health], opacity: 0.8, '--bar-color': colors[pl.health] } as React.CSSProperties}
              initial={{ width: 0 }}
              whileInView={{ width: `${(pl.miles / maxMiles) * 100}%` }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.3 + i * 0.08, ease: 'easeOut' }}
            />
          </div>
          <motion.span
            className="text-[7px] font-mono w-7 text-right shrink-0 group-hover:opacity-100 transition-opacity"
            style={{ color: colors[pl.health] }}
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 0.7 }}
            viewport={{ once: true }}
            transition={{ delay: 0.6 + i * 0.08 }}
          >
            {pl.miles}
          </motion.span>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Card 2: Early Warning Timeline — trend + detection markers         */
/* ------------------------------------------------------------------ */
function EarlyWarningMockup() {
  return (
    <div className="mt-4">
      <svg viewBox="0 0 260 80" className="w-full">
        <defs>
          <linearGradient id="warnGrad" x1="0" y1="0" x2="260" y2="0" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="rgba(16,185,129,0.7)" />
            <stop offset="60%" stopColor="rgba(196,167,125,0.7)" />
            <stop offset="100%" stopColor="rgba(239,68,68,0.9)" />
          </linearGradient>
          <linearGradient id="warnFill" x1="0" y1="0" x2="0" y2="80" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="rgba(196,167,125,0.06)" />
            <stop offset="100%" stopColor="rgba(196,167,125,0)" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        <line x1="0" y1="60" x2="260" y2="60" stroke="rgba(255,255,255,0.04)" strokeWidth="0.5" />
        <line x1="0" y1="40" x2="260" y2="40" stroke="rgba(255,255,255,0.04)" strokeWidth="0.5" />
        <line x1="0" y1="20" x2="260" y2="20" stroke="rgba(255,255,255,0.04)" strokeWidth="0.5" />

        {/* Threshold line */}
        <line x1="0" y1="15" x2="260" y2="15" stroke="rgba(239,68,68,0.2)" strokeWidth="0.5" strokeDasharray="3 3" />
        <text x="258" y="12" textAnchor="end" fill="rgba(239,68,68,0.3)" fontSize="4" fontFamily="monospace">THRESHOLD</text>

        {/* Area fill */}
        <motion.path
          d="M0,58 L32,56 L65,55 L97,54 L130,48 L162,38 L195,26 L227,18 L260,12 L260,80 L0,80 Z"
          fill="url(#warnFill)"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.5 }}
        />

        {/* Trend line */}
        <motion.path
          d="M0,58 L32,56 L65,55 L97,54 L130,48 L162,38 L195,26 L227,18 L260,12"
          fill="none"
          stroke="url(#warnGrad)"
          strokeWidth="1.5"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          whileInView={{ pathLength: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1.5, delay: 0.3 }}
        />

        {/* Detection marker (emerald flag) */}
        <motion.g
          initial={{ opacity: 0, y: 5 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 1.2 }}
        >
          <line x1="130" y1="48" x2="130" y2="72" stroke="rgba(16,185,129,0.4)" strokeWidth="0.5" strokeDasharray="2 2" />
          <rect x="115" y="72" width="30" height="8" rx="2" fill="rgba(16,185,129,0.15)" stroke="rgba(16,185,129,0.3)" strokeWidth="0.5" />
          <text x="130" y="77.5" textAnchor="middle" fill="rgba(16,185,129,0.8)" fontSize="4" fontFamily="monospace">DETECTED</text>
          <circle cx="130" cy="48" r="3" fill="none" stroke="#10B981" strokeWidth="0.8" />
          <circle cx="130" cy="48" r="1.5" fill="#10B981" />
        </motion.g>

        {/* Failure marker (rose flag) */}
        <motion.g
          initial={{ opacity: 0, y: 5 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 1.6 }}
        >
          <line x1="258" y1="12" x2="258" y2="72" stroke="rgba(239,68,68,0.3)" strokeWidth="0.5" strokeDasharray="2 2" />
          <rect x="238" y="72" width="22" height="8" rx="2" fill="rgba(239,68,68,0.15)" stroke="rgba(239,68,68,0.3)" strokeWidth="0.5" />
          <text x="249" y="77.5" textAnchor="middle" fill="rgba(239,68,68,0.8)" fontSize="4" fontFamily="monospace">FAILURE</text>
        </motion.g>

        {/* 48hr span arrow */}
        <motion.g
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 1.8 }}
        >
          <line x1="135" y1="68" x2="253" y2="68" stroke="rgba(196,167,125,0.5)" strokeWidth="0.5" />
          <polygon points="135,66 138,68 135,70" fill="rgba(196,167,125,0.5)" />
          <polygon points="253,66 250,68 253,70" fill="rgba(196,167,125,0.5)" />
          <rect x="178" y="64" width="24" height="8" rx="2" fill="rgba(196,167,125,0.1)" />
          <text x="190" y="69.5" textAnchor="middle" fill="rgba(196,167,125,0.8)" fontSize="5" fontFamily="monospace" fontWeight="bold">48hr</text>
        </motion.g>
      </svg>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Card 3: Uptime Grid — GitHub-style contribution heatmap            */
/* ------------------------------------------------------------------ */
function UptimeGridMockup() {
  const days = Array.from({ length: 90 }, (_, i) => {
    if (i === 31 || i === 67) return 'warning';
    return 'healthy';
  });
  const colors = { healthy: '#10B981', warning: '#F59E0B' };

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[7px] text-white/20 font-mono">90-day history</span>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-sm bg-emerald-500/70" />
            <span className="text-[6px] text-white/20 font-mono">Online</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-sm bg-amber-500/70" />
            <span className="text-[6px] text-white/20 font-mono">Degraded</span>
          </div>
        </div>
      </div>
      <div className="grid gap-[3px]" style={{ gridTemplateColumns: 'repeat(15, minmax(0, 1fr))' }}>
        {days.map((status, i) => (
          <motion.div
            key={i}
            className="aspect-square rounded-[2px] group-hover:shadow-[0_0_4px_var(--sq-color)] transition-shadow"
            style={{ backgroundColor: colors[status as keyof typeof colors], opacity: 0.65, '--sq-color': `${colors[status as keyof typeof colors]}60` } as React.CSSProperties}
            initial={{ opacity: 0, scale: 0.5 }}
            whileInView={{ opacity: status === 'warning' ? 0.9 : 0.65, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.2, delay: 0.3 + i * 0.012 }}
          />
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Card 4: Shutdown Reduction — Before/After comparison bars          */
/* ------------------------------------------------------------------ */
function ShutdownReductionMockup() {
  return (
    <div className="mt-4 space-y-4">
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[8px] text-white/30 group-hover:text-white/50 transition-colors font-mono">Before Altaviz</span>
          <motion.span
            className="text-[8px] text-rose-400/70 font-mono"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 1 }}
          >
            12 shutdowns/yr
          </motion.span>
        </div>
        <div className="h-5 rounded-md bg-white/[0.04] overflow-hidden">
          <motion.div
            className="h-full rounded-md bg-rose-500/30 border border-rose-500/20 group-hover:bg-rose-500/40 group-hover:shadow-[0_0_12px_rgba(239,68,68,0.2)] transition-all"
            initial={{ width: 0 }}
            whileInView={{ width: '100%' }}
            viewport={{ once: true }}
            transition={{ duration: 1, delay: 0.3, ease: 'easeOut' }}
          />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[8px] text-white/30 group-hover:text-white/50 transition-colors font-mono">With Altaviz</span>
          <motion.span
            className="text-[8px] text-emerald-400/70 font-mono"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 1.2 }}
          >
            7 shutdowns/yr
          </motion.span>
        </div>
        <div className="h-5 rounded-md bg-white/[0.04] overflow-hidden">
          <motion.div
            className="h-full rounded-md bg-emerald-500/40 border border-emerald-500/20 group-hover:bg-emerald-500/50 group-hover:shadow-[0_0_12px_rgba(16,185,129,0.2)] transition-all"
            initial={{ width: 0 }}
            whileInView={{ width: '60%' }}
            viewport={{ once: true }}
            transition={{ duration: 1, delay: 0.5, ease: 'easeOut' }}
          />
        </div>
      </div>

      <motion.div
        className="flex items-center justify-center gap-1.5 rounded-md bg-emerald-500/[0.06] border border-emerald-500/10 py-1.5"
        initial={{ opacity: 0, y: 4 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 1.4 }}
      >
        <svg className="w-3 h-3 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
        <span className="text-[8px] text-emerald-400/80 font-mono font-bold">40% REDUCTION</span>
      </motion.div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Stats data                                                         */
/* ------------------------------------------------------------------ */
const STATS = [
  { value: 2400, suffix: '+', prefix: '', label: 'Miles Monitored', Viz: PipelineCoverageMockup },
  { value: 48, suffix: 'hr', prefix: '', label: 'Avg Early Warning', Viz: EarlyWarningMockup },
  { value: 99.7, suffix: '%', prefix: '', label: 'Monitoring Uptime', Viz: UptimeGridMockup },
  { value: 40, suffix: '%', prefix: '', label: 'Fewer Unplanned Shutdowns', Viz: ShutdownReductionMockup },
];

/* ================================================================== */
/*  Impact Section                                                     */
/* ================================================================== */
export default function Stats() {
  return (
    <section id="impact" className="section-viewport relative py-24 sm:py-32">
      <div className="absolute inset-0 bg-[#F5F0E8]" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-[#1C1917] mb-4">
            Measured impact
          </h2>
          <p className="text-lg text-[#78716C] max-w-xl mx-auto">
            Deployed across transmission and gathering systems
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {STATS.map((stat, i) => (
            <motion.div
              key={stat.label}
              className="group rounded-2xl bg-[#0C1018] border border-white/[0.06] p-6 cursor-pointer"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              whileHover={{
                scale: 1.04,
                borderColor: 'rgba(196, 167, 125, 0.3)',
                boxShadow: '0 0 30px rgba(196, 167, 125, 0.12), 0 0 60px rgba(196, 167, 125, 0.05)',
              }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
            >
              <div className="text-center">
                <div className="text-3xl sm:text-4xl font-bold text-[#C4A77D] group-hover:text-[#D4B98D] group-hover:drop-shadow-[0_0_8px_rgba(196,167,125,0.3)] transition-all">
                  <AnimatedCounter value={stat.value} suffix={stat.suffix} prefix={stat.prefix} />
                </div>
                <p className="text-xs text-white/40 group-hover:text-white/60 mt-1 tracking-wide uppercase transition-colors">{stat.label}</p>
              </div>
              <stat.Viz />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
