import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url');
  const type = request.nextUrl.searchParams.get('type');

  if (!url || !type) {
    return NextResponse.json({ error: 'URL and type required' }, { status: 400 });
  }

  try {
    let oembedUrl: string;

    if (type === 'youtube') {
      oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
    } else if (type === 'vimeo') {
      oembedUrl = `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(url)}`;
    } else {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(oembedUrl, {
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) {
      return NextResponse.json({ title: null });
    }

    const data = await response.json();
    return NextResponse.json({ title: data.title || null });
  } catch {
    return NextResponse.json({ title: null });
  }
}
