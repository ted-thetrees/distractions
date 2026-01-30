import { NextResponse } from 'next/server';
import { fetchInboxItems } from '@/lib/coda-inbox';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const pageToken = searchParams.get('pageToken') || undefined;
    const limit = parseInt(searchParams.get('limit') || '25', 10);

    const result = await fetchInboxItems(limit, pageToken);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Inbox fetch error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch inbox' },
      { status: 500 }
    );
  }
}
