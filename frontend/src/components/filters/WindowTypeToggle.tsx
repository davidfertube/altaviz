'use client';

import { WINDOW_OPTIONS } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import type { WindowType } from '@/lib/types';

interface WindowTypeToggleProps {
  value: WindowType;
  onChange: (value: WindowType) => void;
}

export default function WindowTypeToggle({ value, onChange }: WindowTypeToggleProps) {
  return (
    <div className="flex gap-1 bg-muted rounded-lg p-1">
      {WINDOW_OPTIONS.map(opt => (
        <Button
          key={opt.value}
          variant={value === opt.value ? 'secondary' : 'ghost'}
          size="xs"
          onClick={() => onChange(opt.value)}
          className={value === opt.value ? 'shadow-sm bg-card' : ''}
        >
          {opt.label}
        </Button>
      ))}
    </div>
  );
}
