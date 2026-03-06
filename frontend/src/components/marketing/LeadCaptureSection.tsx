'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function LeadCaptureSection() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', company: '' });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      localStorage.setItem('altaviz_lead', JSON.stringify({ ...form, ts: Date.now() }));
      await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      }).catch(() => {});
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="relative py-24 sm:py-32">
      <div className="absolute inset-0 bg-gradient-to-b from-[#FAFAFA] to-white" />
      <div className="relative max-w-2xl mx-auto px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.5 }}
          className="text-center mb-10"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-[#0A0A0A] tracking-tight mb-4">
            Ready to monitor your fleet?
          </h2>
          <p className="text-[#6B7280] text-lg">
            Leave your details and we'll help you connect your telemetry data.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          {submitted ? (
            <div className="text-center py-12 px-6 rounded-2xl border border-[#E5E5E5] bg-white">
              <CheckCircle2 className="size-12 text-emerald-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-[#0A0A0A] mb-2">We'll be in touch!</h3>
              <p className="text-[#6B7280]">
                Our team will reach out within 24 hours to get you set up.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="rounded-2xl border border-[#E5E5E5] bg-white p-6 sm:p-8 space-y-4">
              <div>
                <label htmlFor="lead-name" className="block text-sm font-medium text-[#0A0A0A] mb-1.5">
                  Name
                </label>
                <input
                  id="lead-name"
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full rounded-lg border border-[#E5E5E5] bg-[#FAFAFA] px-4 py-3 text-sm text-[#0A0A0A] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#F5C518]/50 focus:border-[#F5C518]"
                  placeholder="Jane Smith"
                />
              </div>
              <div>
                <label htmlFor="lead-email" className="block text-sm font-medium text-[#0A0A0A] mb-1.5">
                  Work Email
                </label>
                <input
                  id="lead-email"
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full rounded-lg border border-[#E5E5E5] bg-[#FAFAFA] px-4 py-3 text-sm text-[#0A0A0A] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#F5C518]/50 focus:border-[#F5C518]"
                  placeholder="jane@company.com"
                />
              </div>
              <div>
                <label htmlFor="lead-phone" className="block text-sm font-medium text-[#0A0A0A] mb-1.5">
                  Phone Number
                </label>
                <input
                  id="lead-phone"
                  type="tel"
                  required
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full rounded-lg border border-[#E5E5E5] bg-[#FAFAFA] px-4 py-3 text-sm text-[#0A0A0A] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#F5C518]/50 focus:border-[#F5C518]"
                  placeholder="+1 (555) 123-4567"
                />
              </div>
              <div>
                <label htmlFor="lead-company" className="block text-sm font-medium text-[#0A0A0A] mb-1.5">
                  Company
                </label>
                <input
                  id="lead-company"
                  type="text"
                  required
                  value={form.company}
                  onChange={(e) => setForm({ ...form, company: e.target.value })}
                  className="w-full rounded-lg border border-[#E5E5E5] bg-[#FAFAFA] px-4 py-3 text-sm text-[#0A0A0A] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#F5C518]/50 focus:border-[#F5C518]"
                  placeholder="Acme Energy"
                />
              </div>
              <Button
                type="submit"
                disabled={loading}
                className="w-full h-14 text-base font-semibold rounded-full bg-[#F5C518] text-[#0A0A0A] hover:bg-[#FFD84D] shadow-lg shadow-[#F5C518]/25 hover:shadow-xl transition-all border-0 mt-2"
              >
                {loading ? 'Submitting...' : 'Get in Touch'}
                {!loading && <ArrowRight className="size-5 ml-2" />}
              </Button>
            </form>
          )}
        </motion.div>
      </div>
    </section>
  );
}
