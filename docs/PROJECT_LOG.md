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
- **Table ID:** `grid-BQE4pcweF2` ("Distractions | Regulars | Browsing")

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

---

## n8n Workflow: Poll for New Rows

**Workflow Name:** "Distractions - Poll for New Rows"  
**Workflow ID:** `xjakavqlRrftsG4c`  
**Workflow URL:** `https://n8n.listentothetrees.com/workflow/xjakavqlRrftsG4c`  
**Status:** 🔄 Testing in progress - Coda node verified working

### Purpose
Since Coda cannot send outgoing HTTP requests natively, this workflow polls Coda periodically to find rows that need preview images generated.

### Architecture

```
Schedule Trigger (5 min) → Get Rows (Coda) → Filter Rows → Loop Over Items → Trigger Image Fetch (HTTP POST)
```

### Build Status: ✅ COMPLETE - Testing in Progress

All 5 nodes are created, connected, and validated. Coda node tested successfully (returns 26 items).

### Node Configuration

**1. Schedule Trigger** ✓
- Interval: Every 5 minutes
- typeVersion: 1.2

**2. Get Rows Needing Images (Coda)** ✓ TESTED
- Doc ID: `x8nvwL5l1e` (Everything)
- Table ID: `grid-BQE4pcweF2` (Distractions | Regulars | Browsing)
- Operation: Get All Rows
- Limit: 50 rows
- Query: (empty - filtering done by Filter node)
- Credentials: Coda account
- Options: useColumnNames = true
- **Test Result:** Successfully returns 26 items from Coda table

**3. Filter Rows Needing Images** ✓
- Combinator: AND
- Condition 1: `Uploaded Image` is empty
- Condition 2: `Link` is not empty
- This filters to only rows that need image generation

**4. Loop Over Items** ✓
- Batch Size: 1
- Processes each filtered row individually

**5. Trigger Image Fetch (HTTP Request)** ✓
- Method: POST
- URL: `https://n8n.listentothetrees.com/webhook/distractions-image`
- Body: `{ row_id: $json.id, link: $json.Link }`

### Query Filter Solution (January 18, 2026)

**Problem:** The Coda node's query parameter only supports simple `column:value` equality matching. It does NOT support:
- Complex filters like "is blank" or "is not blank"
- AND/OR logic between multiple conditions
- Coda formula-style queries like `IsBlank()` or `IsNotBlank()`

**Solution:** Added a Filter node after the Coda node that filters in n8n instead of Coda:
- Filter type: n8n-nodes-base.filter (typeVersion 2)
- Combinator: "and"
- Conditions:
  1. `$json['Uploaded Image']` is empty (string operation: empty)
  2. `$json.Link` is not empty (string operation: notEmpty)

This approach is more reliable and maintainable than trying to use Coda's limited query syntax.

### Current Testing Status (January 18, 2026 ~10:05 PM MST)

**Completed:**
- ✅ Cleared the broken query from Coda node (was causing JSON parse error)
- ✅ Set Return All = OFF, Limit = 50
- ✅ Tested Coda node - successfully returns 26 items
- ✅ Confirmed some rows have "empty" in Image column (candidates for image generation)

**Next Steps:**
1. Click "Back to canvas" in n8n UI
2. Click on Filter node and test it (should filter to only rows with empty Image + non-empty Link)
3. Test the full workflow end-to-end
4. Activate the workflow for production polling

### Browser State
- n8n workflow is open at: https://n8n.listentothetrees.com/workflow/xjakavqlRrftsG4c
- Currently viewing the Coda node output (26 items returned)
- Need to navigate back to canvas and test Filter node

---

## Coda Automation Research (January 18, 2026)

### Problem
Need to trigger the n8n workflow when new rows are added to the Coda table.

### Key Findings
**Coda CANNOT natively send outgoing HTTP POST requests from automations.**

- Coda's "webhook" feature is INCOMING only (receives webhooks to trigger Coda automations)
- Community thread from Feb 2022 confirms: "UI actions like 'OpenWindow' can't run on the server"
- No built-in HTTP request action in Coda automations
- Would require installing third-party Coda Pack (e.g., "Badawa n8n Webhook Pack")

### Options Considered
1. **Third-party Coda Pack** — Rejected (avoiding pack dependencies)
2. **Custom Coda Pack** — Too complex for this use case
3. **Zapier/Make intermediary** — Adds unnecessary layer
4. **n8n polling** — ✓ Selected approach

### Decision: Polling-Based Approach

Instead of push (Coda → n8n), use pull (n8n polls Coda).

**Advantages:**
- No Coda Packs required
- Uses existing Coda API integration in n8n
- Leverages existing image fetching workflow
- Polling interval configurable
- More reliable than push-based triggers

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
- [x] n8n polling workflow complete with Filter node
- [x] Coda node tested - returns 26 items
- [ ] Filter node testing
- [ ] Full workflow end-to-end test
- [ ] Activate for production

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

### January 18, 2026 (Night ~10:05 PM MST - TESTING)
- ✅ Cleared broken query from Coda node (was causing "Unexpected non-whitespace character after JSON" error)
- ✅ Set Coda node: Return All = OFF, Limit = 50, Query = empty
- ✅ Tested Coda node via browser - successfully returns 26 items
- ✅ Confirmed output shows rows with "empty" in Image column (need image generation)
- 🔄 Next: Test Filter node, then full workflow, then activate

### January 18, 2026 (Night - FIXED)
- ✅ **FIXED:** Query filter issue resolved by adding a Filter node
- Added "Filter Rows Needing Images" node between Coda and Loop nodes
- Filter conditions: `Uploaded Image` empty AND `Link` not empty
- Increased row limit from 10 to 50 for better polling efficiency
- Workflow now validates successfully (5 nodes, 4 connections)
- **Key insight:** Coda node query only supports simple `column:value` equality - use n8n Filter node for complex logic

### January 18, 2026 (Night - Previous)
- Built complete polling workflow using n8n MCP server API
- Created all 4 nodes: Schedule Trigger → Get Rows Needing Images → Loop Over Items → Trigger Image Fetch
- Fixed incorrect table ID (was grid-t9UDaCw93A, corrected to grid-BQE4pcweF2)
- Workflow validates successfully (4 nodes, 3 connections)
- Identified Coda query filter syntax limitation

### January 18, 2026 (Evening)
- Continued building "Distractions - Poll for New Rows" n8n workflow
- Configured Schedule Trigger (5-minute interval)
- Searched for Coda node in n8n interface

### January 18, 2026 (Later)
- Started building "Distractions - Poll for New Rows" n8n workflow
- Created Schedule Trigger node
- Documented workflow architecture and implementation details
- Added Coda query syntax for filtering rows with empty images

### January 18, 2026
- Researched Coda automation limitations (no native outgoing HTTP)
- Decided on polling approach instead of push-based triggers
- Updated documentation with findings

### January 2026 (Earlier)
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

*Last updated: January 18, 2026 ~10:05 PM MST*
