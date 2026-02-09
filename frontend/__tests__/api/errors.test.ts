import { handleApiError } from '@/lib/errors';

describe('handleApiError', () => {
  const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

  afterEach(() => {
    consoleSpy.mockClear();
  });

  it('returns 500 status', async () => {
    const response = handleApiError(new Error('test'), 'context');
    expect(response.status).toBe(500);
  });

  it('returns sanitized error message', async () => {
    const response = handleApiError(new Error('DB connection failed: password auth'), 'context');
    const body = await response.json();
    expect(body.error).toBe('Internal server error');
    expect(body).not.toHaveProperty('stack');
    expect(body.requestId).toBeDefined();
  });

  it('generates a unique requestId', async () => {
    const r1 = handleApiError(new Error('err1'), 'ctx');
    const r2 = handleApiError(new Error('err2'), 'ctx');
    const b1 = await r1.json();
    const b2 = await r2.json();
    expect(b1.requestId).not.toBe(b2.requestId);
  });

  it('logs error with context', () => {
    handleApiError(new Error('bad query'), 'Fleet fetch');
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Fleet fetch: bad query'));
  });

  it('handles non-Error objects', async () => {
    const response = handleApiError('string error', 'context');
    const body = await response.json();
    expect(body.error).toBe('Internal server error');
  });
});
