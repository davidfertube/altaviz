// ============================================
// Email HTML templates — inline CSS for maximum
// email client compatibility
// ============================================

// ---------------------------------------------------------------------------
// Brand constants (inline — no external CSS in emails)
// ---------------------------------------------------------------------------

const BRAND = {
  gold: '#C4A77D',
  goldLight: '#D4BC9A',
  text: '#1C1917',
  textMuted: '#57534E',
  background: '#FAFAF9',
  surface: '#FFFFFF',
  border: '#E7E5E4',
  critical: '#DC2626',
  criticalBg: '#FEF2F2',
  criticalBorder: '#FECACA',
  warning: '#EA580C',
  warningBg: '#FFF7ED',
  warningBorder: '#FED7AA',
  success: '#16A34A',
  successBg: '#F0FDF4',
} as const;

// ---------------------------------------------------------------------------
// Shared layout wrapper
// ---------------------------------------------------------------------------

function emailLayout(content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Altaviz</title>
</head>
<body style="margin: 0; padding: 0; background-color: ${BRAND.background}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; color: ${BRAND.text}; -webkit-text-size-adjust: 100%;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: ${BRAND.background};">
    <tr>
      <td align="center" style="padding: 40px 16px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%;">
          <!-- Header -->
          <tr>
            <td style="padding: 24px 32px; background-color: ${BRAND.text}; border-radius: 12px 12px 0 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <span style="font-size: 22px; font-weight: 700; color: ${BRAND.surface}; letter-spacing: -0.5px;">Alta</span><span style="font-size: 22px; font-weight: 700; color: ${BRAND.gold}; letter-spacing: -0.5px;">viz</span>
                  </td>
                  <td align="right" style="font-size: 12px; color: ${BRAND.goldLight}; text-transform: uppercase; letter-spacing: 1px;">
                    Pipeline Integrity
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="background-color: ${BRAND.surface}; padding: 40px 32px; border-left: 1px solid ${BRAND.border}; border-right: 1px solid ${BRAND.border};">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; background-color: ${BRAND.surface}; border-top: 1px solid ${BRAND.border}; border-radius: 0 0 12px 12px; border-left: 1px solid ${BRAND.border}; border-right: 1px solid ${BRAND.border}; border-bottom: 1px solid ${BRAND.border};">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="font-size: 12px; color: ${BRAND.textMuted}; line-height: 1.6;">
                    Altaviz &mdash; Predictive maintenance for natural gas pipeline infrastructure.<br />
                    This is an automated message. Please do not reply directly to this email.
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Button helper
// ---------------------------------------------------------------------------

function button(label: string, url: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin: 24px 0;">
  <tr>
    <td style="background-color: ${BRAND.gold}; border-radius: 8px;">
      <a href="${escapeHtml(url)}" target="_blank" style="display: inline-block; padding: 14px 28px; font-size: 14px; font-weight: 600; color: ${BRAND.text}; text-decoration: none; border-radius: 8px;">${escapeHtml(label)}</a>
    </td>
  </tr>
</table>`;
}

// ---------------------------------------------------------------------------
// HTML escaping
// ---------------------------------------------------------------------------

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ---------------------------------------------------------------------------
// 1. Welcome Email
// ---------------------------------------------------------------------------

export function welcomeEmailTemplate(params: {
  userName: string;
  organizationName: string;
  dashboardUrl: string;
}): string {
  const { userName, organizationName, dashboardUrl } = params;

  const content = `
<h1 style="margin: 0 0 8px 0; font-size: 24px; font-weight: 700; color: ${BRAND.text};">Welcome to Altaviz</h1>
<p style="margin: 0 0 24px 0; font-size: 15px; color: ${BRAND.textMuted}; line-height: 1.6;">
  Hi ${escapeHtml(userName)}, your organization <strong style="color: ${BRAND.text};">${escapeHtml(organizationName)}</strong> is ready. Here&rsquo;s how to get started with predictive pipeline monitoring.
</p>

<!-- Steps -->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
  <tr>
    <td style="padding: 16px; background-color: ${BRAND.background}; border-radius: 8px; border: 1px solid ${BRAND.border};">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <!-- Step 1 -->
        <tr>
          <td width="40" valign="top" style="padding: 8px 0;">
            <span style="display: inline-block; width: 28px; height: 28px; line-height: 28px; text-align: center; background-color: ${BRAND.gold}; color: ${BRAND.text}; font-size: 13px; font-weight: 700; border-radius: 50%;">1</span>
          </td>
          <td style="padding: 8px 0;">
            <strong style="font-size: 14px; color: ${BRAND.text};">Explore the live demo</strong>
            <p style="margin: 4px 0 0 0; font-size: 13px; color: ${BRAND.textMuted}; line-height: 1.5;">
              See real-time fleet monitoring, alert management, and ML-driven failure predictions in action &mdash; no configuration required.
            </p>
          </td>
        </tr>
        <!-- Step 2 -->
        <tr>
          <td width="40" valign="top" style="padding: 8px 0;">
            <span style="display: inline-block; width: 28px; height: 28px; line-height: 28px; text-align: center; background-color: ${BRAND.gold}; color: ${BRAND.text}; font-size: 13px; font-weight: 700; border-radius: 50%;">2</span>
          </td>
          <td style="padding: 8px 0;">
            <strong style="font-size: 14px; color: ${BRAND.text};">Connect your SCADA system</strong>
            <p style="margin: 4px 0 0 0; font-size: 13px; color: ${BRAND.textMuted}; line-height: 1.5;">
              Integrate sensor data from your pipeline infrastructure. Altaviz supports standard SCADA protocols and CSV/Parquet ingestion.
            </p>
          </td>
        </tr>
        <!-- Step 3 -->
        <tr>
          <td width="40" valign="top" style="padding: 8px 0;">
            <span style="display: inline-block; width: 28px; height: 28px; line-height: 28px; text-align: center; background-color: ${BRAND.gold}; color: ${BRAND.text}; font-size: 13px; font-weight: 700; border-radius: 50%;">3</span>
          </td>
          <td style="padding: 8px 0;">
            <strong style="font-size: 14px; color: ${BRAND.text};">Invite your team</strong>
            <p style="margin: 4px 0 0 0; font-size: 13px; color: ${BRAND.textMuted}; line-height: 1.5;">
              Add operators, engineers, and stakeholders. Role-based access ensures everyone sees the data they need.
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>

${button('Open Your Dashboard', dashboardUrl)}

<p style="margin: 0; font-size: 13px; color: ${BRAND.textMuted}; line-height: 1.6;">
  Need help getting started? Check our documentation or reply to this email &mdash; we&rsquo;re here to help.
</p>`;

  return emailLayout(content);
}

// ---------------------------------------------------------------------------
// 2. Critical Alert Email
// ---------------------------------------------------------------------------

export function criticalAlertEmailTemplate(params: {
  alertId: number;
  segment: string;
  severity: 'warning' | 'critical';
  description: string;
  timestamp: string;
  alertUrl: string;
}): string {
  const { alertId, segment, severity, description, timestamp, alertUrl } = params;

  const isCritical = severity === 'critical';
  const severityLabel = isCritical ? 'CRITICAL' : 'WARNING';
  const severityColor = isCritical ? BRAND.critical : BRAND.warning;
  const severityBg = isCritical ? BRAND.criticalBg : BRAND.warningBg;
  const severityBorder = isCritical ? BRAND.criticalBorder : BRAND.warningBorder;

  const content = `
<!-- Severity banner -->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
  <tr>
    <td style="padding: 12px 16px; background-color: ${severityBg}; border: 1px solid ${severityBorder}; border-radius: 8px; border-left: 4px solid ${severityColor};">
      <span style="font-size: 12px; font-weight: 700; color: ${severityColor}; text-transform: uppercase; letter-spacing: 1px;">${severityLabel} ALERT</span>
    </td>
  </tr>
</table>

<h1 style="margin: 0 0 8px 0; font-size: 22px; font-weight: 700; color: ${BRAND.text};">Alert on ${escapeHtml(segment)}</h1>
<p style="margin: 0 0 24px 0; font-size: 15px; color: ${BRAND.textMuted}; line-height: 1.6;">
  A ${severity} condition has been detected that requires${isCritical ? ' immediate' : ''} attention.
</p>

<!-- Alert details -->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px; border: 1px solid ${BRAND.border}; border-radius: 8px;">
  <tr>
    <td style="padding: 14px 16px; border-bottom: 1px solid ${BRAND.border};">
      <span style="font-size: 12px; color: ${BRAND.textMuted}; text-transform: uppercase; letter-spacing: 0.5px;">Pipeline Segment</span><br />
      <strong style="font-size: 15px; color: ${BRAND.text};">${escapeHtml(segment)}</strong>
    </td>
  </tr>
  <tr>
    <td style="padding: 14px 16px; border-bottom: 1px solid ${BRAND.border};">
      <span style="font-size: 12px; color: ${BRAND.textMuted}; text-transform: uppercase; letter-spacing: 0.5px;">Severity</span><br />
      <strong style="font-size: 15px; color: ${severityColor};">${severityLabel}</strong>
    </td>
  </tr>
  <tr>
    <td style="padding: 14px 16px; border-bottom: 1px solid ${BRAND.border};">
      <span style="font-size: 12px; color: ${BRAND.textMuted}; text-transform: uppercase; letter-spacing: 0.5px;">Description</span><br />
      <span style="font-size: 15px; color: ${BRAND.text}; line-height: 1.5;">${escapeHtml(description)}</span>
    </td>
  </tr>
  <tr>
    <td style="padding: 14px 16px;">
      <span style="font-size: 12px; color: ${BRAND.textMuted}; text-transform: uppercase; letter-spacing: 0.5px;">Detected At</span><br />
      <span style="font-size: 15px; color: ${BRAND.text}; font-variant-numeric: tabular-nums;">${escapeHtml(timestamp)}</span>
    </td>
  </tr>
</table>

<p style="margin: 0 0 4px 0; font-size: 12px; color: ${BRAND.textMuted};">Alert ID: ${alertId}</p>

${button('View Alert Details', alertUrl)}

<p style="margin: 0; font-size: 13px; color: ${BRAND.textMuted}; line-height: 1.6;">
  You are receiving this notification because you are subscribed to ${severity} alerts for this pipeline segment. Manage notification preferences in your dashboard settings.
</p>`;

  return emailLayout(content);
}

// ---------------------------------------------------------------------------
// 3. Team Invite Email
// ---------------------------------------------------------------------------

export function teamInviteEmailTemplate(params: {
  organizationName: string;
  inviterName: string;
  role: string;
  acceptUrl: string;
}): string {
  const { organizationName, inviterName, role, acceptUrl } = params;

  const roleDescriptions: Record<string, string> = {
    owner: 'Full access including billing and organization settings',
    admin: 'Manage team members, alerts, and system configuration',
    operator: 'Monitor pipeline status, acknowledge and resolve alerts',
    viewer: 'View dashboards and reports in read-only mode',
  };

  const roleDescription = roleDescriptions[role] || `Access the platform as ${role}`;

  const content = `
<h1 style="margin: 0 0 8px 0; font-size: 24px; font-weight: 700; color: ${BRAND.text};">You&rsquo;re invited</h1>
<p style="margin: 0 0 24px 0; font-size: 15px; color: ${BRAND.textMuted}; line-height: 1.6;">
  <strong style="color: ${BRAND.text};">${escapeHtml(inviterName)}</strong> has invited you to join
  <strong style="color: ${BRAND.text};">${escapeHtml(organizationName)}</strong> on Altaviz &mdash;
  a predictive maintenance platform for natural gas pipeline infrastructure.
</p>

<!-- Role details -->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
  <tr>
    <td style="padding: 16px; background-color: ${BRAND.background}; border-radius: 8px; border: 1px solid ${BRAND.border};">
      <span style="font-size: 12px; color: ${BRAND.textMuted}; text-transform: uppercase; letter-spacing: 0.5px;">Your Role</span><br />
      <strong style="font-size: 16px; color: ${BRAND.text}; text-transform: capitalize;">${escapeHtml(role)}</strong>
      <p style="margin: 6px 0 0 0; font-size: 13px; color: ${BRAND.textMuted}; line-height: 1.5;">
        ${escapeHtml(roleDescription)}
      </p>
    </td>
  </tr>
</table>

${button('Accept Invitation', acceptUrl)}

<p style="margin: 0 0 8px 0; font-size: 13px; color: ${BRAND.textMuted}; line-height: 1.6;">
  This invitation will expire in 7 days. If you did not expect this invitation, you can safely ignore this email.
</p>
<p style="margin: 0; font-size: 13px; color: ${BRAND.textMuted}; line-height: 1.6;">
  If the button above does not work, copy and paste this link into your browser:<br />
  <a href="${escapeHtml(acceptUrl)}" style="color: ${BRAND.gold}; word-break: break-all;">${escapeHtml(acceptUrl)}</a>
</p>`;

  return emailLayout(content);
}
