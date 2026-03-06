'use client';

import { User } from 'lucide-react';

export default function UserMenu() {
  return (
    <div className="flex items-center gap-2 rounded-lg px-2 py-1.5">
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#F5C518] to-[#1A3A5C] flex items-center justify-center">
        <User className="size-4 text-white" />
      </div>
      <div className="hidden sm:block text-left">
        <p className="text-sm font-medium leading-tight">Demo User</p>
        <p className="text-xs text-muted-foreground leading-tight">Altaviz Demo</p>
      </div>
    </div>
  );
}
