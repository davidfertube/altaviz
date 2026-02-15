import Link from 'next/link';
import AltavizLogo from '@/components/brand/AltavizLogo';

const NAV_LINKS = [
  { label: 'Platform', href: '/#platform' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'Live Demo', href: '/demo' },
  { label: 'Dashboard', href: '/dashboard' },
];

export default function Footer() {
  return (
    <footer className="border-t border-[#E7E0D5]/60 bg-[#FAF9F6]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#C4A77D] flex items-center justify-center">
              <AltavizLogo size={16} variant="white" />
            </div>
            <span className="text-sm font-semibold text-[#1C1917]">Altaviz</span>
          </Link>

          {/* Nav */}
          <nav className="flex items-center gap-6">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="text-xs text-[#78716C] hover:text-[#1C1917] transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Compliance badges */}
          <div className="flex items-center gap-1.5 text-[10px] text-[#C4A77D]/80">
            <span>49 CFR 192</span>
            <span>&middot;</span>
            <span>API 618</span>
            <span>&middot;</span>
            <span>ISO 10816</span>
            <span>&middot;</span>
            <span>EPA Subpart W</span>
          </div>
        </div>

        <div className="mt-6 pt-5 border-t border-[#E7E0D5]/40 text-center">
          <p className="text-[11px] text-[#A8A29E]">
            &copy; {new Date().getFullYear()} Altaviz, Inc.
          </p>
        </div>
      </div>
    </footer>
  );
}
