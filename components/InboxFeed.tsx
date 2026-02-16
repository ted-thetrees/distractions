'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import InboxCard from './InboxCard';
import type { InboxRow } from '@/lib/coda-inbox';
import type { ActionType } from '@/components/ActionButtons';

interface InboxFeedProps {
  initialItems: InboxRow[];
  initialNextPageToken: string | null;
}

export default function InboxFeed({ initialItems, initialNextPageToken }: InboxFeedProps) {
  const [items, setItems] = useState(initialItems);
  const [nextPageToken, setNextPageToken] = useState<string | null>(initialNextPageToken);
  const [isLoading, setIsLoading] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const loadMore = useCallback(async () => {
    if (isLoading || !nextPageToken) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/inbox?pageToken=${encodeURIComponent(nextPageToken)}&limit=25`);
      if (response.ok) {
        const data = await response.json();
        setItems(prev => [...prev, ...data.items]);
        setNextPageToken(data.nextPageToken);
      }
    } catch (error) {
      console.error('Failed to load more items:', error);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, nextPageToken]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && nextPageToken && !isLoading) {
          loadMore();
        }
      },
      { rootMargin: '200px' }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore, nextPageToken, isLoading]);

  const handleAction = async (id: string, action: ActionType) => {
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
        // Revert on error
        setItems((prev) => [...prev, item].sort((a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        ));
      }
    } catch {
      // Revert on error
      setItems((prev) => [...prev, item].sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ));
    }
  };

  return (
    <div className="feed">
      {items.map((item) => (
        <InboxCard
          key={item.id}
          id={item.id}
          entry={item.entry}
          title={item.title}
          onAction={handleAction}
        />
      ))}
      <div ref={sentinelRef} style={{ height: '1px' }} />
      {isLoading && (
        <div className="loading" style={{ padding: '1rem', textAlign: 'center' }}>
          Loading more...
        </div>
      )}
      {!nextPageToken && items.length > 0 && (
        <div style={{ padding: '1rem', textAlign: 'center', color: '#666' }}>
          End of videos
        </div>
      )}
    </div>
  );
}
