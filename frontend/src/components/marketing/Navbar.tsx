'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import AltavizLogo from '@/components/brand/AltavizLogo';
import {
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuTrigger,
  NavigationMenuContent,
  NavigationMenuLink,
} from '@/components/ui/navigation-menu';
import {
  Menu,
  X,
  ChevronDown,
  Activity,
  Bell,
  Leaf,
  Shield,
  GitBranch,
  BookOpen,
  Lock,
  Building2,
  Mail,
  ArrowRight,
  MapPin,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Mega-menu item component                                           */
/* ------------------------------------------------------------------ */
function MegaMenuItem({
  icon: Icon,
  title,
  description,
  href = '#',
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  href?: string;
}) {
  return (
    <NavigationMenuLink asChild>
      <a
        href={href}
        className="flex items-start gap-3 rounded-lg p-3 hover:bg-[#F5F0E8] transition-colors group"
      >
        <div className="mt-0.5 rounded-md bg-[#C4A77D]/10 p-1.5 text-[#A68B5B] group-hover:bg-[#C4A77D]/20 transition-colors">
          <Icon className="size-4" />
        </div>
        <div>
          <p className="text-sm font-medium text-[#1C1917]">{title}</p>
          <p className="text-xs text-[#A8A29E] leading-snug mt-0.5">{description}</p>
        </div>
      </a>
    </NavigationMenuLink>
  );
}

/* ------------------------------------------------------------------ */
/*  Mobile accordion group                                             */
/* ------------------------------------------------------------------ */
function MobileNavGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full text-sm font-medium text-[#1C1917] py-2.5 px-3 rounded-lg hover:bg-[#F0EBE1] transition-colors"
      >
        {label}
        <ChevronDown className={cn('size-4 text-[#A8A29E] transition-transform duration-200', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="pl-4 pb-2 space-y-1">
          {children}
        </div>
      )}
    </div>
  );
}

function MobileNavLink({
  href,
  label,
  onClick,
}: {
  href: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <a
      href={href}
      onClick={onClick}
      className="block text-sm text-[#78716C] hover:text-[#1C1917] py-2 px-3 rounded-lg hover:bg-[#F0EBE1] transition-colors"
    >
      {label}
    </a>
  );
}

