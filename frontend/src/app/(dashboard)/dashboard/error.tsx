'use client';

import { useEffect } from 'react';
import Header from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Dashboard error:', error);
  }, [error]);

  return (
    <div className="min-h-screen">
      <Header title="Error" subtitle="Something went wrong" />
      <div className="p-4 sm:p-6 max-w-xl mx-auto">
        <Card>
          <CardContent className="p-6 text-center">
            <AlertTriangle className="size-12 text-amber-500 mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-2">Dashboard Error</h2>
            <p className="text-sm text-muted-foreground mb-6">
              {error.message || 'An unexpected error occurred while loading this page.'}
            </p>
            <Button onClick={reset}>
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
