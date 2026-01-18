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
      return await fetchTwitterOEmbed(url);
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
    const imageMatch =
      html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i);

    // Extract og:title
    const titleMatch =
      html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:title["']/i);

    return NextResponse.json({
      image: imageMatch?.[1] || null,
      title: titleMatch?.[1] || null,
    });
  } catch {
    return NextResponse.json({ error: 'Request failed' }, { status: 500 });
  }
}

async function fetchTwitterOEmbed(url: string) {
  try {
    // Check if it's a tweet (has /status/) or a profile
    const isTweet = /\/status\/\d+/.test(url);
    
    if (isTweet) {
      // Use Twitter oEmbed for tweets
      const oembedUrl = `https://publish.twitter.com/oembed?url=${encodeURIComponent(url)}&omit_script=true`;
      
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(oembedUrl, { signal: controller.signal });
      clearTimeout(timeout);
      
      if (response.ok) {
        const data = await response.json();
        // Extract author name and clean up the HTML to get tweet text
        const authorName = data.author_name || 'X';
        // The html contains the tweet text, extract a preview
        const htmlContent = data.html || '';
        const tweetMatch = htmlContent.match(/<p[^>]*>([^<]+)<\/p>/);
        const tweetText = tweetMatch ? tweetMatch[1].slice(0, 100) : '';
        
        return NextResponse.json({
          image: null, // Twitter oEmbed doesn't provide images
          title: tweetText ? `${authorName}: "${tweetText}${tweetText.length >= 100 ? '...' : ''}"` : `Post by ${authorName}`,
        });
      }
    }
    
    // For profiles or failed oEmbed, extract username from URL
    const usernameMatch = url.match(/(?:x\.com|twitter\.com)\/([^\/\?]+)/i);
    if (usernameMatch) {
      const username = usernameMatch[1];
      return NextResponse.json({
        image: null,
        title: `@${username} on X`,
      });
    }
    
    return NextResponse.json({ image: null, title: 'X' });
  } catch {
    return NextResponse.json({ image: null, title: 'X' });
  }
}
