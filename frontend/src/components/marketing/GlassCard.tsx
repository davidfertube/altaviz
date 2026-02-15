'use client';

import { cn } from '@/lib/utils';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}

export default function GlassCard({ children, className, hover = true }: GlassCardProps) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-[#E7E0D5] bg-white p-6',
        hover && 'transition-all duration-300 hover:border-[#C4A77D]/40 hover:shadow-lg hover:shadow-[#C4A77D]/5',
        className
      )}
    >
      {children}
    </div>
  );
}
