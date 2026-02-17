/**
 * Tests for environment validation utility.
 */

describe('validateEnvironment', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('does nothing in non-production environment', () => {
    process.env.NODE_ENV = 'development';
    const { validateEnvironment } = require('@/lib/env');
    expect(() => validateEnvironment()).not.toThrow();
  });

  it('throws when required vars are missing in production', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.AUTH_SECRET;
    delete process.env.DATABASE_URL;

    const { validateEnvironment } = require('@/lib/env');
    expect(() => validateEnvironment()).toThrow('Missing required environment variables');
  });

  it('throws when DEV_CREDENTIALS_ENABLED is true in production', () => {
    process.env.NODE_ENV = 'production';
    process.env.AUTH_SECRET = 'secret';
    process.env.DATABASE_URL = 'postgresql://...';
    process.env.DEV_CREDENTIALS_ENABLED = 'true';

    const { validateEnvironment } = require('@/lib/env');
    expect(() => validateEnvironment()).toThrow('DEV_CREDENTIALS_ENABLED must not be set to true');
  });

  it('throws when STRIPE_SECRET_KEY set without STRIPE_WEBHOOK_SECRET in production', () => {
    process.env.NODE_ENV = 'production';
    process.env.AUTH_SECRET = 'secret';
    process.env.DATABASE_URL = 'postgresql://...';
    process.env.STRIPE_SECRET_KEY = 'sk_test_123';
    delete process.env.STRIPE_WEBHOOK_SECRET;

    const { validateEnvironment } = require('@/lib/env');
    expect(() => validateEnvironment()).toThrow('STRIPE_WEBHOOK_SECRET is required');
  });

  it('passes when all production vars are set correctly', () => {
    process.env.NODE_ENV = 'production';
    process.env.AUTH_SECRET = 'secret';
    process.env.DATABASE_URL = 'postgresql://...';

    const { validateEnvironment } = require('@/lib/env');
    expect(() => validateEnvironment()).not.toThrow();
  });

  it('passes with Stripe fully configured in production', () => {
    process.env.NODE_ENV = 'production';
    process.env.AUTH_SECRET = 'secret';
    process.env.DATABASE_URL = 'postgresql://...';
    process.env.STRIPE_SECRET_KEY = 'sk_test_123';
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_123';

    const { validateEnvironment } = require('@/lib/env');
    expect(() => validateEnvironment()).not.toThrow();
  });
});
