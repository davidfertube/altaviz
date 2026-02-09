import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  const checks: Record<string, 'ok' | 'error'> = {};

  try {
    await query('SELECT 1');
    checks.database = 'ok';
  } catch {
    checks.database = 'error';
  }

  const allOk = Object.values(checks).every(v => v === 'ok');
  return NextResponse.json(
    { status: allOk ? 'healthy' : 'degraded', checks, timestamp: new Date().toISOString() },
    { status: allOk ? 200 : 503 }
  );
}
