'use client';

import Link from 'next/link';
import AltavizLogo from '@/components/brand/AltavizLogo';
import { Shield, FileCheck, Leaf, Settings, Activity, Lock } from 'lucide-react';

const FOOTER_LINKS = {
  Product: [
    { label: 'Fleet Monitoring', href: '/dashboard' },
    { label: 'AI Agents', href: '/dashboard' },
    { label: 'Predictive Maintenance', href: '/dashboard' },
  ],
  Company: [
    { label: 'About', href: '/about' },
    { label: 'Pricing', href: '/pricing' },
    { label: 'Security', href: '/security' },
    { label: 'Changelog', href: '/changelog' },
    { label: 'Support', href: 'mailto:support@altaviz.com' },
  ],
  Legal: [
    { label: 'Privacy Policy', href: '/privacy' },
    { label: 'Terms of Service', href: '/terms' },
  ],
};

const COMPLIANCE_BADGES = [
  { label: 'SOC 2 Type II', icon: Shield },
  { label: '49 CFR 192', icon: FileCheck },
  { label: 'EPA Subpart W', icon: Leaf },
  { label: '49 CFR 195', icon: Settings },
  { label: 'ISO 10816', icon: Activity },
  { label: 'SSO / SAML', icon: Lock },
];

export default function Footer() {
  return (
    <footer className="border-t border-[#E5E5E5]/60 bg-[#FAFAFA]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        {/* Main grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 lg:gap-6">
          {/* Brand column */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-lg bg-[#1A3A5C] flex items-center justify-center">
                <AltavizLogo size={16} variant="white" />
              </div>
              <span className="text-sm font-semibold text-[#0A0A0A]">Altaviz</span>
            </Link>
            <p className="text-xs text-[#6B7280] leading-relaxed mb-6 max-w-[200px]">
              48-hour advance warning for pipeline operators.
            </p>

            {/* CTA */}
            <Link
              href="/dashboard"
              className="inline-flex text-sm font-medium px-10 py-3 rounded-full bg-[#F5C518] text-[#0A0A0A] hover:bg-[#FFD84D] transition-colors"
            >
              Try Demo
            </Link>
          </div>

          {/* Link columns */}
          {Object.entries(FOOTER_LINKS).map(([category, links]) => (
            <div key={category}>
              <p className="text-[11px] font-semibold text-[#0A0A0A] uppercase tracking-wider mb-3">
                {category}
              </p>
              <ul className="space-y-2">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-xs text-[#6B7280] hover:text-[#0A0A0A] transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Compliance badges */}
        <div className="mt-12 pt-8 border-t border-[#E5E5E5]/40">
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6">
            {COMPLIANCE_BADGES.map(({ label, icon: Icon }) => (
              <div key={label} className="flex items-center gap-1.5 text-[11px] text-[#9CA3AF]">
                <Icon className="size-3.5 text-[#F5C518]/60" aria-hidden="true" />
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-8 pt-6 border-t border-[#E5E5E5]/40 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-[#9CA3AF]">
          <p>&copy; {new Date().getFullYear()} Altaviz, Inc. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <span>Houston, TX</span>
            <span className="text-[#E5E5E5]">|</span>
            <a href="mailto:support@altaviz.com" className="hover:text-[#0A0A0A] transition-colors">
              Support
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
