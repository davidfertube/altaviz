'use client';

import { SessionProvider } from 'next-auth/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutGrid, Activity, Bell, Flame, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import AltavizLogo from '@/components/brand/AltavizLogo';

const DEMO_NAV = [
  { href: '/demo', label: 'Fleet Overview', icon: LayoutGrid },
  { href: '/demo/monitoring', label: 'Monitoring', icon: Activity },
  { href: '/demo/alerts', label: 'Alerts', icon: Bell },
  { href: '/demo/emissions', label: 'Emissions', icon: Flame },
];

function DemoSidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <>
      {/* Logo */}
      <div className="h-16 flex items-center px-6">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary">
            <AltavizLogo size={20} variant="white" />
          </div>
          <span className="text-lg font-semibold tracking-tight">Altaviz</span>
        </div>
      </div>

      <Separator />

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {DEMO_NAV.map((item) => {
          const Icon = item.icon;
          const isActive = item.href === '/demo'
            ? pathname === '/demo'
            : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              )}
            >
              <Icon className="size-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <Separator />

      {/* Footer */}
      <div className="px-4 py-4">
        <p className="text-xs text-muted-foreground">Predictive Maintenance</p>
        <span className="inline-flex items-center px-2 py-0.5 mt-1 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-500">
          DEMO MODE
        </span>
      </div>
    </>
  );
}

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <SessionProvider>
    <div className="flex min-h-screen">
      {/* Demo Banner */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-amber-500/90 text-black text-center py-1.5 text-sm font-medium backdrop-blur-sm">
        This is a live demo with simulated data.{' '}
        <Link href="/login" className="underline font-semibold hover:opacity-80">
          Sign up for free &rarr;
        </Link>
      </div>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex fixed left-0 top-8 h-[calc(100vh-2rem)] w-60 bg-card border-r border-border flex-col z-40">
        <DemoSidebarNav />
      </aside>

      {/* Mobile Menu */}
      <div className="lg:hidden fixed top-8 left-0 z-40 p-2">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="size-5" />
              <span className="sr-only">Toggle menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" showCloseButton={false} className="w-60 p-0 mt-8">
            <SheetHeader className="sr-only">
              <SheetTitle>Navigation</SheetTitle>
            </SheetHeader>
            <div className="flex flex-col h-full">
              <div className="flex items-center justify-end p-2">
                <Button variant="ghost" size="icon" onClick={() => setOpen(false)}>
                  <X className="size-5" />
                </Button>
              </div>
              <DemoSidebarNav onNavigate={() => setOpen(false)} />
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Main content */}
      <main className="flex-1 lg:ml-60 mt-8">
        {children}
      </main>
    </div>
    </SessionProvider>
  );
}
