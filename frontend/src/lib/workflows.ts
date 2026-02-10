import { query } from './db';

export interface WorkflowResult {
  workflow: string;
  actionsCount: number;
  details: string[];
}

/**
 * Agentic Workflow Engine
 *
 * Automated workflows that act on data without human intervention:
 * 1. Alert auto-escalation: Unacknowledged warnings -> critical after threshold
 * 2. Alert auto-resolution: Sensor readings returned to normal -> resolve alert
 * 3. Data freshness monitoring: No data for X hours -> create staleness alert
 * 4. Stale alert cleanup: Resolved alerts older than retention period -> archive
 */

const WORKFLOW_CONFIG = {
  escalateAfterHours: parseInt(process.env.WORKFLOW_ESCALATION_HOURS || '4'),
  staleAfterHours: parseInt(process.env.WORKFLOW_STALENESS_HOURS || '3'),
  cleanupAfterDays: parseInt(process.env.WORKFLOW_CLEANUP_DAYS || '7'),
};

// Auto-escalate: Unacknowledged warning alerts older than escalation window -> critical
export async function runAlertEscalation(organizationId: string, escalateAfterHours = WORKFLOW_CONFIG.escalateAfterHours): Promise<WorkflowResult> {
  const escalated = await query<{ id: number; compressor_id: string }>(
    `UPDATE alert_history
     SET severity = 'critical',
         message = COALESCE(message, '') || ' [Auto-escalated from warning after ' || $2::text || 'h]'
     WHERE organization_id = $1
       AND severity = 'warning'
       AND acknowledged = FALSE
       AND resolved = FALSE
       AND alert_timestamp < NOW() - make_interval(hours => $2)
     RETURNING id, compressor_id`,
    [organizationId, escalateAfterHours]
  );

  return {
    workflow: 'alert_escalation',
    actionsCount: escalated.length,
    details: escalated.map(a => `Alert #${a.id} on ${a.compressor_id} escalated to critical`),
  };
}

// Auto-resolve: If a compressor's latest readings are within normal thresholds, resolve its active alerts
export async function runAlertAutoResolve(organizationId: string): Promise<WorkflowResult> {
  const resolved = await query<{ id: number; compressor_id: string }>(
    `UPDATE alert_history
     SET resolved = TRUE, resolved_at = NOW(),
         message = COALESCE(message, '') || ' [Auto-resolved: readings returned to normal]'
     WHERE organization_id = $1
       AND resolved = FALSE
       AND alert_timestamp < NOW() - INTERVAL '2 hours'
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

// Data freshness: Check for compressors with no new readings in the expected window
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

  // Batch insert staleness alerts (avoids N+1)
  if (staleCompressors.length > 0) {
    const valuePlaceholders = staleCompressors.map((_, i) => {
      const base = i * 2 + 3;
      return `($${base}, $1, NOW(), 'anomaly', 'warning', 'data_freshness', $${base + 1})`;
    }).join(', ');

    const params: unknown[] = [organizationId, staleAfterHours];
    for (const comp of staleCompressors) {
      params.push(
        comp.compressor_id,
        `Data staleness detected: no new readings since ${comp.last_reading_time}. Last data is over ${staleAfterHours} hours old.`
      );
    }

    await query(
      `INSERT INTO alert_history (compressor_id, organization_id, alert_timestamp, alert_type, severity, sensor_name, message)
       VALUES ${valuePlaceholders}`,
      params
    );
  }

  return {
    workflow: 'data_freshness_check',
    actionsCount: staleCompressors.length,
    details: staleCompressors.map(c => `Staleness alert created for ${c.compressor_id} (last reading: ${c.last_reading_time})`),
  };
}

// Stale alert cleanup: Auto-acknowledge very old unacknowledged alerts
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

// Run all workflows in sequence
export async function runAllWorkflows(organizationId: string): Promise<WorkflowResult[]> {
  const results: WorkflowResult[] = [];

  results.push(await runAlertEscalation(organizationId));
  results.push(await runAlertAutoResolve(organizationId));
  results.push(await runDataFreshnessCheck(organizationId));
  results.push(await runStaleAlertCleanup(organizationId));

  return results;
}
