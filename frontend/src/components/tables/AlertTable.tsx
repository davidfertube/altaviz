'use client';

import type { ActiveAlert, AlertHistory } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import StatusBadge from '@/components/indicators/StatusBadge';
import { formatTimestamp, formatNumber } from '@/lib/utils';

type AlertRow = ActiveAlert | (AlertHistory & { model?: string; station_name?: string });

interface AlertTableProps {
  alerts: AlertRow[];
  compact?: boolean;
  onAcknowledge?: (id: number) => void;
  onResolve?: (id: number) => void;
}

export default function AlertTable({ alerts, compact = false, onAcknowledge, onResolve }: AlertTableProps) {
  if (alerts.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-muted-foreground">
        No alerts found
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="text-xs uppercase tracking-wider">Time</TableHead>
          <TableHead className="text-xs uppercase tracking-wider">Pipeline</TableHead>
          {!compact && <TableHead className="text-xs uppercase tracking-wider hidden md:table-cell">Station</TableHead>}
          <TableHead className="text-xs uppercase tracking-wider">Severity</TableHead>
          <TableHead className="text-xs uppercase tracking-wider hidden sm:table-cell">Sensor</TableHead>
          {!compact && <TableHead className="text-xs uppercase tracking-wider hidden lg:table-cell">Value / Threshold</TableHead>}
          <TableHead className="text-xs uppercase tracking-wider hidden md:table-cell">Message</TableHead>
          {(onAcknowledge || onResolve) && (
            <TableHead className="text-xs uppercase tracking-wider">Actions</TableHead>
          )}
        </TableRow>
      </TableHeader>
      <TableBody>
        {alerts.map((alert) => (
          <TableRow key={alert.id}>
            <TableCell className="text-xs font-mono text-muted-foreground">
              {formatTimestamp(alert.alert_timestamp)}
            </TableCell>
            <TableCell className="font-medium">
              {alert.compressor_id}
            </TableCell>
            {!compact && (
              <TableCell className="text-muted-foreground hidden md:table-cell">
                {'station_name' in alert ? alert.station_name : '--'}
              </TableCell>
            )}
            <TableCell>
              <StatusBadge status={alert.severity} />
            </TableCell>
            <TableCell className="text-muted-foreground hidden sm:table-cell">
              {alert.sensor_name || '--'}
            </TableCell>
            {!compact && (
              <TableCell className="font-mono text-xs hidden lg:table-cell">
                {alert.sensor_value != null
                  ? `${formatNumber(alert.sensor_value)} / ${formatNumber(alert.threshold_value)}`
                  : '--'}
              </TableCell>
            )}
            <TableCell className="text-muted-foreground max-w-xs truncate hidden md:table-cell">
              {alert.message || '--'}
            </TableCell>
            {(onAcknowledge || onResolve) && (
              <TableCell>
                <div className="flex gap-1.5">
                  {onAcknowledge && !alert.acknowledged && (
                    <Button
                      variant="ghost"
                      size="xs"
                      className="text-primary hover:text-primary hover:bg-primary/10"
                      onClick={() => onAcknowledge(alert.id)}
                    >
                      Ack
                    </Button>
                  )}
                  {onResolve && !alert.resolved && (
                    <Button
                      variant="ghost"
                      size="xs"
                      className="text-healthy hover:text-healthy hover:bg-healthy/10"
                      onClick={() => onResolve(alert.id)}
                    >
                      Resolve
                    </Button>
                  )}
                </div>
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
