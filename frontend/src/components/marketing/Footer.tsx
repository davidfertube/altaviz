import Link from 'next/link';
import { Separator } from '@/components/ui/separator';
import AltavizLogo from '@/components/brand/AltavizLogo';

const PRODUCT_LINKS = [
  { label: 'Platform', href: '/#platform' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'Live Demo', href: '/demo' },
  { label: 'Dashboard', href: '/dashboard' },
];

export default function Footer() {
  return (
    <footer className="relative border-t border-[#E7E0D5] bg-white">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#C4A77D]/30 to-transparent" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row justify-between gap-8 py-12 sm:py-16">
          {/* Brand */}
          <div className="max-w-xs">
            <Link href="/" className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-lg bg-[#C4A77D] flex items-center justify-center text-[#C4A77D]">
                <AltavizLogo size={20} variant="white" />
              </div>
              <span className="text-lg font-bold text-[#1C1917]">Altaviz</span>
            </Link>
            <p className="text-sm text-[#78716C] leading-relaxed">
              Pipeline integrity management for midstream operators.
              PHMSA-compliant monitoring, ML predictions, and automated compliance reporting.
            </p>
          </div>

          {/* Product links */}
          <div>
            <h4 className="text-xs font-semibold text-[#1C1917] uppercase tracking-wider mb-4">
              Product
            </h4>
            <ul className="space-y-2.5">
              {PRODUCT_LINKS.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-[#78716C] hover:text-[#1C1917] transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <Separator className="bg-[#E7E0D5]" />

        <div className="py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-[#A8A29E]">
            &copy; {new Date().getFullYear()} Altaviz, Inc. All rights reserved.
          </p>
          <div className="flex items-center gap-1.5 text-[10px] text-[#C4A77D]">
            <span>49 CFR 192</span>
            <span>&middot;</span>
            <span>API 618</span>
            <span>&middot;</span>
            <span>ISO 10816</span>
            <span>&middot;</span>
            <span>EPA Subpart W</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
