'use client';

import { useState, useEffect } from 'react';
import { X, ArrowRight } from 'lucide-react';

const STORAGE_KEY = 'altaviz-announcement-dismissed';

export default function AnnouncementBar() {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    setDismissed(localStorage.getItem(STORAGE_KEY) === 'true');
  }, []);

  if (dismissed) return null;

  return (
    <div className="relative bg-[#1C1917] text-white py-2 px-4 text-center z-60">
      <div className="max-w-7xl mx-auto flex items-center justify-center gap-2">
        <span className="text-xs sm:text-sm text-white/90">
          <span className="font-semibold text-[#C4A77D]">NEW</span>
          <span className="mx-1.5 text-white/30">—</span>
          EPA Subpart W automated compliance reporting now available
        </span>
        <a
          href="#platform"
          className="hidden sm:inline-flex items-center gap-1 text-xs font-medium text-[#C4A77D] hover:text-[#D4C5A9] transition-colors"
        >
          Learn more
          <ArrowRight className="size-3" />
        </a>
      </div>
      <button
        onClick={() => {
          setDismissed(true);
          localStorage.setItem(STORAGE_KEY, 'true');
        }}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/80 transition-colors"
        aria-label="Dismiss announcement"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
