# Odyssey Walk

Voice-first walking tour app: pick a start location, generate a route and points of interest with an LLM, then walk and hear narration at each stop. Press and hold the mic to ask questions—answered by AI and spoken back.

## Features

- **Create Tour** (`/create`) — Set start location (search or map click), choose theme, duration, language, and voice. Generate a tour via OpenRouter (intro, outro, 5–8 POIs with scripts).
- **Active Walk** (`/tour/active`) — Play intro, then follow GPS or demo movement. At each POI, narration plays automatically. Press-and-hold mic for Q&A (STT → OpenRouter → TTS).
- **Completion** (`/tour/complete`) — After the last stop, outro plays and you see a summary with “Save Tour” and “Generate Another.”
- **Demo** (`/demo`) — Run a 90-second scripted demo without mic or location: two stops and a sample Q&A.

## Prerequisites

- **Node.js** 18+ and npm
- **API keys** (see below): OpenRouter (required), Google Maps (recommended), optional Gradium for TTS/STT

## Quick Start

```bash
git clone https://github.com/aaronk2005/OdysseyWalk.git
cd OdysseyWalk
npm install
cp .env.example .env.local
# Edit .env.local and set OPENROUTER_API_KEY and optionally others
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

Copy `.env.example` to `.env.local` and configure:

| Variable | Scope | Purpose |
|----------|--------|---------|
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Client | Map + Places search. **Recommended** or map won’t show. |
| `OPENROUTER_API_KEY` | Server | Tour generation + Q&A. **Required** (format: `sk-or-v1-...`). |
| `NEXT_PUBLIC_USE_BROWSER_TTS` | Client | `true` = use browser SpeechSynthesis only (no Gradium TTS). |
| `GRADIUM_API_KEY` | Server | Gradium TTS/STT (keys: `gd_` or `gsk_`). Optional. |
| `GRADIUM_TTS_WS_URL` | Server | TTS WebSocket (e.g. `wss://us.api.gradium.ai/api/speech/tts`). |
| `GRADIUM_TTS_URL` | Server | TTS POST fallback if WebSocket isn’t used. |
| `GRADIUM_STT_WS_URL` | Server | STT WebSocket. Leave empty to use browser SpeechRecognition. |
| `GRADIUM_STT_URL` | Server | Legacy STT (wss URL). |

**Getting keys**

