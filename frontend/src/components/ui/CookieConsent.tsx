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
      <div className="max-w-3xl mx-auto rounded-xl border border-[#E7E0D5] bg-white shadow-xl shadow-black/5 p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <p className="text-sm text-[#78716C] leading-relaxed flex-1">
          We use essential cookies to run the platform and optional analytics cookies to improve
          our service. See our{' '}
          <Link href="/privacy" className="text-[#A68B5B] hover:text-[#1C1917] underline underline-offset-2">
            Privacy Policy
          </Link>{' '}
          for details.
        </p>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={decline}
            className="text-xs font-medium text-[#78716C] hover:text-[#1C1917] px-4 py-2 rounded-lg border border-[#E7E0D5] hover:border-[#C4A77D] transition-colors"
          >
            Decline
          </button>
          <button
            onClick={accept}
            className="text-xs font-semibold text-white bg-[#1C1917] hover:bg-[#2D2D2D] px-4 py-2 rounded-lg transition-colors"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
