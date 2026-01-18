'use client';

import { useEffect, useRef, useState } from 'react';
import { detectVideo } from '@/lib/unfurl';

interface CardProps {
  name: string;
  link: string;
  image?: string;
}

export default function Card({ name, link, image }: CardProps) {
  const video = detectVideo(link);
  const [ogImage, setOgImage] = useState<string | null>(null);
  const [ogTitle, setOgTitle] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const cardRef = useRef<HTMLElement>(null);

  const needsOgFetch = !video && !image;
  const displayTitle = name || ogTitle || extractTitleFromUrl(link);
  const displayImage = image || ogImage;

  useEffect(() => {
    if (!needsOgFetch || loading || ogImage !== null) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setLoading(true);
          fetch(`/api/og?url=${encodeURIComponent(link)}`)
            .then((res) => res.json())
            .then((data) => {
              if (data.image) setOgImage(data.image);
              if (data.title && !name) setOgTitle(data.title);
            })
            .catch(() => {})
            .finally(() => setLoading(false));
          observer.disconnect();
        }
      },
      { rootMargin: '200px' }
    );

    if (cardRef.current) {
      observer.observe(cardRef.current);
    }

    return () => observer.disconnect();
  }, [needsOgFetch, loading, ogImage, link, name]);

  return (
    <article className="card" ref={cardRef}>
      <div className="card-media">
        {video ? (
          <iframe
            src={video.embedUrl}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            loading="lazy"
          />
        ) : displayImage ? (
          <img src={displayImage} alt={displayTitle} loading="lazy" />
        ) : loading ? (
          <div className="placeholder">Loading...</div>
        ) : (
          <div className="placeholder">No preview</div>
        )}
      </div>
      <div className="card-body">
        <h2 className="card-title">
          <a href={link} target="_blank" rel="noopener noreferrer">
            {displayTitle}
          </a>
        </h2>
      </div>
    </article>
  );
}

function extractTitleFromUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const domain = parsed.hostname.replace(/^www\./, '');
    const path = parsed.pathname.replace(/\/$/, '');

    if (path && path !== '/') {
      const segments = path.split('/').filter(Boolean);
      const lastSegment = segments[segments.length - 1];
      const cleaned = lastSegment
        .replace(/\.[^.]+$/, '')
        .replace(/[-_]/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());
      return cleaned || domain;
    }
    return domain;
  } catch {
    return url;
  }
}
