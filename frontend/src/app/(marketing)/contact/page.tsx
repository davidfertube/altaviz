'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Mail,
  Headphones,
  ShieldCheck,
  MapPin,
  ArrowRight,
  Send,
  HelpCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

/* ------------------------------------------------------------------ */
/*  Animation variants                                                 */
/* ------------------------------------------------------------------ */
const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] as const },
  },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.1 },
  },
};

/* ------------------------------------------------------------------ */
/*  Contact info cards data                                            */
/* ------------------------------------------------------------------ */
const CONTACT_CHANNELS = [
  {
    icon: Mail,
    label: 'Sales',
    value: 'sales@altaviz.com',
    href: 'mailto:sales@altaviz.com',
    description: 'Pricing, demos, and partnership inquiries',
  },
  {
    icon: Headphones,
    label: 'Support',
    value: 'support@altaviz.com',
    href: 'mailto:support@altaviz.com',
    description: 'Technical support and onboarding help',
  },
  {
    icon: ShieldCheck,
    label: 'Security',
    value: 'security@altaviz.com',
    href: 'mailto:security@altaviz.com',
    description: 'Vulnerability reports and compliance questions',
  },
  {
    icon: MapPin,
    label: 'Office',
    value: 'Houston, TX',
    href: undefined,
    description: 'Based in the energy capital of the world',
  },
];

const PIPELINE_MILES_OPTIONS = [
  'Under 100',
  '100-500',
  '500-2,000',
  '2,000+',
];

