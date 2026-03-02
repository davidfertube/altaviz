'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { AlertTriangle, BrainCircuit, ClipboardCheck, RotateCcw } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { springPop } from './motion-constants';

/* ================================================================== */
/*  Interactive Demo Teaser                                            */
/* ================================================================== */
export default function LiveDemoTeaser() {
  const [triggered, setTriggered] = useState(false);
  const [phase, setPhase] = useState(0); // 0=idle, 1=dropping, 2=alert, 3=diagnosis, 4=wo, 5=done

  const healthValue = useMotionValue(94);
  const healthColor = useTransform(healthValue, [30, 60, 80, 100], ['#EF4444', '#F59E0B', '#10B981', '#10B981']);
  const dashOffset = useTransform(healthValue, (v) => 94.2 * (v / 100)); // circumference fraction

  const triggerDemo = useCallback(() => {
    if (triggered) return;
    setTriggered(true);
    setPhase(1);

    // Animate health drop
    const dropDuration = 1500;
    const start = Date.now();
    const startVal = 94;
    const endVal = 42;
    const tick = () => {
      const elapsed = Date.now() - start;
      const pct = Math.min(elapsed / dropDuration, 1);
      const eased = 1 - Math.pow(1 - pct, 3); // ease-out cubic
      healthValue.set(startVal - (startVal - endVal) * eased);
      if (pct < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);

    // Phase cascade
    setTimeout(() => setPhase(2), 1800);
    setTimeout(() => setPhase(3), 3000);
    setTimeout(() => setPhase(4), 4200);
    setTimeout(() => setPhase(5), 5000);
  }, [triggered, healthValue]);

  const resetDemo = useCallback(() => {
    setTriggered(false);
    setPhase(0);
    healthValue.set(94);
  }, [healthValue]);

  const responseCards = [
    {
      phase: 2,
      icon: AlertTriangle,
      color: '#EF4444',
      bgColor: 'bg-rose-500/10',
      borderColor: 'border-rose-500/20',
      title: 'Vibration anomaly detected',
      detail: 'COMP-002 · Isolation Forest score: -0.82',
    },
    {
      phase: 3,
      icon: BrainCircuit,
      color: '#8B5CF6',
      bgColor: 'bg-purple-500/10',
      borderColor: 'border-purple-500/20',
      title: 'Root cause: Bearing wear — 87% confidence',
      detail: 'Checked sensor data, maintenance history, knowledge base',
    },
    {
      phase: 4,
      icon: ClipboardCheck,
      color: '#C4A77D',
      bgColor: 'bg-[#C4A77D]/10',
      borderColor: 'border-[#C4A77D]/20',
      title: 'WO-4821 auto-generated',
      detail: 'Priority: Urgent · Est. $2,400 · Bearing replacement',
    },
  ];

  return (
    <section className="relative py-24 sm:py-32">
      <div className="absolute inset-0 bg-[#FAF9F6]" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-[5fr_7fr] gap-12 items-center">
          {/* Left: Text */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.5 }}
          >
            <p className="text-[11px] font-semibold text-[#C4A77D] uppercase tracking-[0.15em] mb-3">Try It Yourself</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-[#1C1917] mb-4">
              From anomaly to work order in seconds
            </h2>
            <p className="text-lg text-[#78716C] max-w-md mb-8 leading-relaxed">
              Click the pipeline asset to simulate a bearing failure. Watch as AI agents detect, diagnose, and generate a repair plan — automatically.
            </p>
            <Button
              asChild
              size="lg"
              className="h-14 w-full sm:w-auto px-20 text-base font-semibold rounded-full bg-[#1C1917] text-white shadow-lg shadow-[#1C1917]/15 hover:shadow-xl hover:bg-[#2D2D2D] transition-all border-0"
            >
              <Link href="/signup">
                Start Free Pilot
                <ArrowRight className="size-4 ml-1" />
              </Link>
            </Button>
          </motion.div>

          {/* Right: Interactive mockup */}
          <motion.div
            className="relative"
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div className="rounded-2xl bg-[#0C1018] p-6 sm:p-8 border border-white/[0.06]">
              {/* Side-by-side layout: dial on left, cards on right */}
              <div className="flex flex-col lg:flex-row items-center lg:items-start gap-6 lg:gap-8">
                {/* Health dial */}
                <div className="flex flex-col items-center shrink-0">
                  <button
                    onClick={triggerDemo}
                    className={`relative w-40 h-40 ${!triggered ? 'cursor-pointer group' : 'cursor-default'}`}
                    disabled={triggered}
                  >
                    <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                      {/* Background ring */}
                      <circle cx="18" cy="18" r="15" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="2.5" />
                      {/* Health ring */}
                      <motion.circle
                        cx="18" cy="18" r="15" fill="none"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        style={{
                          stroke: healthColor,
                          strokeDasharray: '94.2 94.2',
                          strokeDashoffset: useTransform(dashOffset, (v) => 94.2 - v),
                        }}
                      />
                    </svg>
                    {/* Center text */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <motion.span
                        className="text-4xl font-bold font-mono"
                        style={{ color: healthColor }}
                      >
                        {useTransform(healthValue, (v) => Math.round(v))}
                      </motion.span>
                      <span className="text-[9px] text-white/25 font-mono">COMP-002</span>
                    </div>
                    {/* Click hint */}
                    {!triggered && (
                      <motion.div
                        className="absolute -bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-[#C4A77D]/20 border border-[#C4A77D]/30"
                        animate={{ scale: [1, 1.05, 1] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      >
                        <span className="text-[10px] text-[#C4A77D] font-semibold whitespace-nowrap">Click to break</span>
                      </motion.div>
                    )}
                  </button>
                </div>

                {/* Response cards */}
                <div className="flex-1 w-full space-y-3 min-h-[220px]">
                  <AnimatePresence>
                    {responseCards.map((card) => {
                      if (phase < card.phase) return null;
                      const CardIcon = card.icon;
                      return (
                        <motion.div
                          key={card.title}
                          className={`flex items-start gap-3.5 rounded-lg ${card.bgColor} border ${card.borderColor} px-4 py-3`}
                          initial={{ opacity: 0, x: 20, scale: 0.95 }}
                          animate={{ opacity: 1, x: 0, scale: 1 }}
                          exit={{ opacity: 0 }}
                          transition={springPop}
                        >
                          <div
                            className="w-9 h-9 rounded-md flex items-center justify-center shrink-0"
                            style={{ backgroundColor: `${card.color}15`, border: `1px solid ${card.color}30` }}
                          >
                            <CardIcon className="size-4" style={{ color: card.color }} />
                          </div>
                          <div>
                            <p className="text-[11px] font-semibold text-white/60">{card.title}</p>
                            <p className="text-[9px] text-white/25 font-mono">{card.detail}</p>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              </div>

              {/* Reset button */}
              <AnimatePresence>
                {phase >= 5 && (
                  <motion.button
                    className="flex items-center gap-1.5 mx-auto mt-5 px-4 py-2 rounded-md bg-white/[0.05] border border-white/[0.08] text-[10px] text-white/40 hover:text-white/60 hover:border-white/[0.12] transition-colors"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    onClick={resetDemo}
                  >
                    <RotateCcw className="size-3.5" />
                    Reset Demo
                  </motion.button>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
