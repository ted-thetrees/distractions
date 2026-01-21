import { NextRequest, NextResponse } from 'next/server';
import { archiveDistraction } from '@/lib/baserow';

export async function POST(request: NextRequest) {
  try {
    const { id } = await request.json();

    if (!id || typeof id !== 'number') {
      return NextResponse.json({ error: 'Invalid row ID' }, { status: 400 });
    }

    await archiveDistraction(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error archiving distraction:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to archive' },
      { status: 500 }
    );
  }
}
