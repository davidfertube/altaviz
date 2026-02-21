import { NextRequest, NextResponse } from 'next/server';
import { getAppSession } from '@/lib/session';
import { runAllWorkflows, runAlertEscalation, runAlertAutoResolve, runDataFreshnessCheck, runStaleAlertCleanup } from '@/lib/workflows';
import { safeCompare } from '@/lib/crypto';
import { logAuditEvent } from '@/lib/audit';

const WORKFLOW_MAP: Record<string, (orgId: string) => Promise<unknown>> = {
  all: runAllWorkflows,
  alert_escalation: runAlertEscalation,
  alert_auto_resolve: runAlertAutoResolve,
  data_freshness_check: runDataFreshnessCheck,
  stale_alert_cleanup: runStaleAlertCleanup,
};

export async function POST(request: NextRequest) {
  try {
    // Support both session auth and API key auth (for cron jobs)
    const apiKey = request.headers.get('x-api-key');
    let organizationId: string;

    const isValidApiKey = apiKey && (
      (process.env.WORKFLOW_API_KEY && safeCompare(apiKey, process.env.WORKFLOW_API_KEY)) ||
      (process.env.WORKFLOW_API_KEY_OLD && safeCompare(apiKey, process.env.WORKFLOW_API_KEY_OLD))
    );

    if (isValidApiKey) {
      // Cron/scheduler auth — requires org ID in body
      let body;
      try {
        body = await request.json();
      } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
      }
      organizationId = body.organizationId;
      if (!organizationId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(organizationId)) {
        return NextResponse.json({ error: 'Valid organizationId (UUID) required' }, { status: 400 });
      }
    } else {
      // Session auth — use logged-in user's org
      const session = await getAppSession();
      if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      if (session.role !== 'owner' && session.role !== 'admin') {
        return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
      }
      organizationId = session.organizationId;
    }

    const url = new URL(request.url);
    const workflow = url.searchParams.get('workflow') || 'all';

    const runner = WORKFLOW_MAP[workflow];
    if (!runner) {
      return NextResponse.json(
        { error: 'Invalid workflow', available: Object.keys(WORKFLOW_MAP) },
        { status: 400 }
      );
    }

    const results = await runner(organizationId);

    logAuditEvent({
      organizationId,
      action: 'workflow.execute',
      resourceType: 'workflow',
      resourceId: workflow,
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
      details: { authMethod: isValidApiKey ? 'api_key' : 'session' },
    });

    return NextResponse.json({ success: true, results });
  } catch (error) {
    const { handleApiError } = await import('@/lib/errors');
    return handleApiError(error, 'Workflow execution failed');
  }
}
