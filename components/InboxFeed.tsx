'use client';

import { useState } from 'react';
import InboxCard from './InboxCard';
import type { InboxRow } from '@/lib/coda-inbox';
import type { ActionType } from '@/components/ActionButtons';

interface InboxFeedProps {
  initialItems: InboxRow[];
}

export default function InboxFeed({ initialItems }: InboxFeedProps) {
  const [items, setItems] = useState(initialItems);

  const handleAction = async (id: string, action: ActionType) => {
    // Find the item to get its entry content
    const item = items.find((i) => i.id === id);
    if (!item) return;

    // Optimistic update - remove from UI immediately
    setItems((prev) => prev.filter((i) => i.id !== id));

    try {
      const response = await fetch('/api/inbox/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rowId: id,
          action,
          entryContent: item.entry,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Failed to process action:', response.status, errorData);
        // Revert on error
        setItems((prev) => [...prev, item].sort((a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        ));
      }
    } catch (error) {
      // Revert on error
      setItems((prev) => [...prev, item].sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ));
      console.error('Error processing action:', error);
    }
  };

  return (
    <div className="feed">
      {items.map((item) => (
        <InboxCard
          key={item.id}
          id={item.id}
          entry={item.entry}
          recordType={item.recordType}
          title={item.title}
          onAction={handleAction}
        />
      ))}
    </div>
  );
}
