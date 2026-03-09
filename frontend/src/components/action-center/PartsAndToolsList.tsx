'use client';

import { Package, Wrench } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { PartOrTool } from '@/lib/action-plan-types';

export default function PartsAndToolsList({ items }: { items: PartOrTool[] }) {
  if (items.length === 0) return null;

  const parts = items.filter((i) => i.type === 'part');
  const tools = items.filter((i) => i.type === 'tool');

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Parts & Tools Needed</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {parts.length > 0 && (
          <div>
            <h4 className="flex items-center gap-2 text-sm font-medium mb-2">
              <Package className="size-4 text-muted-foreground" />
              Parts
            </h4>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50 text-xs text-muted-foreground uppercase tracking-wider">
                    <th className="text-left p-2.5">Part</th>
                    <th className="text-left p-2.5 hidden sm:table-cell">P/N</th>
                    <th className="text-center p-2.5">Qty</th>
                    <th className="text-right p-2.5">Est. Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {parts.map((p, i) => (
                    <tr key={i} className="border-t">
                      <td className="p-2.5 font-medium">{p.name}</td>
                      <td className="p-2.5 font-mono text-xs text-muted-foreground hidden sm:table-cell">
                        {p.partNumber || '—'}
                      </td>
                      <td className="p-2.5 text-center">{p.quantity}</td>
                      <td className="p-2.5 text-right font-mono">
                        {p.estimatedCost != null ? `$${p.estimatedCost.toLocaleString()}` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tools.length > 0 && (
          <div>
            <h4 className="flex items-center gap-2 text-sm font-medium mb-2">
              <Wrench className="size-4 text-muted-foreground" />
              Tools Required
            </h4>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {tools.map((t, i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 shrink-0" />
                  {t.name}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
