import { NextResponse } from 'next/server';
import { isDemoMode } from '@/lib/demo-mode';
import { getDemoActionPlan } from '@/lib/demo-data';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ compressorId: string }> },
) {
  try {
    const { compressorId } = await params;

    if (isDemoMode(request)) {
      const plan = getDemoActionPlan(compressorId);
      if (!plan) {
        return NextResponse.json({ error: 'No action plan found' }, { status: 404 });
      }
      return NextResponse.json(plan);
    }

    return NextResponse.json({ error: 'No action plan found' }, { status: 404 });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch action plan' }, { status: 500 });
  }
}
