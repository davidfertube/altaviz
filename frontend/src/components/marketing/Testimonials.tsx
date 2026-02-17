'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Quote } from 'lucide-react';

const TESTIMONIALS = [
  {
    quote: 'Caught a corrosion anomaly on a 24-inch transmission segment two days before it would have triggered a shutdown. That one save paid for six months of Altaviz.',
    author: 'Michael Torres',
    title: 'VP of Pipeline Operations',
    company: 'Permian Basin Midstream',
    initials: 'MT',
  },
  {
    quote: 'Truck rolls are down 60%. Techs only roll when Altaviz confirms a real degradation trend, not false alarms.',
    author: 'Sarah Nguyen',
    title: 'Reliability Engineering Manager',
    company: 'Lone Star Midstream',
    initials: 'SN',
  },
  {
    quote: 'Went from manual spreadsheet estimates to automated EPA Subpart W calculations per pipeline. Emissions tracking alone justified it.',
    author: 'Daniel Garza',
    title: 'Environmental Compliance Lead',
    company: 'Eagle Ford Gas Processing',
    initials: 'DG',
  },
  {
    quote: 'Integration with our OSIsoft PI historian took less than a week. We were seeing anomaly scores on day one.',
    author: 'James Park',
    title: 'IT/OT Convergence Manager',
    company: 'Delaware Basin Partners',
    initials: 'JP',
  },
  {
    quote: 'The ROI was immediate. We avoided two emergency shutdowns in the first quarter alone — each would have cost us $800K+.',
    author: 'Rachel Chen',
    title: 'Chief Technology Officer',
    company: 'Haynesville Gas Gathering',
    initials: 'RC',
  },
];

export default function Testimonials() {
  const [current, setCurrent] = useState(0);

  const prev = () => setCurrent((c) => (c === 0 ? TESTIMONIALS.length - 1 : c - 1));
  const next = () => setCurrent((c) => (c === TESTIMONIALS.length - 1 ? 0 : c + 1));

  const testimonial = TESTIMONIALS[current];

  return (
    <section id="testimonials" className="relative py-24 sm:py-32">
      <div className="absolute inset-0 bg-[#F5F0E8]" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.5 }}
        >
          <p className="text-[11px] font-semibold text-[#C4A77D] uppercase tracking-[0.15em] mb-3">Customer Stories</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-[#1C1917] mb-4">
            What operators are saying
          </h2>
          <p className="text-lg text-[#78716C] max-w-xl mx-auto">
            Field ops, reliability engineers, and compliance teams across Texas
          </p>
        </motion.div>

        {/* Carousel */}
        <div className="max-w-3xl mx-auto">
          <div className="relative rounded-2xl border border-[#E7E0D5] bg-white p-8 sm:p-12 min-h-[280px] flex flex-col justify-center">
            <Quote className="size-8 text-[#C4A77D]/20 mb-6" />

            <AnimatePresence mode="wait">
              <motion.div
                key={current}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
              >
                <blockquote className="text-lg sm:text-xl text-[#1C1917] leading-relaxed mb-8">
                  &ldquo;{testimonial.quote}&rdquo;
                </blockquote>

                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-[#C4A77D] flex items-center justify-center shrink-0">
                    <span className="text-white font-semibold text-sm">{testimonial.initials}</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#1C1917]">{testimonial.author}</p>
                    <p className="text-xs text-[#A8A29E]">{testimonial.title}</p>
                    <p className="text-xs text-[#C4A77D] font-medium">{testimonial.company}</p>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-center gap-4 mt-6">
            <button
              onClick={prev}
              className="w-10 h-10 rounded-full border border-[#E7E0D5] bg-white hover:border-[#C4A77D]/40 hover:bg-[#C4A77D]/5 transition-all flex items-center justify-center"
              aria-label="Previous testimonial"
            >
              <ChevronLeft className="size-4 text-[#78716C]" />
            </button>

            <div className="flex items-center gap-2">
              {TESTIMONIALS.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrent(i)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    i === current ? 'bg-[#C4A77D] w-6' : 'bg-[#E7E0D5] hover:bg-[#C4A77D]/40'
                  }`}
                  aria-label={`Go to testimonial ${i + 1}`}
                />
              ))}
            </div>

            <button
              onClick={next}
              className="w-10 h-10 rounded-full border border-[#E7E0D5] bg-white hover:border-[#C4A77D]/40 hover:bg-[#C4A77D]/5 transition-all flex items-center justify-center"
              aria-label="Next testimonial"
            >
              <ChevronRight className="size-4 text-[#78716C]" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
