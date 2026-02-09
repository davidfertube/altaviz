'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Activity, Shield, Zap } from 'lucide-react';

export default function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-[#0A0E17]">
        <div className="absolute inset-0 bg-gradient-to-br from-[#1F77B4]/20 via-transparent to-[#6C5CE7]/20" />
        <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-[#1F77B4]/10 rounded-full blur-[128px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-[#6C5CE7]/10 rounded-full blur-[128px]" />
        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
            backgroundSize: '64px 64px',
          }}
        />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-20">
        <div className="text-center max-w-4xl mx-auto">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <span className="inline-flex items-center gap-2 text-sm font-medium text-[#1F77B4] bg-[#1F77B4]/10 border border-[#1F77B4]/20 rounded-full px-4 py-1.5 mb-8">
              <span className="w-2 h-2 rounded-full bg-[#2CA02C] animate-pulse" />
              Now monitoring 10,000+ sensors across Texas
            </span>
          </motion.div>

          {/* Heading */}
          <motion.h1
            className="text-4xl sm:text-5xl lg:text-7xl font-bold text-white leading-[1.1] tracking-tight mb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            Predict failures{' '}
            <span className="bg-gradient-to-r from-[#1F77B4] to-[#6C5CE7] bg-clip-text text-transparent">
              before they happen
            </span>
          </motion.h1>

          {/* Subtext */}
          <motion.p
            className="text-lg sm:text-xl text-white/50 max-w-2xl mx-auto mb-10 leading-relaxed"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            AI-powered predictive maintenance for natural gas compression equipment.
            Real-time monitoring, intelligent alerts, and ML-driven failure prediction
            that saves millions in unplanned downtime.
          </motion.p>

          {/* CTAs */}
          <motion.div
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center text-base font-semibold text-white bg-gradient-to-r from-[#1F77B4] to-[#6C5CE7] hover:opacity-90 transition-all px-8 py-3.5 rounded-full shadow-lg shadow-[#1F77B4]/25 w-full sm:w-auto"
            >
              Start Free
            </Link>
            <a
              href="#features"
              className="inline-flex items-center justify-center text-base font-medium text-white/70 hover:text-white border border-white/20 hover:border-white/40 transition-all px-8 py-3.5 rounded-full w-full sm:w-auto"
            >
              See How It Works
            </a>
          </motion.div>

          {/* Feature pills */}
          <motion.div
            className="flex flex-wrap items-center justify-center gap-6 mt-16"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.5 }}
          >
            {[
              { icon: Activity, label: 'Real-time Monitoring' },
              { icon: Shield, label: 'Predictive Alerts' },
              { icon: Zap, label: 'ML-Powered Analytics' },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-2 text-white/40">
                <Icon className="size-4" />
                <span className="text-sm">{label}</span>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Dashboard Preview */}
        <motion.div
          className="mt-20 relative"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.4 }}
        >
          <div className="relative rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-1 shadow-2xl shadow-[#1F77B4]/10">
            <div className="rounded-xl bg-[#0D1117] overflow-hidden">
              {/* Mock dashboard header */}
              <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-[#D62728]/60" />
                  <div className="w-3 h-3 rounded-full bg-[#FF7F0E]/60" />
                  <div className="w-3 h-3 rounded-full bg-[#2CA02C]/60" />
                </div>
                <div className="flex-1 flex justify-center">
                  <div className="text-xs text-white/30 bg-white/5 rounded-md px-3 py-1">
                    app.altaviz.com/dashboard
                  </div>
                </div>
              </div>
              {/* Mock dashboard content */}
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-4 gap-3">
                  {[
                    { label: 'Compressors Online', value: '10', color: '#2CA02C' },
                    { label: 'Active Alerts', value: '3', color: '#FF7F0E' },
                    { label: 'Fleet Health', value: '87%', color: '#1F77B4' },
                    { label: 'Stations Active', value: '4', color: '#6C5CE7' },
                  ].map((card) => (
                    <div key={card.label} className="rounded-lg bg-white/5 border border-white/5 p-3">
                      <p className="text-[10px] sm:text-xs text-white/40 mb-1 truncate">{card.label}</p>
                      <p className="text-lg sm:text-2xl font-bold font-mono" style={{ color: card.color }}>
                        {card.value}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg bg-white/5 border border-white/5 p-4 h-32 sm:h-48">
                    {/* Simplified chart lines */}
                    <div className="h-full flex items-end gap-1">
                      {[40, 55, 45, 70, 60, 50, 65, 80, 55, 45, 70, 60].map((h, i) => (
                        <div
                          key={i}
                          className="flex-1 rounded-t"
                          style={{
                            height: `${h}%`,
                            background: `linear-gradient(to top, #1F77B4, #6C5CE7)`,
                            opacity: 0.6 + (i / 24),
                          }}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="rounded-lg bg-white/5 border border-white/5 p-4 h-32 sm:h-48">
                    <div className="h-full flex items-end gap-1">
                      {[60, 45, 55, 30, 50, 40, 55, 45, 70, 50, 40, 60].map((h, i) => (
                        <div
                          key={i}
                          className="flex-1 rounded-t"
                          style={{
                            height: `${h}%`,
                            background: `linear-gradient(to top, #2CA02C, #47C747)`,
                            opacity: 0.6 + (i / 24),
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          {/* Glow under dashboard */}
          <div className="absolute -inset-x-20 -bottom-20 h-40 bg-gradient-to-t from-[#0A0E17] to-transparent pointer-events-none" />
        </motion.div>
      </div>
    </section>
  );
}
