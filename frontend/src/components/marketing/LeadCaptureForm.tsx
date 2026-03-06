'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface LeadCaptureFormProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function LeadCaptureForm({ open, onClose, onSuccess }: LeadCaptureFormProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);

    const lead = { name, email, company, capturedAt: new Date().toISOString() };
    localStorage.setItem('altaviz_lead', JSON.stringify(lead));

    try {
      await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(lead),
      });
    } catch {
      // Lead stored locally — backend optional
    }

    setSubmitting(false);
    onClose();
    onSuccess?.();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">Get Started with Altaviz</DialogTitle>
          <DialogDescription>
            Tell us about yourself and we&apos;ll set up your demo environment.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div>
            <label htmlFor="lead-name" className="text-sm font-medium text-foreground">
              Name
            </label>
            <input
              id="lead-name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#F5C518]"
              placeholder="Jane Smith"
            />
          </div>
          <div>
            <label htmlFor="lead-email" className="text-sm font-medium text-foreground">
              Work Email
            </label>
            <input
              id="lead-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#F5C518]"
              placeholder="jane@company.com"
            />
          </div>
          <div>
            <label htmlFor="lead-company" className="text-sm font-medium text-foreground">
              Company
            </label>
            <input
              id="lead-company"
              type="text"
              required
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#F5C518]"
              placeholder="Acme Energy"
            />
          </div>
          <Button
            type="submit"
            disabled={submitting}
            className="w-full bg-[#F5C518] hover:bg-[#FFD84D] text-[#0A0A0A] font-semibold rounded-full py-3"
          >
            {submitting ? 'Setting up...' : 'Start Demo'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function useLeadCapture() {
  const [open, setOpen] = useState(false);

  function requireLead(callback: () => void) {
    const lead = localStorage.getItem('altaviz_lead');
    if (lead) {
      callback();
    } else {
      setOpen(true);
    }
  }

  return { open, setOpen, requireLead };
}
