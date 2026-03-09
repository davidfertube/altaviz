'use client';

import { Bell, Check, ExternalLink, ArrowUpRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { TeamsNotificationData } from '@/lib/action-plan-types';

function formatSentTime(ts: string) {
  const diff = Date.now() - new Date(ts).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'Just now';
  if (min < 60) return `${min} min ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return `${Math.floor(hr / 24)}d ago`;
}

const SEVERITY_COLORS: Record<string, string> = {
  critical: 'bg-red-500',
  warning: 'bg-amber-500',
  info: 'bg-blue-500',
};

export default function TeamsNotificationCard({ data }: { data: TeamsNotificationData }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Bell className="size-5 text-muted-foreground" />
          Microsoft Teams Notification
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          {data.acknowledged ? 'Acknowledged' : 'Sent'} {formatSentTime(data.sentAt)}
        </p>
      </CardHeader>
      <CardContent>
        {/* Teams Card Mock */}
        <div className="border rounded-lg overflow-hidden shadow-sm">
          {/* Purple accent bar */}
          <div className="h-1 bg-[#6264A7]" />

          <div className="p-4 space-y-3">
            {/* Header */}
            <div className="flex items-center gap-2">
              {/* Teams-style bot icon */}
              <div className="w-8 h-8 rounded bg-[#6264A7] flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19.27 7.24c.45-.37.55-1.04.18-1.49-.37-.45-1.04-.55-1.49-.18l-7 5.75a1.01 1.01 0 0 0 0 1.56l7 5.75c.45.37 1.12.27 1.49-.18.37-.45.27-1.12-.18-1.49L13.14 12l6.13-4.76zM4 18h5c.55 0 1-.45 1-1s-.45-1-1-1H4c-.55 0-1 .45-1 1s.45 1 1 1zm0-5h8c.55 0 1-.45 1-1s-.45-1-1-1H4c-.55 0-1 .45-1 1s.45 1 1 1zm0-6c-.55 0-1 .45-1 1s.45 1 1 1h8c.55 0 1-.45 1-1s-.45-1-1-1H4z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold">Altaviz Alert Bot</p>
                <p className="text-xs text-muted-foreground">{formatSentTime(data.sentAt)}</p>
              </div>
              {data.acknowledged && (
                <span className="ml-auto flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                  <Check className="size-3" />
                  Acknowledged
                </span>
              )}
            </div>

            {/* Alert card body */}
            <div className="rounded-md border p-3 space-y-2.5">
              <div className="flex items-center gap-2">
                <span className={cn('w-2.5 h-2.5 rounded-full', SEVERITY_COLORS[data.severity] || 'bg-gray-400')} />
                <span className="font-semibold text-sm">{data.title}</span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-muted-foreground">Compressor</span>
                  <p className="font-mono font-medium">{data.compressorId}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Station</span>
                  <p className="font-medium">{data.stationName}</p>
                </div>
              </div>

              <p className="text-sm text-muted-foreground leading-relaxed">{data.message}</p>
            </div>

            {/* Action buttons (Teams-style) */}
            <div className="flex gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => toast.success('Alert acknowledged in Teams')}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded border border-[#6264A7] text-[#6264A7] hover:bg-[#6264A7]/10 transition-colors"
              >
                <Check className="size-3.5" />
                Acknowledge
              </button>
              <button
                type="button"
                onClick={() => toast.info('Opening action center...')}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded border border-[#6264A7] text-[#6264A7] hover:bg-[#6264A7]/10 transition-colors"
              >
                <ExternalLink className="size-3.5" />
                View Details
              </button>
              <button
                type="button"
                onClick={() => toast.success('Escalated via Teams', { description: 'Maintenance supervisor notified.' })}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded border border-[#6264A7] text-[#6264A7] hover:bg-[#6264A7]/10 transition-colors"
              >
                <ArrowUpRight className="size-3.5" />
                Escalate
              </button>
            </div>
          </div>

          {/* Footer */}
          <div className="px-4 py-2 bg-muted/30 border-t flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 text-[#6264A7]" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.5 12a5.5 5.5 0 1 1 0-11 5.5 5.5 0 0 1 0 11zm-5.38 0H6.5A3.5 3.5 0 0 0 3 15.5V19a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1v-3.5A3.5 3.5 0 0 0 12.12 12z" />
            </svg>
            <span className="text-[10px] text-muted-foreground">Microsoft Teams</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
