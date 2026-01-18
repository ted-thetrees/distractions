'use client';

import { useEffect, useRef, useState } from 'react';
import { detectVideo, getYouTubeId, getVimeoId } from '@/lib/unfurl';

interface CardProps {
  name: string;
  link: string;
  image?: string;
}

export default function Card({ name, link, image }: CardProps) {
  const video = detectVideo(link);
  const [ogImage, setOgImage] = useState<string | undefined>(undefined);
  const [fetchedTitle, setFetchedTitle] = useState<string | null>(null);
  const [fetched, setFetched] = useState(false);
  const cardRef = useRef<HTMLElement>(null);

  const needsOgFetch = !video && !image;
  const needsVideoTitle = video && !name;
  const displayTitle = decodeHtmlEntities(name || fetchedTitle || extractTitleFromUrl(link));
  const displayImage = image || ogImage;
  const isLoading = (needsOgFetch || needsVideoTitle) && !fetched;

  useEffect(() => {
    if (fetched) return;
    if (!needsOgFetch && !needsVideoTitle) {
      setFetched(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          observer.disconnect();
          
          if (needsVideoTitle) {
            // Fetch video title from oEmbed
            const youtubeId = getYouTubeId(link);
            const vimeoId = getVimeoId(link);
            
            let apiUrl: string;
            if (youtubeId) {
              apiUrl = `/api/video-title?type=youtube&url=${encodeURIComponent(`https://www.youtube.com/watch?v=${youtubeId}`)}`;
            } else if (vimeoId) {
              apiUrl = `/api/video-title?type=vimeo&url=${encodeURIComponent(`https://vimeo.com/${vimeoId}`)}`;
            } else {
              setFetched(true);
              return;
            }
            
            fetch(apiUrl)
              .then((res) => res.json())
              .then((data) => {
                if (data.title) setFetchedTitle(data.title);
              })
              .catch(() => {})
              .finally(() => setFetched(true));
          } else if (needsOgFetch) {
            // Fetch OG data
            fetch(`/api/og?url=${encodeURIComponent(link)}`)
              .then((res) => res.json())
              .then((data) => {
                if (data.image) setOgImage(data.image);
                if (data.title && !name) setFetchedTitle(data.title);
              })
              .catch(() => {})
              .finally(() => setFetched(true));
          }
        }
      },
      { rootMargin: '200px' }
    );

    if (cardRef.current) {
      observer.observe(cardRef.current);
    }

    return () => observer.disconnect();
  }, [needsOgFetch, needsVideoTitle, fetched, link, name]);

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
        ) : isLoading ? (
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

// Decode common HTML entities
function decodeHtmlEntities(text: string): string {
  const entities: Record<string, string> = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&apos;': "'",
    '&nbsp;': ' ',
    '&#x27;': "'",
    '&#x2F;': '/',
    '&ndash;': '–',
    '&mdash;': '—',
  };
  
  return text.replace(/&[#\w]+;/g, (entity) => entities[entity] || entity);
}

function extractTitleFromUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const domain = parsed.hostname.replace(/^www\./, '');
    const path = parsed.pathname.replace(/\/$/, '');

    // For YouTube, just use "YouTube" as fallback
    if (domain.includes('youtube.com') || domain.includes('youtu.be')) {
      return 'YouTube';
    }

    // For Vimeo, just use "Vimeo" as fallback
    if (domain.includes('vimeo.com')) {
      return 'Vimeo';
    }

    if (path && path !== '/') {
      const segments = path.split('/').filter(Boolean);
      const lastSegment = segments[segments.length - 1];
      
      // If the segment is mostly numbers (like Instagram post IDs), use domain instead
      if (/^\d+$/.test(lastSegment) || lastSegment.length > 15 && /^[a-zA-Z0-9_-]+$/.test(lastSegment)) {
        // Capitalize first letter of domain
        return domain.charAt(0).toUpperCase() + domain.slice(1);
      }
      
      const cleaned = lastSegment
        .replace(/\.[^.]+$/, '')
        .replace(/[-_]/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());
      return cleaned || domain;
    }
    
    // Capitalize first letter of domain
    return domain.charAt(0).toUpperCase() + domain.slice(1);
  } catch {
    return url;
  }
}
