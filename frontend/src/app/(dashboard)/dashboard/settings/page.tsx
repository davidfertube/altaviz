'use client';

import { useSession } from 'next-auth/react';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CreditCard } from 'lucide-react';

export default function SettingsPage() {
  const { data: session } = useSession();

  return (
    <div className="min-h-screen">
      <Header title="Settings" subtitle="Manage your organization and account" />

      <div className="p-4 sm:p-6 space-y-6 max-w-3xl">
        {/* Organization */}
        <Card>
          <CardHeader className="py-4 px-6">
            <CardTitle className="text-base">Organization</CardTitle>
          </CardHeader>
          <CardContent className="px-6 pb-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{session?.user?.organizationName || 'Loading...'}</p>
                <p className="text-xs text-muted-foreground">Organization name</p>
              </div>
              <Badge variant="outline" className="capitalize">
                {session?.user?.subscriptionTier || 'free'} plan
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Profile */}
        <Card>
          <CardHeader className="py-4 px-6">
            <CardTitle className="text-base">Profile</CardTitle>
          </CardHeader>
          <CardContent className="px-6 pb-6 space-y-3">
            <div>
              <p className="text-xs text-muted-foreground">Name</p>
              <p className="text-sm font-medium">{session?.user?.name || '--'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Email</p>
              <p className="text-sm font-medium">{session?.user?.email || '--'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Role</p>
              <p className="text-sm font-medium capitalize">{session?.user?.role || '--'}</p>
            </div>
          </CardContent>
        </Card>

        {/* Billing */}
        <Card>
          <CardHeader className="py-4 px-6">
            <CardTitle className="text-base">Billing</CardTitle>
          </CardHeader>
          <CardContent className="px-6 pb-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium capitalize">
                  {session?.user?.subscriptionTier || 'free'} plan
                </p>
                <p className="text-xs text-muted-foreground">
                  Manage your subscription, upgrade, or view invoices
                </p>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link href="/dashboard/settings/billing">
                  <CreditCard className="size-4 mr-2" />
                  Manage Billing
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
