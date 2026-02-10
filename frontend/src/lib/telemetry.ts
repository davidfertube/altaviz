/**
 * Application Insights telemetry for server-side tracking.
 * Only initializes when APPLICATIONINSIGHTS_CONNECTION_STRING is set.
 */

let initialized = false;

export function initTelemetry() {
  if (initialized || !process.env.APPLICATIONINSIGHTS_CONNECTION_STRING) return;

  try {
    // Dynamic import to avoid bundling in client
    const appInsights = require('applicationinsights');
    appInsights
      .setup(process.env.APPLICATIONINSIGHTS_CONNECTION_STRING)
      .setAutoCollectRequests(true)
      .setAutoCollectPerformance(true)
      .setAutoCollectExceptions(true)
      .setAutoCollectDependencies(true)
      .start();
    initialized = true;
    console.log('Application Insights initialized');
  } catch {
    // applicationinsights package not installed — skip silently
  }
}

export function trackEvent(name: string, properties?: Record<string, string>) {
  if (!process.env.APPLICATIONINSIGHTS_CONNECTION_STRING) return;

  try {
    const appInsights = require('applicationinsights');
    const client = appInsights.defaultClient;
    if (client) {
      client.trackEvent({ name, properties });
    }
  } catch {
    // skip if not available
  }
}

export function trackMetric(name: string, value: number) {
  if (!process.env.APPLICATIONINSIGHTS_CONNECTION_STRING) return;

  try {
    const appInsights = require('applicationinsights');
    const client = appInsights.defaultClient;
    if (client) {
      client.trackMetric({ name, value });
    }
  } catch {
    // skip if not available
  }
}
