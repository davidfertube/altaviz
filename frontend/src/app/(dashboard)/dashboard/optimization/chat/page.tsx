'use client';

import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import ChatInterface from '@/components/agents/ChatInterface';

export default function OptimizationChatPage() {
  return (
    <div className="min-h-screen">
      <Header title="Optimization Copilot" subtitle="Conversational fleet optimization" />

      <div className="p-4 sm:p-6 space-y-4">
        <Link href="/dashboard/optimization" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> Back to optimization
        </Link>

        <ChatInterface />
      </div>
    </div>
  );
}
