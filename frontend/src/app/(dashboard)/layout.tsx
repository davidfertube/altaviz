'use client';

import { SessionProvider } from 'next-auth/react';
import Sidebar from '@/components/layout/Sidebar';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionProvider>
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 lg:ml-60">
          {children}
        </main>
      </div>
    </SessionProvider>
  );
}
