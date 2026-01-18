'use client';

import { useEffect, useRef, useState } from 'react';
import { detectVideo, getYouTubeId, getVimeoId } from '@/lib/unfurl';

interface CardProps {
  name: string;
  link: string;
  image?: string;
}

type ContentType = 'x-profile' | 'x-post' | 'youtube' | 'vimeo' | 'apple-music-album' | 'apple-music-track' | 'website';

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
  const contentType = getContentType(link);

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
      <a href={link} target="_blank" rel="noopener noreferrer" className="card-link">
        <div className={`card-media${video ? ' has-video' : ''}`}>
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
          <div className="card-meta">
            <ContentTypeIcon type={contentType} />
            <span>{getContentTypeLabel(contentType)}</span>
          </div>
          <h2 className="card-title">{displayTitle}</h2>
        </div>
      </a>
    </article>
  );
}

function getContentType(url: string): ContentType {
  try {
    const parsed = new URL(url);
    const domain = parsed.hostname.replace(/^www\./, '');
    const path = parsed.pathname;

    // X/Twitter
    if (domain === 'x.com' || domain === 'twitter.com') {
      if (path.includes('/status/')) {
        return 'x-post';
      }
      return 'x-profile';
    }

    // YouTube
    if (domain.includes('youtube.com') || domain === 'youtu.be') {
      return 'youtube';
    }

    // Vimeo
    if (domain.includes('vimeo.com')) {
      return 'vimeo';
    }

    // Apple Music
    if (domain === 'music.apple.com') {
      // Track URLs have ?i= parameter or /song/ in path
      if (parsed.searchParams.has('i') || path.includes('/song/')) {
        return 'apple-music-track';
      }
      // Album URLs have /album/ in path
      if (path.includes('/album/')) {
        return 'apple-music-album';
      }
    }

    return 'website';
  } catch {
    return 'website';
  }
}

function getContentTypeLabel(type: ContentType): string {
  switch (type) {
    case 'x-profile': return 'Profile';
    case 'x-post': return 'Post';
    case 'youtube': return 'YouTube';
    case 'vimeo': return 'Vimeo';
    case 'apple-music-album': return 'Album';
    case 'apple-music-track': return 'Track';
    case 'website': return 'Website';
  }
}

function ContentTypeIcon({ type }: { type: ContentType }) {
  const iconProps = {
    width: 11,
    height: 11,
    viewBox: '0 0 24 24',
    fill: 'currentColor',
    'aria-hidden': true as const,
  };

  switch (type) {
    case 'x-profile':
    case 'x-post':
      return (
        <svg {...iconProps}>
          <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z" />
        </svg>
      );
    case 'youtube':
      return (
        <svg {...iconProps}>
          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
        </svg>
      );
    case 'vimeo':
      return (
        <svg {...iconProps}>
          <path d="M23.977 6.416c-.105 2.338-1.739 5.543-4.894 9.609-3.268 4.247-6.026 6.37-8.29 6.37-1.409 0-2.578-1.294-3.553-3.881L5.322 11.4C4.603 8.816 3.834 7.522 3.01 7.522c-.179 0-.806.378-1.881 1.132L0 7.197a315.065 315.065 0 0 0 3.501-3.128C5.08 2.701 6.266 1.984 7.055 1.91c1.867-.18 3.016 1.1 3.447 3.838.465 2.953.789 4.789.971 5.507.539 2.45 1.131 3.674 1.776 3.674.502 0 1.256-.796 2.265-2.385 1.004-1.589 1.54-2.797 1.612-3.628.144-1.371-.395-2.061-1.614-2.061-.574 0-1.167.121-1.777.391 1.186-3.868 3.434-5.757 6.762-5.637 2.473.06 3.628 1.664 3.493 4.797l-.013.01z" />
        </svg>
      );
    case 'apple-music-album':
    case 'apple-music-track':
      // Official Apple Music icon from Simple Icons
      return (
        <svg {...iconProps}>
          <path d="M23.994 6.124a9.23 9.23 0 0 0-.24-2.19c-.317-1.31-1.062-2.31-2.18-3.043a5.022 5.022 0 0 0-1.877-.726 10.496 10.496 0 0 0-1.564-.15c-.04-.003-.083-.01-.124-.013H5.99c-.042.003-.083.01-.124.013-.492.022-.978.072-1.454.178-.824.182-1.556.548-2.178 1.078-.81.691-1.336 1.566-1.625 2.586-.193.68-.282 1.376-.316 2.08-.001.037-.007.074-.009.111V18.12c.002.043.008.083.01.124.018.465.06.925.148 1.38.227.792.61 1.506 1.1 2.113.7.803 1.568 1.33 2.593 1.59.679.177 1.375.255 2.08.282.047.002.091.008.135.01h12.05c.037-.003.074-.008.11-.01.494-.02.984-.065 1.468-.16.786-.167 1.49-.49 2.106-.977.816-.64 1.386-1.465 1.706-2.448.19-.588.289-1.192.33-1.807.034-.502.03-1.003.03-1.505V6.12l-.001.003zM9.749 15.584V8.09l7.713-1.57v7.475c0 .378-.072.744-.216 1.09a2.603 2.603 0 0 1-.61.9 2.84 2.84 0 0 1-.925.605c-.353.143-.73.213-1.13.213-.401 0-.779-.07-1.13-.213a2.84 2.84 0 0 1-.926-.605 2.603 2.603 0 0 1-.61-.9 2.798 2.798 0 0 1-.216-1.09c0-.378.072-.744.216-1.09.144-.345.35-.651.61-.9a2.84 2.84 0 0 1 .926-.605c.351-.143.729-.213 1.13-.213.261 0 .515.035.76.103V9.396l-5.492 1.12v5.897c0 .378-.072.744-.216 1.09a2.603 2.603 0 0 1-.61.9 2.84 2.84 0 0 1-.925.605c-.353.143-.73.213-1.13.213-.401 0-.779-.07-1.13-.213a2.84 2.84 0 0 1-.926-.605 2.603 2.603 0 0 1-.61-.9 2.798 2.798 0 0 1-.216-1.09c0-.378.072-.744.216-1.09.144-.345.35-.651.61-.9a2.84 2.84 0 0 1 .926-.605c.351-.143.729-.213 1.13-.213.261 0 .515.035.76.103z" />
        </svg>
      );
    case 'website':
    default:
      return (
        <svg {...iconProps} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
          <path d="M2 12h20" />
        </svg>
      );
  }
}

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

    if (domain.includes('youtube.com') || domain.includes('youtu.be')) {
      return 'YouTube';
    }

    if (domain.includes('vimeo.com')) {
      return 'Vimeo';
    }

    if (path && path !== '/') {
      const segments = path.split('/').filter(Boolean);
      const lastSegment = segments[segments.length - 1];
      
      if (/^\d+$/.test(lastSegment) || lastSegment.length > 15 && /^[a-zA-Z0-9_-]+$/.test(lastSegment)) {
        return domain.charAt(0).toUpperCase() + domain.slice(1);
      }
      
      const cleaned = lastSegment
        .replace(/\.[^.]+$/, '')
        .replace(/[-_]/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());
      return cleaned || domain;
    }
    
    return domain.charAt(0).toUpperCase() + domain.slice(1);
  } catch {
    return url;
  }
}
