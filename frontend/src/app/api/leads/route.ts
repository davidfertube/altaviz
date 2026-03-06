import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, company } = body;

    if (!name || !email || !company) {
      return NextResponse.json({ error: 'Name, email, and company are required' }, { status: 400 });
    }

    // Log for Vercel function logs / server logs
    console.log('[LEAD]', JSON.stringify({ name, email, company, timestamp: new Date().toISOString() }));

    // If DATABASE_URL is available, persist to DB
    if (process.env.DATABASE_URL) {
      try {
        const { query } = await import('@/lib/db');
        await query(
          'INSERT INTO leads (name, email, company) VALUES ($1, $2, $3) ON CONFLICT (email) DO UPDATE SET name = $1, company = $3',
          [name, email, company]
        );
      } catch {
        // DB insert failed — lead already logged to console
      }
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