- **Google Maps:** [Google Cloud Console](https://console.cloud.google.com/) → enable Maps JavaScript API and Places API.
- **OpenRouter:** [openrouter.ai/keys](https://openrouter.ai/keys).
- **Gradium:** [gradium.ai](https://gradium.ai) (for optional cloud TTS/STT).

**Voice behavior**

- **TTS:** With `NEXT_PUBLIC_USE_BROWSER_TTS=true` or no Gradium TTS config, the app uses browser `SpeechSynthesis`. With Gradium configured, it uses Gradium (WebSocket or POST).
- **STT:** If Gradium STT URLs are not set, the app uses browser `SpeechRecognition` (Chrome/Edge/Safari). Set Gradium STT to use server-side STT (requires ffmpeg for webm→PCM).

Restart the dev server after changing `.env.local`.

## Deploy to Vercel

1. **Push to GitHub** and import the repo in [Vercel](https://vercel.com): **Add New Project** → Import your Git repository.

2. **Environment variables** — In the Vercel project **Settings → Environment Variables**, add at least:
   - `OPENROUTER_API_KEY` (required)
   - `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` (recommended for maps)
   - Optionally: `GRADIUM_API_KEY`, `GRADIUM_TTS_WS_URL`, `GRADIUM_TTS_URL` for cloud TTS.  
   Add **both** Production and Preview if you want them for all deployments.

3. **Deploy** — Vercel will run `npm run build` and deploy. The app works with **browser-only voice** (no Gradium): set `NEXT_PUBLIC_USE_BROWSER_TTS=true` or leave Gradium TTS/STT unset to use SpeechSynthesis and SpeechRecognition in the browser.

4. **Vercel notes**
   - **STT:** Server-side Gradium STT needs ffmpeg (not available on Vercel’s serverless runtime). Leave `GRADIUM_STT_WS_URL` unset to use browser SpeechRecognition.
   - **Tour generation:** `/api/tour/generate` can take 30–60s. On the **Hobby** plan the function timeout is 10s; for longer runs use the **Pro** plan (up to 60s with `maxDuration`).
   - **Saved tours:** The “Save Tour” flow stores tours in the repo’s `public/tours` at build time; dynamically saved tours are not persisted on Vercel. For persistent saved tours you’d need a database or external store.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Next.js dev server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |

## Project Structure

```
app/
  page.tsx                    # Landing
  create/page.tsx              # Map, search, preferences, Generate, Start Walk
  tour/active/page.tsx         # Active walk (map + player)
  tour/complete/page.tsx       # Completion summary
  demo/page.tsx                # 90s scripted demo
  api/
    tour/generate/route.ts     # POST: generate tour (OpenRouter)
    qa/route.ts                # POST: Q&A (OpenRouter)
    tts/route.ts               # POST: TTS (Gradium)
    stt/route.ts               # POST: STT (Gradium)
    health/route.ts            # GET: config status
    tours/route.ts             # GET/POST saved tours
    tours/[tourId]/route.ts    # GET/DELETE single tour
lib/
  types.ts                     # LatLng, GeneratedTour, TourPlan, POI, SessionState, AudioState
  config.ts                    # getClientConfig, getServerConfig
  data/SessionStore.ts         # saveTour, loadTour, updateSession, clearTour
  data/TourRepository.ts        # tour persistence
  maps/                        # MapLoader, polyline, haversine, directions
  geo/                         # GeoProvider, GeoSimProvider, GeoTriggerEngine
  audio/AudioSessionManager.ts # playIntro, playPoiScript, playAnswer, playOutro
  voice/                       # STTRecorder, VoiceController
  tts/gradiumTtsWs.ts          # Gradium TTS WebSocket
  stt/                         # gradiumSttWs, webmToPcm
components/
  MapView, BottomSheetPlayer, PlaceSearchBox, TourGenerationPanel,
  CompletionSummary, ActiveWalkAudioPanel, AskTextModal, VoiceBar,
  DemoModeBanner, MapsKeyBanner, Toast, SettingsDrawer, …
hooks/
  useActiveTour.ts             # Active walk state and triggers
  useVoiceNext.ts              # Voice / TTS integration
scripts/                       # Favicon, thumbnails, check-tts, etc.
```

## API Overview

- **GET `/api/health`** — Returns `{ ok, mapsKeyPresent, openRouterConfigured, gradiumConfigured }`. Use to verify config.
- **POST `/api/tour/generate`** — Generate tour (OpenRouter). Rate-limited per IP.
- **POST `/api/qa`** — Q&A (OpenRouter). Rate-limited per IP.
- **POST `/api/tts`** — TTS (Gradium). Rate-limited per IP.
- **POST `/api/stt`** — STT (Gradium). Rate-limited per IP. 429 responses include `Retry-After`.

## Demo Mode

- If location is denied or you use the “demo” flow, the app uses simulated movement along the route.
- On an active tour, demo mode shows “Next stop” and a “Run 90s Demo” link to `/demo`.
- **Run 90s Demo** on `/demo`: no mic or GPS; plays two stops and a sample Q&A.

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Map blank | Set `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` and enable Maps JavaScript API and Places. |
| “OpenRouter not configured” | Set `OPENROUTER_API_KEY` in `.env.local`. |
| TTS/STT not working | For Gradium: set `GRADIUM_API_KEY` and TTS/STT URLs. Without them, app uses browser TTS/STT or typed-question fallback. |
| Rate limits | `/api/tour/generate`, `/api/qa`, `/api/tts`, `/api/stt` are rate-limited per IP. Check 429 and `Retry-After`. |

## Stack

- **Next.js 14** (App Router), **TypeScript**, **Tailwind CSS**, **Framer Motion**
- **Google Maps** JavaScript API (map + Places autocomplete)
- **OpenRouter** (tour generation + Q&A)
- **Gradium** (optional STT + TTS via server-only endpoints)
