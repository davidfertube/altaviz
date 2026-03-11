'use client';

import { ClipboardPlus, ArrowUpRight, CheckCircle2, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import type { RoutingAction } from '@/lib/action-plan-types';

export default function QuickActionButtons({ routing }: { routing: RoutingAction }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Quick Actions</CardTitle>
        <p className="text-sm text-muted-foreground">{routing.description}</p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Button
            size="lg"
            className="h-14 text-sm font-medium"
            variant={routing.primary === 'create_work_order' ? 'default' : 'outline'}
            onClick={() => toast.success('Work order created', { description: 'WO-2026-00142 submitted for supervisor approval.' })}
          >
            <ClipboardPlus className="size-5 mr-2" />
            Create Work Order
          </Button>
          <Button
            size="lg"
            className="h-14 text-sm font-medium"
            variant={routing.primary === 'escalate_supervisor' ? 'default' : 'outline'}
            onClick={() => toast.success('Escalated to supervisor', { description: 'Notification sent to maintenance lead via Teams.' })}
          >
            <ArrowUpRight className="size-5 mr-2" />
            Escalate
          </Button>
          <Button
            size="lg"
            className="h-14 text-sm font-medium"
            variant="outline"
            onClick={() => toast.success('Marked as handled', { description: 'Alert status updated. Shift log entry created.' })}
          >
            <CheckCircle2 className="size-5 mr-2" />
            Mark as Handled
          </Button>
          <Button
            size="lg"
            className="h-14 text-sm font-medium"
            variant="outline"
            onClick={() => toast.info('Help request sent', { description: 'Your request has been sent to the on-call support team.' })}
          >
            <HelpCircle className="size-5 mr-2" />
            Request Help
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
