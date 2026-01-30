'use client';

import { useEffect, useRef, useState } from 'react';
import { detectVideo, getYouTubeId, getVimeoId } from '@/lib/unfurl';
import ActionButtons, { type ActionType } from '@/components/ActionButtons';

interface InboxCardProps {
  id: string;
  entry: string;
  recordType: string | null;
  title: string | null;
  onAction: (id: string, action: ActionType) => Promise<void>;
}

function isValidUrl(str: string): boolean {
  if (!str || str.trim() === '') return false;
  try {
    const url = new URL(str);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function getWebsiteDomain(url: string): string | null {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

function getBrandDomain(url: string): string | null {
  try {
    const parsed = new URL(url);
    const domain = parsed.hostname.replace(/^www\./, '');
    if (domain === 'x.com' || domain === 'twitter.com') return 'x.com';
    if (domain.includes('youtube.com') || domain === 'youtu.be') return 'youtube.com';
    if (domain.includes('vimeo.com')) return 'vimeo.com';
    return domain;
  } catch {
    return null;
  }
}

export default function InboxCard({ id, entry, recordType, title, onAction }: InboxCardProps) {
  const isNote = recordType === 'Note' || !isValidUrl(entry);
  const link = isNote ? null : entry;
  const video = link ? detectVideo(link) : null;
  const [ogImage, setOgImage] = useState<string | undefined>(undefined);
  const [fetchedTitle, setFetchedTitle] = useState<string | null>(null);
  const [brandLogo, setBrandLogo] = useState<string | null>(null);
  const [fetched, setFetched] = useState(false);
  const cardRef = useRef<HTMLElement>(null);

  const displayTitle = title || fetchedTitle || (isNote ? entry : (link ? getWebsiteDomain(link) : entry));
  const brandDomain = link ? getBrandDomain(link) : null;
  const websiteDomain = link ? getWebsiteDomain(link) : null;
  const needsOgFetch = link && !video && !fetched;
  const needsVideoTitle = link && video && !title && !fetched;

  useEffect(() => {
    if (isNote || fetched) return;
    if (!needsOgFetch && !needsVideoTitle) {
      setFetched(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          observer.disconnect();

          if (needsVideoTitle && link) {
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
          } else if (needsOgFetch && link) {
            fetch(`/api/og?url=${encodeURIComponent(link)}`)
              .then((res) => res.json())
              .then((data) => {
                if (data.image) setOgImage(data.image);
                if (data.title && !title) setFetchedTitle(data.title);
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
  }, [isNote, needsOgFetch, needsVideoTitle, fetched, link, title]);

  useEffect(() => {
    if (isNote || !brandDomain) return;

    fetch(`/api/brand-logo?domain=${encodeURIComponent(brandDomain)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.logo) setBrandLogo(data.logo);
      })
      .catch(() => {});
  }, [isNote, brandDomain]);

  const handleAction = async (rowId: string, action: ActionType) => {
    await onAction(rowId, action);
  };

  const metaContent = (
    <>
      {isNote ? (
        <img src="/note-icon.svg" alt="" className="brand-logo" width={14} height={14} />
      ) : brandLogo ? (
        <img src={brandLogo} alt="" className="brand-logo" width={14} height={14} />
      ) : (
        <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
          <path d="M2 12h20" />
        </svg>
      )}
      <span>{isNote ? 'Note' : websiteDomain || 'Link'}</span>
    </>
  );

  if (isNote) {
    return (
      <article className="card card-note" ref={cardRef}>
        <div className="card-body">
          <h2 className="card-title">{displayTitle}</h2>
        </div>
        <div className="card-meta">{metaContent}</div>
        <ActionButtons rowId={id} onAction={handleAction} />
      </article>
    );
  }

  return (
    <article className="card" ref={cardRef}>
      <a href={link!} target="_blank" rel="noopener noreferrer" className="card-link">
        <div className={`card-media${video ? ' has-video' : ''}`}>
          {video ? (
            <iframe
              src={video.embedUrl}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              loading="lazy"
            />
          ) : ogImage ? (
            <img src={ogImage} alt={displayTitle || ''} loading="lazy" />
          ) : (
            <div className="placeholder">Loading...</div>
          )}
        </div>
        <div className="card-body">
          <h2 className="card-title">{displayTitle}</h2>
        </div>
      </a>
      {websiteDomain ? (
        <a
          href={`https://${websiteDomain}`}
          target="_blank"
          rel="noopener noreferrer"
          className="card-meta card-meta-link"
          onClick={(e) => e.stopPropagation()}
        >
          {metaContent}
        </a>
      ) : (
        <div className="card-meta">{metaContent}</div>
      )}
      <ActionButtons rowId={id} onAction={handleAction} />
    </article>
  );
}
