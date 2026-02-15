'use client';

import { motion } from 'framer-motion';
import GlassCard from './GlassCard';

const TESTIMONIALS = [
  {
    quote: 'Caught a bearing failure on a Waukesha 7042 two days early. That one save paid for six months of Altaviz.',
    author: 'Michael Torres',
    title: 'VP of Field Operations',
    company: 'Permian Basin Compression',
  },
  {
    quote: 'Truck rolls are down 60%. Techs only roll when Altaviz confirms a real degradation trend, not false alarms.',
    author: 'Sarah Nguyen',
    title: 'Reliability Engineering Manager',
    company: 'Lone Star Midstream',
  },
  {
    quote: 'Went from manual spreadsheet estimates to automated EPA Subpart W calculations per pipeline. Emissions tracking alone justified it.',
    author: 'Daniel Garza',
    title: 'Environmental Compliance Lead',
    company: 'Eagle Ford Gas Processing',
  },
];

export default function Testimonials() {
  return (
    <section id="testimonials" className="section-viewport relative py-24 sm:py-32">
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
            What operators are saying
          </h2>
          <p className="text-lg text-[#78716C] max-w-xl mx-auto">
            Field ops, reliability engineers, and compliance teams across Texas
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
                <blockquote className="text-sm text-[#78716C] leading-relaxed flex-1 mb-6">
                  &ldquo;{testimonial.quote}&rdquo;
                </blockquote>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#C4A77D] flex items-center justify-center">
                    <span className="text-white font-semibold text-sm">
                      {testimonial.author.split(' ').map(n => n[0]).join('')}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#1C1917]">{testimonial.author}</p>
                    <p className="text-xs text-[#A8A29E]">{testimonial.title}, {testimonial.company}</p>
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
