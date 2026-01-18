# Distractions - Project Log

A mobile-first link feed for curated content, powered by Coda and deployed on Vercel.

**Live Site:** https://distractions.vercel.app  
**Repository:** https://github.com/ted-thetrees/distractions  
**Data Source:** Coda "Everything" doc → "Distractions" table

---

## Project Overview

Distractions is a simple, single-column mobile website that displays a feed of curated links, videos, notes, and content. Each item is rendered as a card with an image/video preview and title. The design is clean and editorial with an Instrument Serif font for titles and a warm off-white background.

### Core Concept
- Single column, mobile-first layout (480px max-width)
- Card-based design with image at top, title below
- Content type icons indicating what kind of item it is
- Data pulled from Coda table via API

---

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Deployment:** Vercel
- **Data:** Coda API
- **Styling:** CSS (no Tailwind)
- **Font:** Instrument Serif (Google Fonts)

---

## Data Architecture

### Coda Table Structure
- **Doc ID:** `x8nvwL5l1e` ("Everything")
- **Table ID:** `grid-t9UDaCw93A` ("Distractions | Regulars | Browsing")

### Columns Used
| Column | Field ID | Purpose |
|--------|----------|---------|
| Name | `c-yrhJnxU2ns` | Card title |
| Link | `c-V60iC4UaYP` | URL to content |
| Uploaded Image | `c-R5LP8UaCQf` | Pre-stored preview image |
| Scale | `c-q3eAZofAM0` | Rating (1-5 stars) |
| Status | `c-39S1Z-7QdP` | "Live" or "Archived" |

### Filtering
Only items with `Status = "Live"` are displayed.

---

## Card Types & Content Detection

The Card component automatically detects content type from URLs and displays appropriate icons/labels:

| Content Type | Detection Logic | Icon |
|--------------|-----------------|------|
| Note | No valid URL (empty or text-only) | Fountain pen icon |
| X Profile | `x.com` or `twitter.com` without `/status/` | X logo |
| X Post | `x.com/*/status/*` | X logo |
| YouTube | `youtube.com` or `youtu.be` | YouTube logo |
| Vimeo | `vimeo.com` | Vimeo logo |
| Apple Music Album | `music.apple.com/*/album/*` | Apple Music logo |
| Apple Music Track | `music.apple.com` with `?i=` param | Apple Music logo |
| Website | Everything else | Globe icon + domain name |

---

## Image/Preview Logic

Priority order for what displays at the top of each card:

1. **Video embed** — YouTube/Vimeo links show embedded player (16:9 aspect ratio)
2. **Coda Image field** — If `Uploaded Image` has a URL, use it
3. **OG Image** — Lazy-fetch `og:image` from the URL when card scrolls into view
4. **Placeholder** — "No preview" message

### API Routes for Fetching

- `/api/og?url=` — Fetches Open Graph image and title from any URL
- `/api/video-title?type=youtube|vimeo&url=` — Fetches video titles
- `/api/brand-logo?domain=` — Fetches favicon/logo via Brandfetch API

---

## n8n Workflow: Auto-Generate Preview Images

**Workflow Name:** "Distractions - Fetch Preview Image"  
**Webhook URL:** `https://n8n.listentothetrees.com/webhook/distractions-image`  
**Status:** Active

### Purpose
Automatically generates preview images for new Coda rows so users don't wait for image loading.

### Workflow Steps
1. **Webhook** receives `row_id` and `link` from Coda automation
2. **Validate URL** — Check if link starts with "http"
3. **Fetch Page HTML** — HTTP request with 10s timeout
4. **Extract OG Image** — JavaScript regex to find `og:image` meta tag
5. **Branch:** Has OG Image?
   - **Yes:** Use the OG image URL
   - **No:** Call Microlink API for screenshot
6. **Microlink Screenshot** — `https://api.microlink.io/?url=...&screenshot=true&embed=screenshot.url`
7. **Update Coda Row** — PUT request to update "Uploaded Image" field
8. **Respond** — Return JSON with `success`, `image_url`, `source`

