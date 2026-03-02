'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export default function CtaBanner() {
  return (
    <section className="relative py-24 sm:py-32">
      <div className="absolute inset-0 bg-[#0C1018]" />
      {/* Subtle grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />

      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <motion.div
          variants={{
            hidden: { opacity: 0 },
            visible: { opacity: 1, transition: { staggerChildren: 0.12, delayChildren: 0.1 } },
          }}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
        >
          <motion.h2
            className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4"
            variants={{
              hidden: { opacity: 0, y: 20 },
              visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] as const } },
            }}
          >
            Your next shutdown{' '}
            <span className="text-[#F5C518]">doesn&#39;t have to cost you $500K.</span>
          </motion.h2>
          <motion.p
            className="text-lg text-white/50 max-w-2xl mx-auto mb-10"
            variants={{
              hidden: { opacity: 0, y: 20 },
              visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] as const } },
            }}
          >
            Start monitoring your pipeline assets in minutes. Free pilot includes 10 segments with full anomaly detection and AI-powered diagnostics.
          </motion.p>

          <motion.div
            className="flex items-center justify-center"
            variants={{
              hidden: { opacity: 0, y: 20 },
              visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] as const } },
            }}
          >
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 text-base font-semibold text-[#0A0A0A] bg-white hover:bg-white/90 transition-colors px-20 py-4 rounded-full shadow-lg"
            >
              Start Free Pilot
              <ArrowRight className="size-4" />
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
