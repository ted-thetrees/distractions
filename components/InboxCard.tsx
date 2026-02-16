'use client';

import { useEffect, useRef, useState } from 'react';
import { getYouTubeId } from '@/lib/unfurl';
import ActionButtons, { type ActionType } from '@/components/ActionButtons';

interface InboxCardProps {
  id: string;
  entry: string;
  title: string | null;
  onAction: (id: string, action: ActionType) => Promise<void>;
}

export default function InboxCard({ id, entry, title, onAction }: InboxCardProps) {
  const [fetchedTitle, setFetchedTitle] = useState<string | null>(null);
  const [fetched, setFetched] = useState(false);
  const cardRef = useRef<HTMLElement>(null);

  const youtubeId = getYouTubeId(entry);
  const thumbnailUrl = youtubeId
    ? `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`
    : null;
  const videoUrl = youtubeId
    ? `https://www.youtube.com/watch?v=${youtubeId}`
    : entry;

  const displayTitle = title || fetchedTitle || 'YouTube Video';

  // Lazy-load video title when card scrolls into view
  useEffect(() => {
    if (fetched || title || !youtubeId) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          observer.disconnect();

          const apiUrl = `/api/video-title?type=youtube&url=${encodeURIComponent(`https://www.youtube.com/watch?v=${youtubeId}`)}`;

          fetch(apiUrl)
            .then((res) => res.json())
            .then((data) => {
              if (data.title) setFetchedTitle(data.title);
            })
            .catch(() => {})
            .finally(() => setFetched(true));
        }
      },
      { rootMargin: '200px' }
    );

    if (cardRef.current) {
      observer.observe(cardRef.current);
    }

    return () => observer.disconnect();
  }, [fetched, title, youtubeId]);

  return (
    <article className="card" ref={cardRef}>
      <a href={videoUrl} className="card-link">
        {thumbnailUrl && (
          <div className="card-media">
            <img src={thumbnailUrl} alt={displayTitle} loading="lazy" />
          </div>
        )}
        <div className="card-body">
          <h2 className="card-title">{displayTitle}</h2>
        </div>
      </a>
      <ActionButtons rowId={id} onAction={onAction} />
    </article>
  );
}
