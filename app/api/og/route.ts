import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url');

  if (!url) {
    return NextResponse.json({ error: 'URL required' }, { status: 400 });
  }

  try {
    // Check if it's an X/Twitter URL
    const isTwitter = /^https?:\/\/(x\.com|twitter\.com)\//i.test(url);
    
    if (isTwitter) {
      return await fetchTwitterViaFxTwitter(url);
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Distractions/1.0)',
      },
    });
    clearTimeout(timeout);

    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch' }, { status: 502 });
    }

    const html = await response.text();

    // Extract og:image
    let imageMatch =
      html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i);

    // Extract og:title
    const titleMatch =
      html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:title["']/i);

    let image = imageMatch?.[1] || null;
    
    // Transform Apple Music images to square format
    if (image && image.includes('mzstatic.com')) {
      image = transformAppleMusicImage(image);
    }

    return NextResponse.json({
      image,
      title: titleMatch?.[1] || null,
    });
  } catch {
    return NextResponse.json({ error: 'Request failed' }, { status: 500 });
  }
}

// Transform Apple Music OG images (1200x630) to square album art
function transformAppleMusicImage(url: string): string {
  // Apple Music URLs look like: .../1200x630bf-60.jpg
  // We can change the dimensions to get square: .../600x600bf-60.jpg
  return url.replace(/\/\d+x\d+(bf-\d+\.jpg)$/, '/600x600$1');
}

async function fetchTwitterViaFxTwitter(url: string) {
  try {
    // Convert x.com/twitter.com URL to fxtwitter API URL
    const path = url.replace(/^https?:\/\/(x\.com|twitter\.com)/i, '');
    const fxUrl = `https://api.fxtwitter.com${path}`;
    
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(fxUrl, { signal: controller.signal });
    clearTimeout(timeout);
    
    if (!response.ok) {
      return fallbackTwitterTitle(url);
    }
    
    const data = await response.json();
    
    if (data.code !== 200) {
      return fallbackTwitterTitle(url);
    }
    
    // Check if it's a tweet or a profile
    if (data.tweet) {
      // It's a tweet
      const tweet = data.tweet;
      const authorName = tweet.author?.name || tweet.author?.screen_name || 'X';
      const text = tweet.text?.slice(0, 100) || '';
      const ellipsis = tweet.text?.length > 100 ? '...' : '';
      
      // Get image: prefer media thumbnail, then author avatar
      let image = null;
      if (tweet.media?.photos?.[0]?.url) {
        image = tweet.media.photos[0].url;
      } else if (tweet.media?.videos?.[0]?.thumbnail_url) {
        image = tweet.media.videos[0].thumbnail_url;
      } else if (tweet.author?.avatar_url) {
        image = tweet.author.avatar_url;
      }
      
      return NextResponse.json({
        image,
        title: text ? `${authorName}: "${text}${ellipsis}"` : `Post by ${authorName}`,
      });
    } else if (data.user) {
      // It's a profile
      const user = data.user;
      const image = user.banner_url || user.avatar_url || null;
      
      return NextResponse.json({
        image,
        title: `@${user.screen_name} on X`,
      });
    }
    
    return fallbackTwitterTitle(url);
  } catch {
    return fallbackTwitterTitle(url);
  }
}

function fallbackTwitterTitle(url: string) {
  // Extract username from URL as fallback
  const usernameMatch = url.match(/(?:x\.com|twitter\.com)\/([^\/\?]+)/i);
  if (usernameMatch) {
    return NextResponse.json({
      image: null,
      title: `@${usernameMatch[1]} on X`,
    });
  }
  return NextResponse.json({ image: null, title: 'X' });
}