### Microlink API
- **Free tier:** 50 requests/day (soft limit)
- **Endpoint:** `https://api.microlink.io/?url={url}&screenshot=true&embed=screenshot.url`

### Coda Automation (Pending Setup)
Trigger: "When a row is added" to Distractions table  
Action: POST to webhook with `{"row_id": "{row ID}", "link": "{Link}"}`

---

## File Structure

```
distractions/
├── app/
│   ├── api/
│   │   ├── brand-logo/route.ts    # Fetch site logos
│   │   ├── og/route.ts            # Fetch OG metadata
│   │   └── video-title/route.ts   # Fetch YouTube/Vimeo titles
│   ├── globals.css                # All styling
│   ├── layout.tsx                 # Root layout with fonts
│   └── page.tsx                   # Main feed page
├── components/
│   └── Card.tsx                   # Card component with all logic
├── lib/
│   ├── coda.ts                    # Coda API integration
│   └── unfurl.ts                  # Video detection utilities
├── public/
│   ├── note-icon.svg              # Fountain pen icon for notes
│   └── note-icon.webp             # WebP version
└── docs/
    └── PROJECT_LOG.md             # This file
```

---

## Design Decisions

### Typography
- **Display font:** Instrument Serif (titles)
- **Body font:** System fonts

### Colors
- **Background:** `#f8f5f0` (warm off-white)
- **Card background:** `#ffffff`
- **Text:** `#2c2c2c`
- **Muted text:** `#6b6b6b`
- **Border:** `#e8e4df`

### Spacing
- **Base unit:** 16px (`--spacing`)
- **Card border radius:** 12px
- **Max content width:** 480px

### Aspect Ratios
- **Videos:** Fixed 16:9
- **Images:** Natural aspect ratio (preserves original proportions)
- **Placeholders:** 16:9

---

## Features Implemented

### Phase 1: Core Feed ✓
- [x] Fetch data from Coda API
- [x] Display cards with image + title
- [x] Mobile-first responsive design
- [x] 60-second cache revalidation

### Phase 2: Video Support ✓
- [x] Detect YouTube/Vimeo URLs
- [x] Embed video players
- [x] Fetch video titles via API

### Phase 3: Content Type Icons ✓
- [x] X/Twitter profile vs post detection
- [x] YouTube/Vimeo brand icons
- [x] Apple Music album vs track detection
- [x] Website with domain name display
- [x] Note cards (no URL)
- [x] Brand logos via Brandfetch API

### Phase 4: Image Optimization ✓
- [x] Lazy-load OG images on scroll
- [x] Natural aspect ratios for images
- [x] Apple Music album art URL transformation

### Phase 5: Preview Image Generation ✓
- [x] n8n workflow for auto-generating images
- [x] OG image extraction
- [x] Microlink screenshot fallback
- [x] Coda row update via API
- [ ] Coda automation trigger (pending setup)

---

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `CODA_API_TOKEN` | Authenticate with Coda API |

---

## Deployment

Hosted on Vercel at https://distractions.vercel.app

### Deploy Steps
1. Push to `main` branch
2. Vercel auto-deploys
3. Environment variable `CODA_API_TOKEN` configured in Vercel dashboard

---

## Future Enhancements (Ideas)

- [ ] Filtering by content type
- [ ] Sort by date created vs. rating
- [ ] Search functionality
- [ ] RSS feed support with article detection
- [ ] AI-generated summaries via Claude API
- [ ] Category tags
- [ ] Custom domain (distractions.listentothetrees.com)

---

## Changelog

### January 2026
- Initial project creation
- Next.js setup with Coda integration
- Card component with video detection
- Content type icons (X, YouTube, Vimeo, Apple Music)
- Note card support (no-URL items)
- Brand logo fetching via Brandfetch
- Website domain display in card footer
- Natural aspect ratio for images
- n8n workflow for preview image generation
- Microlink screenshot fallback for sites without OG images

---

*Last updated: January 18, 2026*
