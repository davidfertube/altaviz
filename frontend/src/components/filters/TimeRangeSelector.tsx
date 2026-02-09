'use client';

import { TIME_RANGE_OPTIONS } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import type { TimeRange } from '@/lib/types';

interface TimeRangeSelectorProps {
  value: TimeRange;
  onChange: (value: TimeRange) => void;
}

export default function TimeRangeSelector({ value, onChange }: TimeRangeSelectorProps) {
  return (
    <div className="flex gap-1 bg-muted rounded-lg p-1">
      {TIME_RANGE_OPTIONS.map(opt => (
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
