import { NextRequest, NextResponse } from 'next/server';

const BRANDFETCH_API_KEY = process.env.BRANDFETCH_API_KEY;

// Cache logos in memory to reduce API calls
const logoCache = new Map<string, { logo: string | null; timestamp: number }>();
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const domain = searchParams.get('domain');

  if (!domain) {
    return NextResponse.json({ error: 'Domain required' }, { status: 400 });
  }

  // Check cache first
  const cached = logoCache.get(domain);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return NextResponse.json({ logo: cached.logo });
  }

  if (!BRANDFETCH_API_KEY) {
    return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
  }

  try {
    const response = await fetch(`https://api.brandfetch.io/v2/brands/${domain}`, {
      headers: {
        'Authorization': `Bearer ${BRANDFETCH_API_KEY}`,
      },
    });

    if (!response.ok) {
      // Cache the failure to avoid repeated failed requests
      logoCache.set(domain, { logo: null, timestamp: Date.now() });
      return NextResponse.json({ logo: null });
    }

    const data = await response.json();
    
    // Find the best logo - prefer icon, then logo, in SVG or PNG format
    let logoUrl: string | null = null;
    
    // First try to find an icon
    const icons = data.logos?.filter((l: any) => l.type === 'icon') || [];
    const logos = data.logos?.filter((l: any) => l.type === 'logo') || [];
    const symbols = data.logos?.filter((l: any) => l.type === 'symbol') || [];
    
    // Priority: icon > symbol > logo
    const candidates = [...icons, ...symbols, ...logos];
    
    for (const candidate of candidates) {
      // Prefer SVG, then PNG
      const formats = candidate.formats || [];
      const svg = formats.find((f: any) => f.format === 'svg');
      const png = formats.find((f: any) => f.format === 'png');
      
      if (svg?.src) {
        logoUrl = svg.src;
        break;
      } else if (png?.src) {
        logoUrl = png.src;
        break;
      }
    }

    // Cache the result
    logoCache.set(domain, { logo: logoUrl, timestamp: Date.now() });
    
    return NextResponse.json({ logo: logoUrl });
  } catch (error) {
    console.error('Brandfetch error:', error);
    logoCache.set(domain, { logo: null, timestamp: Date.now() });
    return NextResponse.json({ logo: null });
  }
}
