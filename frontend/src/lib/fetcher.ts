export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export async function fetcher<T = unknown>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new ApiError(body.error || res.statusText, res.status);
  }
  return res.json();
}

export const swrConfig = {
  onErrorRetry: (
    error: Error,
    _key: string,
    _config: unknown,
    revalidate: (opts: { retryCount: number }) => void,
    { retryCount }: { retryCount: number }
  ) => {
    // Don't retry on auth errors
    if (error instanceof ApiError && (error.status === 401 || error.status === 403)) return;
    // Max 3 retries
    if (retryCount >= 3) return;
    // Exponential backoff
    setTimeout(() => revalidate({ retryCount }), 2 ** retryCount * 1000);
  },
};
