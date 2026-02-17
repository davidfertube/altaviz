/**
 * Tests for email sending utility.
 */

const mockFetch = jest.fn();
global.fetch = mockFetch;

jest.mock('../../src/lib/email-templates', () => ({
  welcomeEmailTemplate: jest.fn().mockReturnValue('<html>Welcome</html>'),
  criticalAlertEmailTemplate: jest.fn().mockReturnValue('<html>Alert</html>'),
  teamInviteEmailTemplate: jest.fn().mockReturnValue('<html>Invite</html>'),
}));

describe('sendEmail', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    mockFetch.mockReset();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('returns error when RESEND_API_KEY is not set', async () => {
    delete process.env.RESEND_API_KEY;
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

    const { sendEmail } = require('../../src/lib/email');
    const result = await sendEmail({
      to: 'test@example.com',
      subject: 'Test',
      html: '<p>Test</p>',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Email provider not configured');
    expect(mockFetch).not.toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it('sends email successfully via Resend API', async () => {
    process.env.RESEND_API_KEY = 'test-key';
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: 'email-123' }),
    });

    const { sendEmail } = require('../../src/lib/email');
    const result = await sendEmail({
      to: 'test@example.com',
      subject: 'Test Subject',
      html: '<p>Hello</p>',
      text: 'Hello',
      replyTo: 'reply@test.com',
      tags: [{ name: 'category', value: 'test' }],
    });

    expect(result.success).toBe(true);
    expect(result.id).toBe('email-123');
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.resend.com/emails',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Authorization': 'Bearer test-key',
        }),
      })
    );
  });

  it('handles Resend API error response', async () => {
    process.env.RESEND_API_KEY = 'test-key';
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    mockFetch.mockResolvedValue({
      ok: false,
      status: 422,
      text: () => Promise.resolve('Invalid request'),
    });

    const { sendEmail } = require('../../src/lib/email');
    const result = await sendEmail({
      to: 'test@example.com',
      subject: 'Test',
      html: '<p>Test</p>',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Resend API error: 422');

    consoleSpy.mockRestore();
  });

  it('handles network/fetch error', async () => {
    process.env.RESEND_API_KEY = 'test-key';
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    mockFetch.mockRejectedValue(new Error('Network failure'));

    const { sendEmail } = require('../../src/lib/email');
    const result = await sendEmail({
      to: 'test@example.com',
      subject: 'Test',
      html: '<p>Test</p>',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Network failure');

    consoleSpy.mockRestore();
  });

  it('converts single email to array', async () => {
    process.env.RESEND_API_KEY = 'test-key';
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: 'email-456' }),
    });

    const { sendEmail } = require('../../src/lib/email');
    await sendEmail({
      to: 'single@example.com',
      subject: 'Test',
      html: '<p>Test</p>',
    });

    const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(callBody.to).toEqual(['single@example.com']);
  });
});

describe('sendWelcomeEmail', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    mockFetch.mockReset();
    process.env = { ...originalEnv, RESEND_API_KEY: 'test-key' };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('sends welcome email with correct subject and tags', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: 'welcome-1' }),
    });

    const { sendWelcomeEmail } = require('../../src/lib/email');
    const result = await sendWelcomeEmail({
      to: 'new@example.com',
      userName: 'John',
      organizationName: 'Acme',
      dashboardUrl: 'https://app.altaviz.com/dashboard',
    });

    expect(result.success).toBe(true);
    const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(callBody.subject).toContain('Welcome to Altaviz');
    expect(callBody.tags).toEqual([{ name: 'category', value: 'welcome' }]);
  });
});

describe('sendCriticalAlertEmail', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    mockFetch.mockReset();
    process.env = { ...originalEnv, RESEND_API_KEY: 'test-key' };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('sends critical alert email with CRITICAL label', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: 'alert-1' }),
    });

    const { sendCriticalAlertEmail } = require('../../src/lib/email');
    const result = await sendCriticalAlertEmail({
      to: ['ops@example.com'],
      alertId: 42,
      segment: 'PL-003',
      severity: 'critical' as const,
      description: 'High vibration detected',
      timestamp: '2026-02-16T10:00:00Z',
      alertUrl: 'https://app.altaviz.com/dashboard/alerts/42',
    });

    expect(result.success).toBe(true);
    const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(callBody.subject).toContain('[CRITICAL]');
    expect(callBody.subject).toContain('PL-003');
  });

  it('sends warning alert email with WARNING label', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: 'alert-2' }),
    });

    const { sendCriticalAlertEmail } = require('../../src/lib/email');
    const result = await sendCriticalAlertEmail({
      to: 'ops@example.com',
      alertId: 43,
      segment: 'PL-007',
      severity: 'warning' as const,
      description: 'Temperature drift',
      timestamp: '2026-02-16T11:00:00Z',
      alertUrl: 'https://app.altaviz.com/dashboard/alerts/43',
    });

    expect(result.success).toBe(true);
    const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(callBody.subject).toContain('[WARNING]');
  });
});

describe('sendTeamInviteEmail', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    mockFetch.mockReset();
    process.env = { ...originalEnv, RESEND_API_KEY: 'test-key' };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('sends invite email with correct subject', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: 'invite-1' }),
    });

    const { sendTeamInviteEmail } = require('../../src/lib/email');
    const result = await sendTeamInviteEmail({
      to: 'invited@example.com',
      organizationName: 'Acme Corp',
      inviterName: 'Admin User',
      role: 'operator',
      acceptUrl: 'https://app.altaviz.com/accept',
    });

    expect(result.success).toBe(true);
    const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(callBody.subject).toContain('Acme Corp');
    expect(callBody.tags).toEqual([{ name: 'category', value: 'invite' }]);
  });
});