/* ================================================================== */
/*  Navbar                                                             */
/* ================================================================== */
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
          ? 'bg-white/80 backdrop-blur-xl border-b border-[#E7E0D5]'
          : 'bg-transparent'
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 shrink-0">
            <div className="w-9 h-9 rounded-xl bg-[#C4A77D] flex items-center justify-center text-[#C4A77D]">
              <AltavizLogo size={22} variant="white" />
            </div>
            <span className="text-xl font-bold text-[#1C1917] tracking-tight">Altaviz</span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden lg:block">
            <NavigationMenu>
              <NavigationMenuList className="gap-1">
                {/* ---- Product dropdown ---- */}
                <NavigationMenuItem>
                  <NavigationMenuTrigger className="text-sm font-medium text-[#78716C] hover:text-[#1C1917] bg-transparent hover:bg-[#F5F0E8] data-[state=open]:bg-[#F5F0E8] data-[state=open]:text-[#1C1917]">
                    Product
                  </NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <div className="p-4 w-[320px]">
                      <MegaMenuItem icon={MapPin} title="Fleet Monitoring" description="Interactive map and health dashboard" href="/solutions/transmission-pipelines" />
                      <MegaMenuItem icon={Activity} title="Predictive Maintenance" description="ML-powered anomaly detection and RUL" href="/solutions/reliability-engineers" />
                      <MegaMenuItem icon={Bell} title="Alert Management" description="Prioritized alerts with auto-escalation" href="/solutions/field-operations" />
                      <MegaMenuItem icon={Leaf} title="Emissions Compliance" description="EPA Subpart W tracking and reporting" href="/solutions/compliance-officers" />
                      <MegaMenuItem icon={Shield} title="Security" description="RBAC, audit logs, and compliance standards" href="/security" />
                    </div>
                  </NavigationMenuContent>
                </NavigationMenuItem>

                {/* ---- Pricing direct link ---- */}
                <NavigationMenuItem>
                  <NavigationMenuLink asChild>
                    <Link
                      href="/pricing"
                      className="inline-flex h-9 items-center justify-center rounded-md px-4 py-2 text-sm font-medium text-[#78716C] hover:text-[#1C1917] hover:bg-[#F5F0E8] transition-colors"
                    >
                      Pricing
                    </Link>
                  </NavigationMenuLink>
                </NavigationMenuItem>

                {/* ---- Resources dropdown ---- */}
                <NavigationMenuItem>
                  <NavigationMenuTrigger className="text-sm font-medium text-[#78716C] hover:text-[#1C1917] bg-transparent hover:bg-[#F5F0E8] data-[state=open]:bg-[#F5F0E8] data-[state=open]:text-[#1C1917]">
                    Resources
                  </NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <div className="p-2 w-[240px]">
                      <MegaMenuItem icon={GitBranch} title="Changelog" description="Product updates and releases" href="/changelog" />
                      <MegaMenuItem icon={Lock} title="Security" description="How we protect your data" href="/security" />
                      <MegaMenuItem icon={BookOpen} title="Documentation" description="Contact us for access" href="/contact" />
                    </div>
                  </NavigationMenuContent>
                </NavigationMenuItem>

                {/* ---- Company dropdown ---- */}
                <NavigationMenuItem>
                  <NavigationMenuTrigger className="text-sm font-medium text-[#78716C] hover:text-[#1C1917] bg-transparent hover:bg-[#F5F0E8] data-[state=open]:bg-[#F5F0E8] data-[state=open]:text-[#1C1917]">
                    Company
                  </NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <div className="p-2 w-[220px]">
                      <MegaMenuItem icon={Building2} title="About" description="Our mission and team" href="/about" />
                      <MegaMenuItem icon={Mail} title="Contact" description="Get in touch" href="/contact" />
                    </div>
                  </NavigationMenuContent>
                </NavigationMenuItem>
              </NavigationMenuList>
            </NavigationMenu>
          </div>

          {/* CTAs */}
          <div className="hidden lg:flex items-center gap-3 shrink-0">
            <Link
              href="/login"
              className="text-sm font-medium text-[#78716C] hover:text-[#1C1917] transition-colors px-3 py-2"
            >
              Sign In
            </Link>
            <Link
              href="/signup"
              className="text-sm font-medium text-[#A68B5B] hover:text-[#1C1917] transition-colors px-3 py-2"
            >
              Get Started
            </Link>
            <Link
              href="/contact"
              className="text-sm font-semibold text-white bg-[#1C1917] hover:bg-[#2D2D2D] transition-colors px-5 py-2.5 rounded-full"
            >
              Contact Sales
            </Link>
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="lg:hidden text-[#78716C] hover:text-[#1C1917] p-2"
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="size-6" /> : <Menu className="size-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="lg:hidden bg-white/95 backdrop-blur-xl border-t border-[#E7E0D5] max-h-[80vh] overflow-y-auto">
          <div className="px-4 py-4 space-y-1">
            <MobileNavGroup label="Solutions">
              <MobileNavLink href="/solutions/transmission-pipelines" label="Transmission Pipelines" onClick={closeMobile} />
              <MobileNavLink href="/solutions/gathering-systems" label="Gathering Systems" onClick={closeMobile} />
              <MobileNavLink href="/solutions/reliability-engineers" label="Reliability Engineers" onClick={closeMobile} />
              <MobileNavLink href="/solutions/compliance-officers" label="Compliance Officers" onClick={closeMobile} />
              <MobileNavLink href="/solutions/field-operations" label="Field Operations" onClick={closeMobile} />
            </MobileNavGroup>

            <MobileNavLink href="/pricing" label="Pricing" onClick={closeMobile} />

            <MobileNavGroup label="Resources">
              <MobileNavLink href="/changelog" label="Changelog" onClick={closeMobile} />
              <MobileNavLink href="/security" label="Security" onClick={closeMobile} />
              <MobileNavLink href="/contact" label="Documentation" onClick={closeMobile} />
            </MobileNavGroup>

            <MobileNavGroup label="Company">
              <MobileNavLink href="/about" label="About" onClick={closeMobile} />
              <MobileNavLink href="/contact" label="Contact" onClick={closeMobile} />
            </MobileNavGroup>

            <div className="pt-3 border-t border-[#E7E0D5] space-y-2">
              <Link
                href="/login"
                onClick={closeMobile}
                className="block text-sm font-medium text-[#78716C] hover:text-[#1C1917] py-2.5 px-3 rounded-lg hover:bg-[#F0EBE1] transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/signup"
                onClick={closeMobile}
                className="block text-sm font-medium text-[#A68B5B] hover:text-[#1C1917] py-2.5 px-3 rounded-lg hover:bg-[#F0EBE1] transition-colors"
              >
                Get Started
              </Link>
              <Link
                href="/contact"
                onClick={closeMobile}
                className="block text-sm font-semibold text-center text-white bg-[#1C1917] hover:bg-[#2D2D2D] transition-colors px-5 py-2.5 rounded-full"
              >
                Contact Sales
              </Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
