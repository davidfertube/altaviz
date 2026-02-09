import type { MaintenanceEvent } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import StatusBadge from '@/components/indicators/StatusBadge';
import { formatNumber } from '@/lib/utils';

export default function MaintenanceTable({ events }: { events: MaintenanceEvent[] }) {
  if (events.length === 0) {
    return <div className="text-center py-8 text-sm text-muted-foreground">No maintenance events</div>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="text-xs uppercase tracking-wider">Date</TableHead>
          <TableHead className="text-xs uppercase tracking-wider">Type</TableHead>
          <TableHead className="text-xs uppercase tracking-wider hidden sm:table-cell">Severity</TableHead>
          <TableHead className="text-xs uppercase tracking-wider hidden md:table-cell">Description</TableHead>
          <TableHead className="text-xs uppercase tracking-wider">Downtime</TableHead>
          <TableHead className="text-xs uppercase tracking-wider hidden sm:table-cell">Cost</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {events.map(event => (
          <TableRow key={event.id}>
            <TableCell className="font-mono text-xs">{event.event_date}</TableCell>
            <TableCell className="capitalize">{event.event_type}</TableCell>
            <TableCell className="hidden sm:table-cell">
              {event.severity && (
                <StatusBadge status={event.severity === 'low' || event.severity === 'medium' ? 'warning' : 'critical'} />
              )}
            </TableCell>
            <TableCell className="text-muted-foreground max-w-xs truncate hidden md:table-cell">{event.description || '--'}</TableCell>
            <TableCell className="font-mono text-xs">
              {event.downtime_hours != null ? `${formatNumber(event.downtime_hours)}h` : '--'}
            </TableCell>
            <TableCell className="font-mono text-xs hidden sm:table-cell">
              {event.cost_usd != null ? `$${formatNumber(event.cost_usd, 0)}` : '--'}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
