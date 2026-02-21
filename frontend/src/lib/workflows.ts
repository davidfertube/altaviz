import { query } from './db';
import { sendCriticalAlertEmail } from './email';

export interface WorkflowResult {
  workflow: string;
  actionsCount: number;
  details: string[];
}

const WORKFLOW_CONFIG = {
  escalateAfterHours: parseInt(process.env.WORKFLOW_ESCALATION_HOURS || '4'),
  staleAfterHours: parseInt(process.env.WORKFLOW_STALENESS_HOURS || '3'),
  cleanupAfterDays: parseInt(process.env.WORKFLOW_CLEANUP_DAYS || '7'),
};

export async function runAlertEscalation(organizationId: string, escalateAfterHours = WORKFLOW_CONFIG.escalateAfterHours): Promise<WorkflowResult> {
  const escalated = await query<{ id: number; compressor_id: string }>(
    `UPDATE alert_history
     SET severity = 'critical',
         message = COALESCE(message, '') || ' [Auto-escalated from warning after ' || $2::TEXT || 'h]'
     WHERE organization_id = $1
       AND severity = 'warning'
       AND acknowledged = FALSE
       AND resolved = FALSE
       AND alert_timestamp < NOW() - make_interval(hours => $2)
     RETURNING id, compressor_id`,
    [organizationId, escalateAfterHours]
  );

  if (escalated.length > 0) {
    const admins = await query<{ email: string }>(
      `SELECT u.email FROM users u
       WHERE u.organization_id = $1 AND u.role IN ('owner', 'admin')`,
      [organizationId]
    );
    const adminEmails = admins.map(a => a.email).filter(Boolean);
    if (adminEmails.length > 0) {
      const baseUrl = process.env.NEXTAUTH_URL || 'https://altaviz.vercel.app';
      for (const alert of escalated) {
        sendCriticalAlertEmail({
          to: adminEmails,
          alertId: alert.id,
          segment: alert.compressor_id,
          severity: 'critical',
          description: `Warning auto-escalated to critical after ${escalateAfterHours}h without acknowledgment`,
          timestamp: new Date().toISOString(),
          alertUrl: `${baseUrl}/dashboard/alerts`,
        }).catch(() => {});
      }
    }
  }

  return {
    workflow: 'alert_escalation',
    actionsCount: escalated.length,
    details: escalated.map(a => `Alert #${a.id} on ${a.compressor_id} escalated to critical`),
  };
}

export async function runAlertAutoResolve(organizationId: string): Promise<WorkflowResult> {
  const resolved = await query<{ id: number; compressor_id: string }>(
    `UPDATE alert_history
     SET resolved = TRUE, resolved_at = NOW(),
         message = COALESCE(message, '') || ' [Auto-resolved: readings returned to normal]'
     WHERE organization_id = $1
       AND resolved = FALSE
       AND alert_timestamp < NOW() - make_interval(hours => 2)
       AND compressor_id IN (
         SELECT fh.compressor_id
         FROM v_fleet_health_summary fh
         WHERE fh.organization_id = $1
           AND fh.health_status = 'healthy'
       )
     RETURNING id, compressor_id`,
    [organizationId]
  );

  return {
    workflow: 'alert_auto_resolve',
    actionsCount: resolved.length,
    details: resolved.map(a => `Alert #${a.id} on ${a.compressor_id} auto-resolved (readings normal)`),
  };
}

export async function runDataFreshnessCheck(organizationId: string, staleAfterHours = WORKFLOW_CONFIG.staleAfterHours): Promise<WorkflowResult> {
  const staleCompressors = await query<{ compressor_id: string; last_reading_time: string }>(
    `SELECT fh.compressor_id, fh.last_reading_time
     FROM v_fleet_health_summary fh
     WHERE fh.organization_id = $1
       AND fh.last_reading_time < NOW() - make_interval(hours => $2)
       AND fh.compressor_id NOT IN (
         SELECT ah.compressor_id
         FROM alert_history ah
         WHERE ah.organization_id = $1
           AND ah.alert_type = 'anomaly'
           AND ah.message LIKE '%Data staleness%'
           AND ah.resolved = FALSE
       )`,
    [organizationId, staleAfterHours]
  );

  for (const comp of staleCompressors) {
    await query(
      `INSERT INTO alert_history (compressor_id, organization_id, alert_timestamp, alert_type, severity, sensor_name, message)
       VALUES ($1, $2, NOW(), 'anomaly', 'warning', 'data_freshness', $3)`,
      [
        comp.compressor_id,
        organizationId,
        `Data staleness detected: no new readings since ${comp.last_reading_time}. Last data is over ${staleAfterHours} hours old.`,
      ]
    );
  }

  return {
    workflow: 'data_freshness_check',
    actionsCount: staleCompressors.length,
    details: staleCompressors.map(c => `Staleness alert created for ${c.compressor_id} (last reading: ${c.last_reading_time})`),
  };
}

export async function runStaleAlertCleanup(organizationId: string, staleAfterDays = WORKFLOW_CONFIG.cleanupAfterDays): Promise<WorkflowResult> {
  const cleaned = await query<{ id: number; compressor_id: string }>(
    `UPDATE alert_history
     SET acknowledged = TRUE,
         acknowledged_by = 'system-workflow',
         acknowledged_at = NOW()
     WHERE organization_id = $1
       AND acknowledged = FALSE
       AND alert_timestamp < NOW() - make_interval(days => $2)
     RETURNING id, compressor_id`,
    [organizationId, staleAfterDays]
  );

  return {
    workflow: 'stale_alert_cleanup',
    actionsCount: cleaned.length,
    details: cleaned.map(a => `Alert #${a.id} on ${a.compressor_id} auto-acknowledged (stale > ${staleAfterDays} days)`),
  };
}

export async function runAllWorkflows(organizationId: string): Promise<WorkflowResult[]> {
  const results: WorkflowResult[] = [];

  results.push(await runAlertEscalation(organizationId));
  results.push(await runAlertAutoResolve(organizationId));
  results.push(await runDataFreshnessCheck(organizationId));
  results.push(await runStaleAlertCleanup(organizationId));

  return results;
}
