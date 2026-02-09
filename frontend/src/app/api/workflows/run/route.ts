import { NextRequest, NextResponse } from 'next/server';
import { getAppSession } from '@/lib/session';
import { runAllWorkflows, runAlertEscalation, runAlertAutoResolve, runDataFreshnessCheck, runStaleAlertCleanup } from '@/lib/workflows';
import { trackEvent } from '@/lib/telemetry';

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

    if (apiKey && apiKey === process.env.WORKFLOW_API_KEY) {
      // Cron/scheduler auth — requires org ID in body
      const body = await request.json();
      organizationId = body.organizationId;
      if (!organizationId) {
        return NextResponse.json({ error: 'organizationId required' }, { status: 400 });
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

    trackEvent('workflow_executed', {
      workflow,
      organizationId,
      resultCount: String(Array.isArray(results) ? results.length : 1),
    });

    return NextResponse.json({ success: true, results });
  } catch (error) {
    console.error('Workflow execution error:', error);
    return NextResponse.json({ error: 'Workflow execution failed' }, { status: 500 });
  }
}
