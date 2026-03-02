'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('cookie-consent');
    if (!consent) {
      const timer = setTimeout(() => setVisible(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const accept = () => {
    localStorage.setItem('cookie-consent', 'accepted');
    setVisible(false);
  };

  const decline = () => {
    localStorage.setItem('cookie-consent', 'declined');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[100] p-4">
      <div className="max-w-3xl mx-auto rounded-xl border border-[#E5E5E5] bg-white shadow-xl shadow-black/5 p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <p className="text-sm text-[#6B7280] leading-relaxed flex-1">
          We use essential cookies to run the platform and optional analytics cookies to improve
          our service. See our{' '}
          <Link href="/privacy" className="text-[#D4A80F] hover:text-[#0A0A0A] underline underline-offset-2">
            Privacy Policy
          </Link>{' '}
          for details.
        </p>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={decline}
            className="text-xs font-medium text-[#6B7280] hover:text-[#0A0A0A] px-4 py-2 rounded-lg border border-[#E5E5E5] hover:border-[#F5C518] transition-colors"
          >
            Decline
          </button>
          <button
            onClick={accept}
            className="text-xs font-semibold text-white bg-[#0A0A0A] hover:bg-[#1A1A1A] px-4 py-2 rounded-lg transition-colors"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
