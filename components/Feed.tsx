'use client';

import { useState } from 'react';
import Card from './Card';
import type { DistractionRow } from '@/lib/baserow';

interface FeedProps {
  initialItems: DistractionRow[];
}

export default function Feed({ initialItems }: FeedProps) {
  const [items, setItems] = useState(initialItems);

  const handleHide = async (id: number) => {
    // Optimistic update - remove from UI immediately
    setItems((prev) => prev.filter((item) => item.id !== id));

    try {
      const response = await fetch('/api/hide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });

      if (!response.ok) {
        // If API fails, restore the item (would need to track removed items for this)
        // For now, just log the error - the page refresh will show the item again anyway
        console.error('Failed to hide item');
      }
    } catch (error) {
      console.error('Error hiding item:', error);
    }
  };

  return (
    <div className="feed">
      {items.map((item) => (
        <Card
          key={item.id}
          id={item.id}
          entry={item.entry}
          type={item.type}
          onHide={handleHide}
        />
      ))}
    </div>
  );
}
