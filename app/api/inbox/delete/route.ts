import { NextResponse } from 'next/server';
import { deleteInboxItem } from '@/lib/coda-inbox';

export async function POST(request: Request) {
  try {
    const { id } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    }

    await deleteInboxItem(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting inbox item:', error);
    return NextResponse.json(
      { error: 'Failed to delete item' },
      { status: 500 }
    );
  }
}
