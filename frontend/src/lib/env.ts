const REQUIRED_PRODUCTION_VARS = [
  'AUTH_SECRET',
  'DB_HOST',
  'DB_PASSWORD',
] as const;

export function validateEnvironment(): void {
  if (process.env.NODE_ENV !== 'production') return;

  const missing = REQUIRED_PRODUCTION_VARS.filter(
    (key) => !process.env[key]
  );

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables in production: ${missing.join(', ')}`
    );
  }
}
