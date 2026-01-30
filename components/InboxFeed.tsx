'use client';

import { useState } from 'react';
import InboxCard from './InboxCard';
import type { InboxRow } from '@/lib/coda-inbox';

interface InboxFeedProps {
  initialItems: InboxRow[];
}

export default function InboxFeed({ initialItems }: InboxFeedProps) {
  const [items, setItems] = useState(initialItems);

  const handleDelete = async (id: string) => {
    // Optimistic update - remove from UI immediately
    setItems((prev) => prev.filter((item) => item.id !== id));

    try {
      const response = await fetch('/api/inbox/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });

      if (!response.ok) {
        console.error('Failed to delete item');
      }
    } catch (error) {
      console.error('Error deleting item:', error);
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
          onDelete={handleDelete}
        />
      ))}
    </div>
  );
}
