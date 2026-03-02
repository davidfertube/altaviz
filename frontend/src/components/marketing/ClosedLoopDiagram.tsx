'use client';

import { motion } from 'framer-motion';
import { TrendingUp, Search, ClipboardCheck, BookOpen } from 'lucide-react';
import { EASE_STANDARD, springPop } from './motion-constants';

/* ------------------------------------------------------------------ */
/*  Agent node definitions                                             */
/* ------------------------------------------------------------------ */
const AGENTS = [
  {
    label: 'Optimization',
    description: 'Proactive fleet scans detect issues before they escalate',
    icon: TrendingUp,
    color: '#3B82F6',
    // Position on the orbital path (relative to SVG viewBox 400x300)
    x: 200, y: 30,
  },
  {
    label: 'Investigation',
    description: 'RAG-powered root cause analysis with evidence chains',
    icon: Search,
    color: '#8B5CF6',
    x: 360, y: 150,
  },
  {
    label: 'Work Order',
    description: 'Auto-generated plans with human-in-the-loop approval',
    icon: ClipboardCheck,
    color: '#C4A77D',
    x: 200, y: 270,
  },
  {
    label: 'Knowledge Base',
    description: 'Every fix feeds back — the system learns continuously',
    icon: BookOpen,
    color: '#10B981',
    x: 40, y: 150,
  },
];

/* SVG path connecting all 4 nodes in a loop */
const ORBIT_PATH = 'M200,50 C330,50 380,120 380,150 C380,180 330,270 200,270 C70,270 20,180 20,150 C20,120 70,50 200,50';

/* ================================================================== */
/*  Closed Loop Diagram                                                */
/* ================================================================== */
export default function ClosedLoopDiagram() {
  return (
    <section className="relative py-24 sm:py-32 overflow-hidden">
      <div className="absolute inset-0 bg-[#0C1018]" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.5 }}
        >
          <p className="text-[11px] font-semibold text-[#C4A77D] uppercase tracking-[0.15em] mb-3">Continuous Improvement</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-white/90 mb-4">
            Agents that learn from every fix
          </h2>
          <p className="text-lg text-white/40 max-w-2xl mx-auto">
            Each resolved issue feeds back into the knowledge base, making every future diagnosis faster and more accurate.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-12 items-center">
          {/* Left: Orbital diagram */}
          <motion.div
            className="relative w-full max-w-[520px] mx-auto"
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.6 }}
          >
            <svg viewBox="0 0 400 300" className="w-full h-auto">
              {/* Orbit path (subtle) */}
              <motion.path
                d={ORBIT_PATH}
                fill="none"
                stroke="rgba(196,167,125,0.08)"
                strokeWidth="1.5"
                initial={{ pathLength: 0 }}
                whileInView={{ pathLength: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 1.5, ease: 'easeOut' }}
              />

              {/* Traveling dots */}
              {[0, 0.25, 0.5, 0.75].map((offset, i) => (
                <motion.circle
                  key={i}
                  r="3"
                  fill="#C4A77D"
                  style={{
                    offsetPath: `path('${ORBIT_PATH}')`,
                    filter: 'drop-shadow(0 0 4px rgba(196,167,125,0.6))',
                  }}
                  initial={{ offsetDistance: `${offset * 100}%`, opacity: 0 }}
                  whileInView={{ offsetDistance: `${(offset + 1) * 100}%`, opacity: [0, 0.8, 0.8, 0.8, 0] }}
                  viewport={{ once: true }}
                  transition={{
                    offsetDistance: { duration: 12, repeat: Infinity, ease: 'linear', delay: 1.5 },
                    opacity: { duration: 12, repeat: Infinity, ease: 'linear', delay: 1.5 },
                  }}
                />
              ))}

              {/* Agent nodes */}
              {AGENTS.map((agent, i) => {
                const AgentIcon = agent.icon;
                return (
                  <motion.g
                    key={agent.label}
                    initial={{ opacity: 0, scale: 0.5 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.3 + i * 0.15, ...springPop }}
                  >
                    {/* Node background */}
                    <rect
                      x={agent.x - 32}
                      y={agent.y - 20}
                      width="64"
                      height="40"
                      rx="10"
                      fill="#0C1018"
                      stroke={`${agent.color}40`}
                      strokeWidth="1"
                    />
                    {/* Colored top accent */}
                    <rect
                      x={agent.x - 32}
                      y={agent.y - 20}
                      width="64"
                      height="3"
                      rx="1.5"
                      fill={agent.color}
                      opacity="0.5"
                    />
                    {/* Icon placeholder (circle) */}
                    <circle
                      cx={agent.x}
                      cy={agent.y - 2}
                      r="8"
                      fill={`${agent.color}15`}
                      stroke={`${agent.color}30`}
                      strokeWidth="0.5"
                    />
                    {/* Label */}
                    <text
                      x={agent.x}
                      y={agent.y + 14}
                      textAnchor="middle"
                      className="text-[7px] font-semibold"
                      fill={`${agent.color}CC`}
                    >
                      {agent.label}
                    </text>
                  </motion.g>
                );
              })}

              {/* Center text */}
              <motion.text
                x="200"
                y="148"
                textAnchor="middle"
                className="text-[8px] font-mono uppercase tracking-wider"
                fill="rgba(196,167,125,0.3)"
                animate={{ opacity: [0.2, 0.5, 0.2] }}
                transition={{ duration: 3, repeat: Infinity }}
              >
                Continuous Learning
              </motion.text>
              <motion.circle
                cx="200"
                cy="150"
                r="25"
                fill="none"
                stroke="rgba(196,167,125,0.06)"
                strokeWidth="1"
                strokeDasharray="3 3"
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                style={{ transformOrigin: '200px 150px' }}
              />
            </svg>
          </motion.div>

          {/* Right: Agent info blocks */}
          <div className="space-y-4">
            {AGENTS.map((agent, i) => {
              const AgentIcon = agent.icon;
              return (
                <motion.div
                  key={agent.label}
                  className="flex items-start gap-3 rounded-xl bg-white/[0.02] border border-white/[0.04] p-4 transition-colors hover:border-white/[0.08]"
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.5 + i * 0.12, duration: 0.4, ease: EASE_STANDARD }}
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `${agent.color}15`, border: `1px solid ${agent.color}25` }}
                  >
                    <AgentIcon className="size-4" style={{ color: agent.color }} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white/60 mb-0.5">{agent.label}</p>
                    <p className="text-[12px] text-white/30 leading-relaxed">{agent.description}</p>
                  </div>
                </motion.div>
              );
            })}

            {/* Arrow indicators between blocks */}
            <div className="flex items-center justify-center gap-1 pt-2">
              {['Scan', 'Investigate', 'Plan', 'Learn', 'Repeat'].map((step, i) => (
                <div key={step} className="flex items-center gap-1">
                  <span className="text-[8px] text-white/20 font-mono">{step}</span>
                  {i < 4 && <span className="text-[8px] text-[#C4A77D]/30">&rarr;</span>}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
