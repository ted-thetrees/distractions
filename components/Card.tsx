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
      // Apple Music logo - Simple Icons
      return (
        <svg {...iconProps}>
          <path d="M23.994 6.124a9.23 9.23 0 00-.24-2.19c-.317-1.31-1.062-2.31-2.18-3.043a5.022 5.022 0 00-1.877-.726 10.496 10.496 0 00-1.564-.15c-.04-.003-.083-.01-.124-.013H5.99c-.042.003-.083.01-.124.013-.492.022-.978.072-1.454.178-.824.182-1.556.548-2.178 1.078-.81.691-1.336 1.566-1.625 2.586-.193.68-.282 1.376-.316 2.08-.001.037-.007.074-.009.111V18.12c.002.043.008.083.01.124.018.465.06.925.148 1.38a5.33 5.33 0 001.1 2.313c.7.803 1.568 1.33 2.593 1.59.679.177 1.375.255 2.08.282.047.002.091.008.135.01h12.05c.037-.003.074-.008.11-.01.494-.02.984-.065 1.468-.16.786-.167 1.49-.49 2.106-.977.816-.64 1.386-1.465 1.706-2.448.19-.588.289-1.192.33-1.807.034-.502.03-1.003.03-1.505V6.12l-.001.003zm-7.167 8.66l-.003.006-.066.122-.28.066c-.96.23-1.923.459-2.885.688-.45.107-.9.215-1.351.32-.052.013-.108.017-.163.014-.075-.004-.134-.04-.163-.11l-.006-.018-.004-.028V8.696a.69.69 0 01.023-.192c.023-.084.072-.138.16-.156l.15-.03 3.274-.78.893-.213c.09-.021.178-.043.268-.057.075-.01.138.015.18.08.032.05.048.107.054.168.003.035.006.07.006.106v6.07c0 .057.002.114-.004.17l-.083.52zm-.034-7.042l-.137.033-3.163.754-.873.208-.095.023c-.02.004-.04.01-.058.01-.052 0-.09-.026-.108-.075a.247.247 0 01-.016-.095V7.45a.68.68 0 01.02-.188c.022-.083.07-.135.157-.155l.15-.032 3.283-.784.883-.21c.095-.023.19-.046.286-.06.072-.01.13.02.17.083.028.046.043.097.05.15.003.032.004.064.004.098v6.083c0 .056 0 .114-.005.17-.018.194-.037.386-.12.566a.704.704 0 01-.3.322c-.163.095-.34.148-.524.183l-.14.03c-.965.23-1.93.46-2.894.692l-1.338.318c-.055.013-.112.018-.17.014-.082-.006-.143-.048-.17-.125l-.005-.02-.003-.023V8.685a.66.66 0 01.023-.192c.024-.086.075-.14.165-.158l.148-.03 3.273-.78.893-.21c.094-.022.187-.044.28-.058.073-.01.135.018.175.082.03.048.046.102.053.158.002.033.006.066.006.1v6.083c0 .056.002.113-.004.168-.02.21-.04.417-.14.608a.68.68 0 01-.282.3c-.168.1-.353.154-.544.19l-.143.03c-.962.23-1.924.46-2.887.69l-1.35.32c-.053.014-.11.017-.166.015-.073-.004-.13-.04-.16-.11a.197.197 0 01-.015-.082v-7.16a.735.735 0 01.024-.194c.022-.084.07-.14.16-.16l.15-.03 3.27-.78.895-.214c.093-.022.186-.045.28-.058.07-.01.132.015.172.08.03.05.047.105.054.163.002.034.006.068.006.102v6.074c0 .057.002.114-.004.17-.02.21-.04.417-.14.608a.688.688 0 01-.282.3c-.168.1-.353.154-.544.19" />
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
