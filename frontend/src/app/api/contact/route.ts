import { NextRequest, NextResponse } from 'next/server';
import { sendEmail } from '@/lib/email';

const SALES_EMAIL = 'sales@altaviz.com';

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { name, email, company, pipelineMiles, message } = body as {
    name?: string;
    email?: string;
    company?: string;
    pipelineMiles?: string;
    message?: string;
  };

  if (!name || !email || !company) {
    return NextResponse.json(
      { error: 'Name, email, and company are required.' },
      { status: 400 }
    );
  }

  if (!isValidEmail(email)) {
    return NextResponse.json(
      { error: 'Invalid email address.' },
      { status: 400 }
    );
  }

  const safeName = escapeHtml(name);
  const safeEmail = escapeHtml(email);
  const safeCompany = escapeHtml(company);
  const safeMiles = pipelineMiles ? escapeHtml(pipelineMiles) : 'Not specified';
  const safeMessage = message ? escapeHtml(message) : 'No message provided';

  const html = `
    <div style="font-family: Inter, -apple-system, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 0;">
      <h2 style="color: #1C1917; font-size: 20px; margin-bottom: 16px;">New Contact Form Submission</h2>
      <table style="width: 100%; border-collapse: collapse;">
        <tr><td style="padding: 8px 0; color: #78716C; font-size: 14px; width: 120px;">Name</td><td style="padding: 8px 0; color: #1C1917; font-size: 14px;">${safeName}</td></tr>
        <tr><td style="padding: 8px 0; color: #78716C; font-size: 14px;">Email</td><td style="padding: 8px 0; color: #1C1917; font-size: 14px;"><a href="mailto:${safeEmail}" style="color: #A68B5B;">${safeEmail}</a></td></tr>
        <tr><td style="padding: 8px 0; color: #78716C; font-size: 14px;">Company</td><td style="padding: 8px 0; color: #1C1917; font-size: 14px;">${safeCompany}</td></tr>
        <tr><td style="padding: 8px 0; color: #78716C; font-size: 14px;">Pipeline Miles</td><td style="padding: 8px 0; color: #1C1917; font-size: 14px;">${safeMiles}</td></tr>
      </table>
      <div style="margin-top: 24px; padding: 16px; background: #FAF9F6; border-radius: 8px; border: 1px solid #E7E0D5;">
        <p style="color: #78716C; font-size: 12px; margin: 0 0 8px;">Message</p>
        <p style="color: #1C1917; font-size: 14px; margin: 0; white-space: pre-wrap;">${safeMessage}</p>
      </div>
    </div>
  `;

  const result = await sendEmail({
    to: SALES_EMAIL,
    subject: `Contact form: ${safeName} from ${safeCompany}`,
    html,
    replyTo: email,
    tags: [{ name: 'category', value: 'contact-form' }],
  });

  if (!result.success && result.error !== 'Email provider not configured') {
    return NextResponse.json(
      { error: 'Failed to send message. Please try again.' },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
