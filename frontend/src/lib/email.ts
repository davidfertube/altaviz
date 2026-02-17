// ============================================
// Email utility — provider-agnostic sending
// Primary provider: Resend (https://resend.com)
// Gracefully degrades if RESEND_API_KEY is unset
// ============================================

import {
  welcomeEmailTemplate,
  criticalAlertEmailTemplate,
  teamInviteEmailTemplate,
} from './email-templates';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const FROM_EMAIL = 'noreply@altaviz.com';
const FROM_NAME = 'Altaviz';
const FROM_ADDRESS = `${FROM_NAME} <${FROM_EMAIL}>`;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SendEmailParams {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  tags?: Array<{ name: string; value: string }>;
}

export interface EmailResult {
  success: boolean;
  id?: string;
  error?: string;
}

// ---------------------------------------------------------------------------
// Core send function
// ---------------------------------------------------------------------------

export async function sendEmail(params: SendEmailParams): Promise<EmailResult> {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    console.warn(
      '[email] RESEND_API_KEY is not configured — skipping email send:',
      params.subject
    );
    return { success: false, error: 'Email provider not configured' };
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_ADDRESS,
        to: Array.isArray(params.to) ? params.to : [params.to],
        subject: params.subject,
        html: params.html,
        ...(params.text && { text: params.text }),
        ...(params.replyTo && { reply_to: params.replyTo }),
        ...(params.tags && { tags: params.tags }),
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      console.error('[email] Resend API error:', response.status, body);
      return { success: false, error: `Resend API error: ${response.status}` };
    }

    const data = await response.json();
    return { success: true, id: data.id };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[email] Failed to send email:', message);
    return { success: false, error: message };
  }
}

// ---------------------------------------------------------------------------
// Template-sending functions
// ---------------------------------------------------------------------------

export async function sendWelcomeEmail(params: {
  to: string;
  userName: string;
  organizationName: string;
  dashboardUrl: string;
}): Promise<EmailResult> {
  return sendEmail({
    to: params.to,
    subject: 'Welcome to Altaviz — Let\'s get your pipeline monitored',
    html: welcomeEmailTemplate({
      userName: params.userName,
      organizationName: params.organizationName,
      dashboardUrl: params.dashboardUrl,
    }),
    text: `Welcome to Altaviz, ${params.userName}! Your organization "${params.organizationName}" is ready. Visit your dashboard: ${params.dashboardUrl}`,
    tags: [{ name: 'category', value: 'welcome' }],
  });
}

export async function sendCriticalAlertEmail(params: {
  to: string | string[];
  alertId: number;
  segment: string;
  severity: 'warning' | 'critical';
  description: string;
  timestamp: string;
  alertUrl: string;
}): Promise<EmailResult> {
  const severityLabel = params.severity === 'critical' ? 'CRITICAL' : 'WARNING';

  return sendEmail({
    to: params.to,
    subject: `[${severityLabel}] Alert on ${params.segment} — Altaviz`,
    html: criticalAlertEmailTemplate({
      alertId: params.alertId,
      segment: params.segment,
      severity: params.severity,
      description: params.description,
      timestamp: params.timestamp,
      alertUrl: params.alertUrl,
    }),
    text: `${severityLabel} alert on ${params.segment}: ${params.description}. View details: ${params.alertUrl}`,
    tags: [
      { name: 'category', value: 'alert' },
      { name: 'severity', value: params.severity },
    ],
  });
}

export async function sendTeamInviteEmail(params: {
  to: string;
  organizationName: string;
  inviterName: string;
  role: string;
  acceptUrl: string;
}): Promise<EmailResult> {
  return sendEmail({
    to: params.to,
    subject: `You've been invited to ${params.organizationName} on Altaviz`,
    html: teamInviteEmailTemplate({
      organizationName: params.organizationName,
      inviterName: params.inviterName,
      role: params.role,
      acceptUrl: params.acceptUrl,
    }),
    text: `${params.inviterName} has invited you to join ${params.organizationName} on Altaviz as ${params.role}. Accept the invitation: ${params.acceptUrl}`,
    tags: [{ name: 'category', value: 'invite' }],
  });
}
