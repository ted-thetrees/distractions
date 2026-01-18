export interface MediaInfo {
  type: 'video' | 'image' | 'none';
  url?: string;
  embedUrl?: string;
  title?: string;
}

// Extract YouTube video ID from various URL formats
export function getYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

// Extract Vimeo video ID
export function getVimeoId(url: string): string | null {
  const match = url.match(/vimeo\.com\/(\d+)/);
  return match ? match[1] : null;
}

// Detect video and return embed info
export function detectVideo(url: string): { embedUrl: string; thumbnail: string } | null {
  const youtubeId = getYouTubeId(url);
  if (youtubeId) {
    return {
      embedUrl: `https://www.youtube.com/embed/${youtubeId}`,
      thumbnail: `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`,
    };
  }

  const vimeoId = getVimeoId(url);
  if (vimeoId) {
    return {
      embedUrl: `https://player.vimeo.com/video/${vimeoId}`,
      thumbnail: '', // Vimeo thumbnails require API call
    };
  }

  return null;
}

// Fetch Open Graph metadata from a URL
export async function fetchOgData(url: string): Promise<{ image?: string; title?: string }> {
  try {
    // Use a timeout to avoid hanging on slow sites
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Distractions/1.0)',
      },
    });
    clearTimeout(timeout);

    if (!response.ok) return {};

    const html = await response.text();
    
    // Extract og:image
    const imageMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i)
      || html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i);
    
    // Extract og:title
    const titleMatch = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i)
      || html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:title["']/i);

    return {
      image: imageMatch?.[1],
      title: titleMatch?.[1],
    };
  } catch {
    return {};
  }
}

// Get display info for a single item
export async function getMediaInfo(
  link: string,
  codaImage?: string,
  codaName?: string
): Promise<MediaInfo & { title: string }> {
  // Check for video first
  const video = detectVideo(link);
  if (video) {
    return {
      type: 'video',
      embedUrl: video.embedUrl,
      url: video.thumbnail,
      title: codaName || link,
    };
  }

  // If we have a Coda image, use it
  if (codaImage && codaImage.length > 0) {
    return {
      type: 'image',
      url: codaImage,
      title: codaName || link,
    };
  }

  // Try to fetch OG data
  const og = await fetchOgData(link);
  
  return {
    type: og.image ? 'image' : 'none',
    url: og.image,
    title: codaName || og.title || link,
  };
}
