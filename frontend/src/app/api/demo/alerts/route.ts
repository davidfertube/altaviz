import { NextResponse } from 'next/server';
import { DEMO_ALERTS } from '@/lib/demo-data';

export async function GET() {
  return NextResponse.json(DEMO_ALERTS);
}
