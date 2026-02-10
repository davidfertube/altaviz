import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';

export function handleApiError(error: unknown, context: string): NextResponse {
  const requestId = randomUUID();
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[${requestId}] ${context}: ${message}`);

  return NextResponse.json(
    { error: 'Internal server error', requestId },
    { status: 500 }
  );
}
