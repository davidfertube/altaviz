'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { X } from 'lucide-react';

export default function DemoBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem('altaviz_demo_banner_dismissed');
    if (!dismissed) setVisible(true);
  }, []);

  function dismiss() {
    setVisible(false);
    localStorage.setItem('altaviz_demo_banner_dismissed', '1');
  }

  if (!visible) return null;

  return (
    <div className="bg-[#F5C518] text-[#0A0A0A] px-4 py-2 text-sm font-medium flex items-center justify-center gap-3">
      <span>
        You&apos;re viewing demo data.{' '}
        <Link href="/dashboard/connect" className="underline font-semibold hover:no-underline">
          Connect your own telemetry
        </Link>{' '}
        to get started.
      </span>
      <button onClick={dismiss} className="hover:bg-black/10 rounded p-2 -mr-1" aria-label="Dismiss">
        <X className="size-4" />
      </button>
    </div>
  );
}
