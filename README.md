# Distractions

A curated collection of interesting things. Mobile-first link feed powered by Coda.

## Setup

1. Clone the repo
2. `npm install`
3. Copy `.env.example` to `.env.local` and add your Coda API token
4. `npm run dev`

## Deploy to Vercel

1. Import this repo to Vercel
2. Add environment variable: `CODA_API_TOKEN`
3. Deploy

## Features

- Fetches data from Coda table
- Auto-detects YouTube/Vimeo videos and embeds players
- Lazy-loads Open Graph images for link previews
- Mobile-first responsive design
- 60-second cache revalidation
