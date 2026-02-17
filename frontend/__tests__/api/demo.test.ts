/**
 * Tests for demo API routes (no auth required).
 */

import { NextRequest } from 'next/server';

jest.mock('../../src/lib/demo-data', () => ({
  DEMO_FLEET: [
    { compressor_id: 'PL-001', health_status: 'healthy' },
    { compressor_id: 'PL-002', health_status: 'warning' },
  ],
  DEMO_ALERTS: [
    { id: 1, severity: 'critical', compressor_id: 'PL-003' },
  ],
  DEMO_EMISSIONS: [
    { compressor_id: 'PL-001', co2e_tonnes: 0.5 },
    { compressor_id: 'PL-002', co2e_tonnes: 0.3 },
  ],
  DEMO_READINGS: {
    'PL-001': [{ timestamp: '2026-02-16T00:00:00Z', avg_temperature: 185 }],
  },
}));

describe('GET /api/demo/fleet', () => {
  it('returns demo fleet data', async () => {
    const { GET } = require('../../src/app/api/demo/fleet/route');
    const response = await GET();
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body).toHaveLength(2);
    expect(body[0].compressor_id).toBe('PL-001');
  });
});

describe('GET /api/demo/alerts', () => {
  it('returns demo alerts data', async () => {
    const { GET } = require('../../src/app/api/demo/alerts/route');
    const response = await GET();
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body).toHaveLength(1);
    expect(body[0].severity).toBe('critical');
  });
});

describe('GET /api/demo/emissions', () => {
  it('returns emissions estimates with fleet summary', async () => {
    const { GET } = require('../../src/app/api/demo/emissions/route');
    const response = await GET();
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.estimates).toHaveLength(2);
    expect(body.fleet_summary).toBeDefined();
    expect(body.fleet_summary.total_pipelines).toBe(2);
    expect(body.fleet_summary.total_co2e_tonnes_hr).toBeCloseTo(0.8, 1);
    expect(body.fleet_summary.reporting_threshold).toBe(25000);
  });
});

describe('GET /api/demo/readings/[compressorId]', () => {
  const makeParams = (compressorId: string) => Promise.resolve({ compressorId });

  it('returns readings for known compressor', async () => {
    const { GET } = require('../../src/app/api/demo/readings/[compressorId]/route');
    const request = new NextRequest('http://localhost:3000/api/demo/readings/PL-001');
    const response = await GET(request, { params: makeParams('PL-001') });
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body).toHaveLength(1);
    expect(body[0].avg_temperature).toBe(185);
  });

  it('returns 404 for unknown compressor', async () => {
    const { GET } = require('../../src/app/api/demo/readings/[compressorId]/route');
    const request = new NextRequest('http://localhost:3000/api/demo/readings/UNKNOWN');
    const response = await GET(request, { params: makeParams('UNKNOWN') });
    expect(response.status).toBe(404);
  });
});
