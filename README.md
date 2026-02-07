# Odyssey Walk

Voice-first walking tour app: pick a start location, generate a route and POIs with an LLM, then walk and hear narration at each stop. Press and hold the mic to ask questions—answered by AI and spoken back.

## Features

- **Create Tour** (`/create`): Set start location (search or map click), choose theme, duration, language, and voice. Generate a tour via OpenRouter (intro, outro, 5–8 POIs with scripts).
- **Start Walk** (`/tour/active`): Play intro, then GPS or demo movement. At each POI, narration plays automatically. Press-and-hold mic for Q&A (STT → OpenRouter → TTS).
- **Completion** (`/tour/complete`): After the last stop, outro plays and you see a summary with “Save Tour” and “Generate Another.”
- **Demo** (`/demo`): Run a 90-second scripted demo without mic or location: Stop 1 → sample Q&A → Stop 2.

## Setup

1. **Clone and install**
   ```bash
   cd OdysseyWalk
   npm install
   ```

2. **Environment**
   Copy `.env.example` to `.env.local` and set:

   | Variable | Where | Purpose | Required? |
   |----------|--------|---------|-----------|
   | `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Client | Map + Places search | ⚠️ Recommended (or map won't show) |
   | `OPENROUTER_API_KEY` | Server only | Tour generation + Q&A | ✅ Required (starts with `sk-or-v1-`) |

   **Getting API Keys:**
   - **Google Maps**: Get from [Google Cloud Console](https://console.cloud.google.com/) → Enable Maps JavaScript API & Places API
   - **OpenRouter**: Get from [openrouter.ai](https://openrouter.ai/keys) (format: `sk-or-v1-...`)

   **Voice Features:** The app uses browser-native `SpeechSynthesis` (TTS) and `SpeechRecognition` (STT). These work excellently in Chrome, Edge, and Safari - no additional API keys needed!

3. **Run**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000).

4. **Health Check**
   Visit `/api/health` to verify all API keys are configured correctly. Warnings will show if keys are misconfigured.

## Env vars (reference)

- **Client (only maps):** `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`
- **Server only (never expose):** `OPENROUTER_API_KEY`, `GRADIUM_API_KEY`, `GRADIUM_TTS_URL`, `GRADIUM_STT_URL`

## Demo mode

- If **location is denied** or you use “demo” flow, the app uses simulated movement along the route.
- On **active tour**, demo mode shows “Next stop” and “Run 90s Demo” (link to `/demo`).
- **Run 90s Demo** on `/demo`: no mic or GPS; plays two stops and a sample Q&A.

## Troubleshooting

- **Map blank:** Set `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` and ensure the key has Maps JavaScript API and (for search) Places enabled.
- **“OpenRouter not configured”:** Set `OPENROUTER_API_KEY` for generate and Q&A.
- **“TTS not configured” / “STT not configured”:** Set Gradium env vars. Without them, TTS falls back to a placeholder (or no audio if `public/audio/placeholder.mp3` is missing) and STT to a typed-question modal.
- **Rate limits:** `/api/tour/generate`, `/api/qa`, `/api/tts`, `/api/stt` are rate-limited per IP. 429 responses include `Retry-After`.
- **Health:** `GET /api/health` returns `{ ok, mapsKeyPresent, openRouterConfigured, gradiumConfigured }`.

## Stack

- Next.js 14 (App Router), TypeScript, TailwindCSS, Framer Motion
- Google Maps JavaScript API (map + Places autocomplete)
- OpenRouter (tour generation + Q&A)
- Gradium (STT + TTS) via server-only endpoints

## File tree (main)

```
app/
  page.tsx                 # Landing
  create/page.tsx          # Map, search, preferences, Generate, Start Walk
  tour/active/page.tsx    # Active walk (map + player)
  tour/complete/page.tsx  # Completion summary
  demo/page.tsx           # 90s scripted demo
  api/
    tour/generate/route.ts  # POST: generate tour (OpenRouter)
    qa/route.ts             # POST: Q&A (OpenRouter)
    tts/route.ts            # POST: TTS (Gradium)
    stt/route.ts            # POST: STT (Gradium)
    health/route.ts         # GET: config status
lib/
  types.ts                 # LatLng, GeneratedTour*, TourPlan, POI, SessionState, AudioState
  data/SessionStore.ts     # saveTour, loadTour, updateSession, clearTour
  maps/MapLoader.ts, polyline.ts, haversine.ts
  geo/ GeoProvider, GeoSimProvider, GeoTriggerEngine, ILocationProvider
  audio/AudioSessionManager.ts  # playIntro, playPoiScript, playAnswer, playOutro
  voice/STTRecorder.ts, VoiceController.ts
components/
  MapView, BottomSheetPlayer, PlaceSearchBox, TourGenerationPanel,
  CompletionSummary, AskTextModal, DemoModeBanner, MapsKeyBanner, Toast, SettingsDrawer, DebugPanel
hooks/
  useActiveTour.ts         # Active walk state and triggers
```
