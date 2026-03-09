import { NextResponse } from 'next/server';
import { isDemoMode } from '@/lib/demo-mode';
import { getDemoActionPlans } from '@/lib/demo-data';

export async function GET(request: Request) {
  try {
    if (isDemoMode(request)) {
      return NextResponse.json(getDemoActionPlans());
    }
    return NextResponse.json([]);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch action plans' }, { status: 500 });
  }
}
