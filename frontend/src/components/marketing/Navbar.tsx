'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import AltavizLogo from '@/components/brand/AltavizLogo';
import { Menu, X } from 'lucide-react';

const NAV_LINKS = [
  { href: '/#features', label: 'Product' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/about', label: 'About' },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const closeMobile = () => setMobileOpen(false);

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

          {/* Desktop Nav */}
          <div className="hidden lg:flex items-center gap-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-[#6B7280] hover:text-[#0A0A0A] hover:bg-[#F5F5F5] transition-colors px-4 py-2 rounded-md"
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* CTAs */}
          <div className="hidden lg:flex items-center gap-3 shrink-0">
            <Link
              href="/login"
              className="text-sm font-medium text-[#6B7280] hover:text-[#0A0A0A] transition-colors px-3 py-2"
            >
              Sign In
            </Link>
            <Link
              href="/signup"
              className="text-sm font-semibold text-[#0A0A0A] bg-[#F5C518] hover:bg-[#FFD84D] transition-colors px-8 py-3 rounded-full"
            >
              Get Started
            </Link>
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="lg:hidden text-[#6B7280] hover:text-[#0A0A0A] p-2"
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="size-6" /> : <Menu className="size-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="lg:hidden bg-white/95 backdrop-blur-xl border-t border-[#E5E5E5] max-h-[80vh] overflow-y-auto">
          <div className="px-4 py-4 space-y-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={closeMobile}
                className="block text-sm font-medium text-[#6B7280] hover:text-[#0A0A0A] py-2.5 px-3 rounded-lg hover:bg-[#F0F0F0] transition-colors"
              >
                {link.label}
              </Link>
            ))}

            <div className="pt-3 border-t border-[#E5E5E5] space-y-2">
              <Link
                href="/login"
                onClick={closeMobile}
                className="block text-sm font-medium text-[#6B7280] hover:text-[#0A0A0A] py-2.5 px-3 rounded-lg hover:bg-[#F0F0F0] transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/signup"
                onClick={closeMobile}
                className="block text-sm font-semibold text-center text-[#0A0A0A] bg-[#F5C518] hover:bg-[#FFD84D] transition-colors px-8 py-3 rounded-full"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