/* ================================================================== */
/*  Contact Page                                                       */
/* ================================================================== */
export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    pipelineMiles: '',
    message: '',
  });
  const [submitting, setSubmitting] = useState(false);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!formData.name || !formData.email || !formData.company) {
      toast.error('Please fill in all required fields.');
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Something went wrong.');
      }

      toast.success('Message sent successfully. Our team will be in touch within one business day.');
      setFormData({ name: '', email: '', company: '', pipelineMiles: '', message: '' });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to send message.';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="pt-20">
      {/* ------------------------------------------------------------ */}
      {/*  Hero                                                         */}
      {/* ------------------------------------------------------------ */}
      <section className="relative py-24 sm:py-32 overflow-hidden">
        <div className="absolute inset-0 bg-[#FAF9F6]">
          <div className="absolute top-1/3 right-1/4 w-[500px] h-[500px] bg-[#C4A77D]/8 rounded-full blur-[128px]" />
        </div>

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
          >
            <motion.p
              className="text-[11px] font-semibold text-[#C4A77D] uppercase tracking-[0.15em] mb-4"
              variants={fadeUp}
            >
              Contact Us
            </motion.p>
            <motion.h1
              className="text-4xl sm:text-5xl font-bold text-[#1C1917] leading-[1.08] tracking-tight mb-5"
              variants={fadeUp}
            >
              Talk to our pipeline{' '}
              <span className="text-[#C4A77D]">integrity team</span>
            </motion.h1>
            <motion.p
              className="text-lg text-[#78716C] max-w-2xl mx-auto leading-relaxed"
              variants={fadeUp}
            >
              Whether you&apos;re evaluating Altaviz for your fleet or need
              technical support, we&apos;re here. Most inquiries receive a
              response within one business day.
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* ------------------------------------------------------------ */}
      {/*  Form + Contact Info                                          */}
      {/* ------------------------------------------------------------ */}
      <section className="relative py-16 sm:py-24">
        <div className="absolute inset-0 bg-[#FAF9F6]" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-12 lg:gap-16">
            {/* Left: Form (3 cols) */}
            <motion.div
              className="lg:col-span-3"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-100px' }}
              transition={{ duration: 0.5 }}
            >
              <div className="rounded-2xl border border-[#E7E0D5] bg-white p-6 sm:p-8">
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Name + Email row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <label
                        htmlFor="name"
                        className="block text-sm font-medium text-[#1C1917] mb-2"
                      >
                        Full Name <span className="text-[#C4A77D]">*</span>
                      </label>
                      <input
                        id="name"
                        name="name"
                        type="text"
                        required
                        value={formData.name}
                        onChange={handleChange}
                        placeholder="Jane Richardson"
                        className="w-full rounded-xl border border-[#E7E0D5] bg-[#FAF9F6] px-4 py-3 text-sm text-[#1C1917] placeholder:text-[#A8A29E] focus:outline-none focus:ring-2 focus:ring-[#C4A77D]/40 focus:border-[#C4A77D] transition-colors"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="email"
                        className="block text-sm font-medium text-[#1C1917] mb-2"
                      >
                        Work Email <span className="text-[#C4A77D]">*</span>
                      </label>
                      <input
                        id="email"
                        name="email"
                        type="email"
                        required
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="jane@operator.com"
                        className="w-full rounded-xl border border-[#E7E0D5] bg-[#FAF9F6] px-4 py-3 text-sm text-[#1C1917] placeholder:text-[#A8A29E] focus:outline-none focus:ring-2 focus:ring-[#C4A77D]/40 focus:border-[#C4A77D] transition-colors"
                      />
                    </div>
                  </div>

                  {/* Company + Pipeline Miles row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <label
                        htmlFor="company"
                        className="block text-sm font-medium text-[#1C1917] mb-2"
                      >
                        Company <span className="text-[#C4A77D]">*</span>
                      </label>
                      <input
                        id="company"
                        name="company"
                        type="text"
                        required
                        value={formData.company}
                        onChange={handleChange}
                        placeholder="Permian Basin Midstream"
                        className="w-full rounded-xl border border-[#E7E0D5] bg-[#FAF9F6] px-4 py-3 text-sm text-[#1C1917] placeholder:text-[#A8A29E] focus:outline-none focus:ring-2 focus:ring-[#C4A77D]/40 focus:border-[#C4A77D] transition-colors"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="pipelineMiles"
                        className="block text-sm font-medium text-[#1C1917] mb-2"
                      >
                        Pipeline Miles
                      </label>
                      <select
                        id="pipelineMiles"
                        name="pipelineMiles"
                        value={formData.pipelineMiles}
                        onChange={handleChange}
                        className="w-full rounded-xl border border-[#E7E0D5] bg-[#FAF9F6] px-4 py-3 text-sm text-[#1C1917] focus:outline-none focus:ring-2 focus:ring-[#C4A77D]/40 focus:border-[#C4A77D] transition-colors appearance-none"
                      >
                        <option value="">Select range</option>
                        {PIPELINE_MILES_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Message */}
                  <div>
                    <label
                      htmlFor="message"
                      className="block text-sm font-medium text-[#1C1917] mb-2"
                    >
                      Message
                    </label>
                    <textarea
                      id="message"
                      name="message"
                      rows={5}
                      value={formData.message}
                      onChange={handleChange}
                      placeholder="Tell us about your pipeline network, current challenges, and what you're looking for..."
                      className="w-full rounded-xl border border-[#E7E0D5] bg-[#FAF9F6] px-4 py-3 text-sm text-[#1C1917] placeholder:text-[#A8A29E] focus:outline-none focus:ring-2 focus:ring-[#C4A77D]/40 focus:border-[#C4A77D] transition-colors resize-none"
                    />
                  </div>

                  {/* Submit */}
                  <Button
                    type="submit"
                    disabled={submitting}
                    className="h-12 px-8 text-base font-semibold rounded-full bg-[#1C1917] text-white shadow-lg shadow-[#1C1917]/15 hover:shadow-xl hover:bg-[#2D2D2D] transition-all border-0 disabled:opacity-60"
                  >
                    {submitting ? (
                      'Sending...'
                    ) : (
                      <>
                        Send Message
                        <Send className="size-4 ml-2" />
                      </>
                    )}
                  </Button>
                </form>
              </div>
            </motion.div>

            {/* Right: Contact cards (2 cols) */}
            <motion.div
              className="lg:col-span-2 space-y-4"
              variants={staggerContainer}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-100px' }}
            >
              {CONTACT_CHANNELS.map(({ icon: Icon, label, value, href, description }) => (
                <motion.div
                  key={label}
                  className="rounded-2xl border border-[#E7E0D5] bg-white p-6 hover:border-[#C4A77D]/40 hover:shadow-lg hover:shadow-[#C4A77D]/5 transition-all"
                  variants={fadeUp}
                >
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-[#C4A77D]/10 flex items-center justify-center shrink-0">
                      <Icon className="size-5 text-[#A68B5B]" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-[#A8A29E] uppercase tracking-wider mb-1">
                        {label}
                      </p>
                      {href ? (
                        <a
                          href={href}
                          className="text-base font-medium text-[#1C1917] hover:text-[#A68B5B] transition-colors"
                        >
                          {value}
                        </a>
                      ) : (
                        <p className="text-base font-medium text-[#1C1917]">
                          {value}
                        </p>
                      )}
                      <p className="text-xs text-[#78716C] mt-1">{description}</p>
                    </div>
                  </div>
                </motion.div>
              ))}

              {/* FAQ link */}
              <motion.div variants={fadeUp}>
                <Link
                  href="/#faq"
                  className="flex items-center gap-3 rounded-2xl border border-dashed border-[#E7E0D5] bg-[#FAF9F6] p-6 hover:border-[#C4A77D]/40 hover:bg-white transition-all group"
                >
                  <div className="w-10 h-10 rounded-lg bg-[#C4A77D]/10 flex items-center justify-center shrink-0">
                    <HelpCircle className="size-5 text-[#A68B5B]" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-[#1C1917] group-hover:text-[#A68B5B] transition-colors">
                      Check our FAQ for common questions
                    </p>
                    <p className="text-xs text-[#78716C] mt-0.5">
                      Answers about integrations, compliance, pricing, and more
                    </p>
                  </div>
                  <ArrowRight className="size-4 text-[#A8A29E] group-hover:text-[#A68B5B] transition-colors" />
                </Link>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>
    </div>
  );
}
