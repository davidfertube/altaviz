'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import useSWR, { mutate } from 'swr';
import Header from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { UserPlus, Shield, Trash2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface TeamMember {
  id: string;
  email: string;
  name: string | null;
  role: string;
  last_login_at: string | null;
  created_at: string;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const ROLE_COLORS: Record<string, string> = {
  owner: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  admin: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  operator: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  viewer: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
};

export default function TeamPage() {
  const { data: session } = useSession();
  const { data: members, isLoading } = useSWR<TeamMember[]>('/api/team', fetcher);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('viewer');
  const [inviting, setInviting] = useState(false);

  const isAdmin = session?.user?.role === 'owner' || session?.user?.role === 'admin';

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteEmail) return;
    setInviting(true);
    try {
      const res = await fetch('/api/team/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Failed to invite');
        return;
      }
      toast.success(`Invited ${inviteEmail} as ${inviteRole}`);
      setInviteEmail('');
      mutate('/api/team');
    } catch {
      toast.error('Failed to send invite');
    } finally {
      setInviting(false);
    }
  }

  async function handleRoleChange(userId: string, newRole: string) {
    try {
      const res = await fetch(`/api/team/members/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || 'Failed to update role');
        return;
      }
      toast.success('Role updated');
      mutate('/api/team');
    } catch {
      toast.error('Failed to update role');
    }
  }

  async function handleRemove(userId: string, email: string) {
    if (!confirm(`Remove ${email} from the organization?`)) return;
    try {
      const res = await fetch(`/api/team/members/${userId}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || 'Failed to remove member');
        return;
      }
      toast.success('Member removed');
      mutate('/api/team');
    } catch {
      toast.error('Failed to remove member');
    }
  }

  return (
    <div className="min-h-screen">
      <Header title="Team Management" subtitle="Manage team members and roles" />

      <div className="p-4 sm:p-6 space-y-6 max-w-4xl">
        <Link
          href="/dashboard/settings"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-4" />
          Back to Settings
        </Link>

        {/* Invite form */}
        {isAdmin && (
          <Card>
            <CardHeader className="py-4 px-6">
              <CardTitle className="text-base flex items-center gap-2">
                <UserPlus className="size-4" />
                Invite Team Member
              </CardTitle>
            </CardHeader>
            <CardContent className="px-6 pb-6">
              <form onSubmit={handleInvite} className="flex flex-col sm:flex-row gap-3">
                <input
                  type="email"
                  placeholder="team@company.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  required
                  className="flex-1 h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="viewer">Viewer</option>
                  <option value="operator">Operator</option>
                  <option value="admin">Admin</option>
                </select>
                <Button type="submit" size="sm" disabled={inviting} className="h-9">
                  {inviting ? 'Inviting...' : 'Send Invite'}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Members list */}
        <Card>
          <CardHeader className="py-4 px-6">
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="size-4" />
              Team Members
              {members && (
                <Badge variant="secondary" className="ml-2">
                  {members.length}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-6 pb-6">
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : !members?.length ? (
              <p className="text-sm text-muted-foreground">No team members found</p>
            ) : (
              <div className="divide-y">
                {members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">
                        {member.name || member.email}
                        {member.id === session?.user?.id && (
                          <span className="text-xs text-muted-foreground ml-1">(you)</span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                    </div>

                    <div className="flex items-center gap-2 ml-4">
                      {isAdmin && member.role !== 'owner' && member.id !== session?.user?.id ? (
                        <select
                          value={member.role}
                          onChange={(e) => handleRoleChange(member.id, e.target.value)}
                          className="h-7 rounded border border-input bg-transparent px-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        >
                          <option value="viewer">Viewer</option>
                          <option value="operator">Operator</option>
                          <option value="admin">Admin</option>
                        </select>
                      ) : (
                        <Badge
                          variant="secondary"
                          className={`text-[10px] capitalize ${ROLE_COLORS[member.role] || ''}`}
                        >
                          {member.role}
                        </Badge>
                      )}

                      {isAdmin && member.role !== 'owner' && member.id !== session?.user?.id && (
                        <button
                          onClick={() => handleRemove(member.id, member.email)}
                          className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                          title="Remove member"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Role descriptions */}
        <Card>
          <CardHeader className="py-4 px-6">
            <CardTitle className="text-base">Role Permissions</CardTitle>
          </CardHeader>
          <CardContent className="px-6 pb-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <Badge className={`text-[10px] mb-1 ${ROLE_COLORS.owner}`}>Owner</Badge>
                <p className="text-xs text-muted-foreground">Full access. Manage billing, team, and all settings.</p>
              </div>
              <div>
                <Badge className={`text-[10px] mb-1 ${ROLE_COLORS.admin}`}>Admin</Badge>
                <p className="text-xs text-muted-foreground">Manage team, billing, workflows. All operational access.</p>
              </div>
              <div>
                <Badge className={`text-[10px] mb-1 ${ROLE_COLORS.operator}`}>Operator</Badge>
                <p className="text-xs text-muted-foreground">View data, acknowledge/resolve alerts. No admin access.</p>
              </div>
              <div>
                <Badge className={`text-[10px] mb-1 ${ROLE_COLORS.viewer}`}>Viewer</Badge>
                <p className="text-xs text-muted-foreground">Read-only access to dashboards and reports.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
