const REQUIRED_PRODUCTION_VARS = [
  'AUTH_SECRET',
  'DATABASE_URL',
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

  // Block dev credentials in production
  if (process.env.DEV_CREDENTIALS_ENABLED === 'true') {
    throw new Error(
      'DEV_CREDENTIALS_ENABLED must not be set to true in production'
    );
  }

  // Stripe webhook secret must be set if Stripe is configured
  if (process.env.STRIPE_SECRET_KEY && !process.env.STRIPE_WEBHOOK_SECRET) {
    throw new Error(
      'STRIPE_WEBHOOK_SECRET is required when STRIPE_SECRET_KEY is set'
    );
  }

}
