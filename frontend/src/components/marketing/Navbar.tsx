'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import AltavizLogo from '@/components/brand/AltavizLogo';

const NAV_LINKS = [
  { href: '#platform', label: 'Platform' },
  { href: '#impact', label: 'Impact' },
  { href: '#pricing', label: 'Pricing' },
];

function NavLink({ href, label }: { href: string; label: string }) {
  return (
    <motion.a
      href={href}
      className="relative text-sm font-medium text-[#78716C] transition-colors"
      whileHover="hover"
    >
      <motion.span
        variants={{
          hover: { color: '#1C1917', y: -1 },
        }}
        transition={{ duration: 0.2 }}
        className="inline-block"
      >
        {label}
      </motion.span>
      <motion.span
        className="absolute -bottom-1 left-0 right-0 h-[2px] bg-[#C4A77D] origin-left rounded-full"
        variants={{
          hover: { scaleX: 1, opacity: 1 },
        }}
        initial={{ scaleX: 0, opacity: 0 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
      />
    </motion.a>
  );
}

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

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
          ? 'bg-white/80 backdrop-blur-xl border-b border-[#E7E0D5]'
          : 'bg-transparent'
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#C4A77D] flex items-center justify-center text-[#C4A77D]">
              <AltavizLogo size={22} variant="white" />
            </div>
            <span className="text-xl font-bold text-[#1C1917] tracking-tight">Altaviz</span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            {NAV_LINKS.map((link) => (
              <NavLink key={link.href} href={link.href} label={link.label} />
            ))}
          </div>

          {/* CTAs */}
          <div className="hidden md:flex items-center gap-3">
            <motion.div whileHover={{ y: -1 }} transition={{ duration: 0.2 }}>
              <Link
                href="/login"
                className="text-sm font-medium text-[#78716C] hover:text-[#1C1917] transition-colors px-4 py-2"
              >
                Sign In
              </Link>
            </motion.div>
            <motion.div whileHover={{ scale: 1.03, y: -1 }} whileTap={{ scale: 0.97 }} transition={{ duration: 0.2 }}>
              <Link
                href="/signup"
                className="text-sm font-semibold text-white bg-[#1C1917] hover:bg-[#2D2D2D] transition-colors px-5 py-2.5 rounded-full inline-block"
              >
                Get Started
              </Link>
            </motion.div>
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden text-[#78716C] hover:text-[#1C1917] p-2"
          >
            {mobileOpen ? <X className="size-6" /> : <Menu className="size-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="md:hidden bg-white/95 backdrop-blur-xl border-t border-[#E7E0D5]">
          <div className="px-4 py-4 space-y-2">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="block text-sm font-medium text-[#78716C] hover:text-[#1C1917] py-2.5 px-3 rounded-lg hover:bg-[#F0EBE1] transition-colors"
              >
                {link.label}
              </a>
            ))}
            <div className="pt-3 border-t border-[#E7E0D5] space-y-2">
              <Link
                href="/login"
                className="block text-sm font-medium text-[#78716C] hover:text-[#1C1917] py-2.5 px-3 rounded-lg hover:bg-[#F0EBE1] transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/signup"
                className="block text-sm font-semibold text-center text-white bg-[#1C1917] hover:bg-[#2D2D2D] transition-colors px-5 py-2.5 rounded-full"
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
