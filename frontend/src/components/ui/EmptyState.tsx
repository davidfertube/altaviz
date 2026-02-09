import { Database } from 'lucide-react';

export default function EmptyState({
  title = 'No data available',
  message = 'Run the data simulator and ETL pipeline to populate the database.',
}: {
  title?: string;
  message?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Database className="size-12 text-muted-foreground mb-4" strokeWidth={1} />
      <h3 className="text-sm font-medium mb-1">{title}</h3>
      <p className="text-xs text-muted-foreground max-w-sm">{message}</p>
    </div>
  );
}
