'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowRight, Phone } from 'lucide-react';

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
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
            Your next shutdown{' '}
            <span className="text-[#C4A77D]">doesn&#39;t have to be a surprise.</span>
          </h2>
          <p className="text-lg text-white/50 max-w-2xl mx-auto mb-10">
            See Altaviz running on your data. Our engineering team will walk you through a live demo using your actual pipeline network — not a generic slide deck.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 text-base font-semibold text-[#1C1917] bg-white hover:bg-white/90 transition-colors px-8 py-3.5 rounded-full"
            >
              See It With Your Data
              <ArrowRight className="size-4" />
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 text-base font-medium text-white/80 hover:text-white border border-white/20 hover:border-white/40 transition-all px-8 py-3.5 rounded-full"
            >
              Talk to an Engineer
            </Link>
          </div>

          <div className="flex items-center justify-center gap-2 text-sm text-white/30">
            <Phone className="size-3.5" />
            <span>Or call us directly: (713) 555-0192</span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
