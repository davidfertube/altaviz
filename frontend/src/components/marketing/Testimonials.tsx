'use client';

import { motion } from 'framer-motion';
import GlassCard from './GlassCard';

const TESTIMONIALS = [
  {
    quote: 'Altaviz cut our unplanned downtime by 40% in the first quarter. The predictive alerts gave us time to schedule maintenance before critical failures.',
    author: 'Michael Torres',
    title: 'VP of Operations',
    company: 'Permian Basin Energy',
  },
  {
    quote: 'The real-time fleet dashboard changed how we monitor our compressors. We went from reactive to proactive maintenance overnight.',
    author: 'Sarah Chen',
    title: 'Chief Engineer',
    company: 'Lone Star Gas Corp',
  },
  {
    quote: 'Integration was seamless. Our existing sensor infrastructure worked out of the box, and the PySpark pipeline handles our data volume effortlessly.',
    author: 'David Ramirez',
    title: 'Data Engineering Lead',
    company: 'Eagle Ford Systems',
  },
];

export default function Testimonials() {
  return (
    <section className="relative py-24 sm:py-32">
      <div className="absolute inset-0 bg-[#0A0E17]" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Trusted by operators across Texas
          </h2>
          <p className="text-lg text-white/40 max-w-xl mx-auto">
            See what our customers say about transforming their maintenance operations
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {TESTIMONIALS.map((testimonial, i) => (
            <motion.div
              key={testimonial.author}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-100px' }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
            >
              <GlassCard className="h-full flex flex-col">
                <blockquote className="text-sm text-white/60 leading-relaxed flex-1 mb-6">
                  &ldquo;{testimonial.quote}&rdquo;
                </blockquote>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#1F77B4] to-[#6C5CE7] flex items-center justify-center">
                    <span className="text-white font-semibold text-sm">
                      {testimonial.author.split(' ').map(n => n[0]).join('')}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{testimonial.author}</p>
                    <p className="text-xs text-white/40">{testimonial.title}, {testimonial.company}</p>
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
