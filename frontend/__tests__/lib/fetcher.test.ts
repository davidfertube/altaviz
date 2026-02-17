/**
 * Tests for fetcher utility and ApiError class.
 */

import { fetcher, ApiError, swrConfig } from '@/lib/fetcher';

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('ApiError', () => {
  it('has correct name and status', () => {
    const err = new ApiError('Not found', 404);
    expect(err.name).toBe('ApiError');
    expect(err.message).toBe('Not found');
    expect(err.status).toBe(404);
    expect(err instanceof Error).toBe(true);
  });
});

describe('fetcher', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('returns parsed JSON on success', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: 'test' }),
    });

    const result = await fetcher('/api/test');
    expect(result).toEqual({ data: 'test' });
    expect(mockFetch).toHaveBeenCalledWith('/api/test');
  });

  it('throws ApiError with body message on failure', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 403,
      statusText: 'Forbidden',
      json: () => Promise.resolve({ error: 'Admin access required' }),
    });

    await expect(fetcher('/api/test')).rejects.toThrow('Admin access required');
    try {
      await fetcher('/api/test');
    } catch (e) {
      expect(e).toBeInstanceOf(ApiError);
      expect((e as ApiError).status).toBe(403);
    }
  });

  it('falls back to statusText when json parsing fails', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      json: () => Promise.reject(new Error('parse error')),
    });

    await expect(fetcher('/api/test')).rejects.toThrow('Internal Server Error');
  });
});

describe('swrConfig.onErrorRetry', () => {
  it('does not retry on 401', () => {
    const revalidate = jest.fn();
    swrConfig.onErrorRetry(
      new ApiError('Unauthorized', 401),
      '/api/test',
      {},
      revalidate,
      { retryCount: 0 }
    );
    expect(revalidate).not.toHaveBeenCalled();
  });

  it('does not retry on 403', () => {
    const revalidate = jest.fn();
    swrConfig.onErrorRetry(
      new ApiError('Forbidden', 403),
      '/api/test',
      {},
      revalidate,
      { retryCount: 0 }
    );
    expect(revalidate).not.toHaveBeenCalled();
  });

  it('does not retry after 3 attempts', () => {
    const revalidate = jest.fn();
    swrConfig.onErrorRetry(
      new Error('Network error'),
      '/api/test',
      {},
      revalidate,
      { retryCount: 3 }
    );
    expect(revalidate).not.toHaveBeenCalled();
  });

  it('schedules retry with exponential backoff for retryable errors', () => {
    jest.useFakeTimers();
    const revalidate = jest.fn();

    swrConfig.onErrorRetry(
      new Error('Network error'),
      '/api/test',
      {},
      revalidate,
      { retryCount: 0 }
    );

    expect(revalidate).not.toHaveBeenCalled();
    jest.advanceTimersByTime(1000);
    expect(revalidate).toHaveBeenCalledWith({ retryCount: 0 });

    jest.useRealTimers();
  });
});
