'use client';

import Link from 'next/link';
import AltavizLogo from '@/components/brand/AltavizLogo';
import { Shield, FileCheck, Leaf, Settings, Activity, Lock } from 'lucide-react';

const FOOTER_LINKS = {
  Platform: [
    { label: 'Fleet Monitoring', href: '/signup' },
    { label: 'Anomaly Detection', href: '/signup' },
    { label: 'Temperature Prediction', href: '/signup' },
    { label: 'RUL Estimation', href: '/signup' },
    { label: 'Emissions Tracking', href: '/signup' },
    { label: 'Alert Management', href: '/signup' },
  ],
  Solutions: [
    { label: 'Transmission Pipelines', href: '/solutions/transmission-pipelines' },
    { label: 'Gathering Systems', href: '/solutions/gathering-systems' },
    { label: 'Reliability Engineers', href: '/solutions/reliability-engineers' },
    { label: 'Compliance Officers', href: '/solutions/compliance-officers' },
    { label: 'Field Operations', href: '/solutions/field-operations' },
  ],
  Resources: [
    { label: 'Changelog', href: '/changelog' },
    { label: 'Documentation', href: '/contact' },
    { label: 'API Reference', href: '/contact' },
  ],
  Company: [
    { label: 'About', href: '/about' },
    { label: 'Contact', href: '/contact' },
    { label: 'Security', href: '/security' },
    { label: 'Pricing', href: '/pricing' },
  ],
  Legal: [
    { label: 'Privacy Policy', href: '/privacy' },
    { label: 'Terms of Service', href: '/terms' },
    { label: 'Security Policy', href: '/security' },
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
    <footer className="border-t border-[#E7E0D5]/60 bg-[#FAF9F6]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        {/* Main grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8 lg:gap-6">
          {/* Brand column */}
          <div className="col-span-2 md:col-span-3 lg:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-lg bg-[#C4A77D] flex items-center justify-center">
                <AltavizLogo size={16} variant="white" />
              </div>
              <span className="text-sm font-semibold text-[#1C1917]">Altaviz</span>
            </Link>
            <p className="text-xs text-[#78716C] leading-relaxed mb-6 max-w-[200px]">
              Predictive maintenance intelligence for pipeline operators.
            </p>

            {/* CTA */}
            <Link
              href="/contact"
              className="inline-flex text-xs font-medium px-4 py-2 rounded-lg bg-[#1C1917] text-white hover:bg-[#2D2D2D] transition-colors"
            >
              Contact Sales
            </Link>
          </div>

          {/* Link columns */}
          {Object.entries(FOOTER_LINKS).map(([category, links]) => (
            <div key={category}>
              <p className="text-[11px] font-semibold text-[#1C1917] uppercase tracking-wider mb-3">
                {category}
              </p>
              <ul className="space-y-2">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-xs text-[#78716C] hover:text-[#1C1917] transition-colors"
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
        <div className="mt-12 pt-8 border-t border-[#E7E0D5]/40">
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6">
            {COMPLIANCE_BADGES.map(({ label, icon: Icon }) => (
              <div key={label} className="flex items-center gap-1.5 text-[11px] text-[#A8A29E]">
                <Icon className="size-3.5 text-[#C4A77D]/60" aria-hidden="true" />
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-8 pt-6 border-t border-[#E7E0D5]/40 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-[#A8A29E]">
          <p>&copy; {new Date().getFullYear()} Altaviz, Inc. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <span>Houston, TX</span>
            <span className="text-[#E7E0D5]">|</span>
            <Link href="/contact" className="hover:text-[#1C1917] transition-colors">
              Support
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
