/**
 * Tests for telemetry utility.
 */

describe('telemetry', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('initTelemetry', () => {
    it('does nothing when APPLICATIONINSIGHTS_CONNECTION_STRING is not set', () => {
      delete process.env.APPLICATIONINSIGHTS_CONNECTION_STRING;
      const { initTelemetry } = require('@/lib/telemetry');
      // Should not throw
      expect(() => initTelemetry()).not.toThrow();
    });

    it('silently fails when applicationinsights package is not installed', () => {
      process.env.APPLICATIONINSIGHTS_CONNECTION_STRING = 'InstrumentationKey=test';
      const { initTelemetry } = require('@/lib/telemetry');
      // Should not throw even if require('applicationinsights') fails
      expect(() => initTelemetry()).not.toThrow();
    });
  });

  describe('trackEvent', () => {
    it('does nothing when connection string is not set', () => {
      delete process.env.APPLICATIONINSIGHTS_CONNECTION_STRING;
      const { trackEvent } = require('@/lib/telemetry');
      expect(() => trackEvent('test.event', { key: 'value' })).not.toThrow();
    });

    it('silently fails when package is not available', () => {
      process.env.APPLICATIONINSIGHTS_CONNECTION_STRING = 'InstrumentationKey=test';
      const { trackEvent } = require('@/lib/telemetry');
      expect(() => trackEvent('test.event')).not.toThrow();
    });
  });

  describe('trackMetric', () => {
    it('does nothing when connection string is not set', () => {
      delete process.env.APPLICATIONINSIGHTS_CONNECTION_STRING;
      const { trackMetric } = require('@/lib/telemetry');
      expect(() => trackMetric('test.metric', 42)).not.toThrow();
    });

    it('silently fails when package is not available', () => {
      process.env.APPLICATIONINSIGHTS_CONNECTION_STRING = 'InstrumentationKey=test';
      const { trackMetric } = require('@/lib/telemetry');
      expect(() => trackMetric('test.metric', 42)).not.toThrow();
    });
  });
});
