'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import AltavizLogo from '@/components/brand/AltavizLogo';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <nav
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
        scrolled
          ? 'bg-white/80 backdrop-blur-xl border-b border-[#E5E5E5]'
          : 'bg-[#FAFAFA]'
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 shrink-0">
            <div className="w-9 h-9 rounded-xl bg-[#1A3A5C] flex items-center justify-center">
              <AltavizLogo size={22} variant="white" />
            </div>
            <span className="text-xl font-bold text-[#0A0A0A] tracking-tight">Altaviz</span>
          </Link>

          <Link
            href="/dashboard"
            className="text-sm font-semibold text-[#0A0A0A] bg-[#F5C518] hover:bg-[#FFD84D] transition-colors px-6 py-2.5 rounded-lg"
          >
            Try Demo
          </Link>
        </div>
      </div>
    </nav>
  );
}
