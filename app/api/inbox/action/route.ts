import { NextResponse } from 'next/server';
import { processInboxAction, type ActionType } from '@/lib/coda-inbox';

export const dynamic = 'force-dynamic';

const validActions: ActionType[] = ['DI', 'TA', 'IA', 'PR', 'MI', 'TS', 'TB', 'DV', 'DL'];

export async function POST(request: Request) {
  try {
    const { rowId, action, entryContent } = await request.json();

    if (!rowId || typeof rowId !== 'string') {
      return NextResponse.json({ error: 'rowId is required' }, { status: 400 });
    }

    if (!action || !validActions.includes(action)) {
      return NextResponse.json({ error: 'Invalid action type' }, { status: 400 });
    }

    if (!entryContent || typeof entryContent !== 'string') {
      return NextResponse.json({ error: 'entryContent is required' }, { status: 400 });
    }

    await processInboxAction(rowId, action, entryContent);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Action error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process action' },
      { status: 500 }
    );
  }
}
