'use client';

import { useRef, useEffect, useState } from 'react';
import { motion, useInView } from 'framer-motion';

const STATS = [
  { value: 10000, suffix: '+', label: 'Sensor Readings / Day', prefix: '' },
  { value: 83, suffix: '%', label: 'Data Reduction via ETL', prefix: '' },
  { value: 15, suffix: 'min', label: 'Alert Latency', prefix: '<' },
  { value: 99.9, suffix: '%', label: 'Platform Uptime', prefix: '' },
];

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

export default function Stats() {
  return (
    <section id="stats" className="relative py-24 sm:py-32">
      <div className="absolute inset-0 bg-[#0A0E17]" />
      <div className="absolute inset-0 bg-gradient-to-b from-[#1F77B4]/5 to-transparent" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Built for scale
          </h2>
          <p className="text-lg text-white/40 max-w-xl mx-auto">
            Processing massive volumes of time-series sensor data through our PySpark ETL pipeline
          </p>
        </motion.div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
          {STATS.map((stat, i) => (
            <motion.div
              key={stat.label}
              className="text-center p-6 rounded-2xl border border-white/5 bg-white/[0.02]"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-100px' }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
            >
              <div className="text-3xl sm:text-5xl font-bold bg-gradient-to-r from-[#1F77B4] to-[#6C5CE7] bg-clip-text text-transparent mb-2">
                <AnimatedCounter value={stat.value} suffix={stat.suffix} prefix={stat.prefix} />
              </div>
              <p className="text-sm text-white/40">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
