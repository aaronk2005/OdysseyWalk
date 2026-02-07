# Odyssey Walk

Premium, **mobile-first, voice-first** audio tour guide. See a tour route and POIs on a map; when you reach a stop, narration plays automatically. Press and hold to ask questions by voice—answered by an LLM and spoken back via TTS.

## Features

- **Tour selection & map** — List tours, open one to see full-screen Google Map with route polyline and POI markers.
- **Geofence triggers** — When you enter a POI’s radius, narration auto-plays (Gradium TTS).
- **Voice Q&A** — Press-and-hold mic → STT (Gradium) → OpenRouter LLM → TTS (Gradium) for answers.
- **Demo mode** — Simulated location along the route + manual “Play next” so the app demos reliably without GPS.
- **LLM-assisted tour creation** — Pick start location, theme, duration; backend generates a tour with POIs and scripts (OpenRouter).

## How to run locally

1. Clone and install:

   ```bash
   cd hsn
   npm install
   ```

2. Copy env and set keys (see below):

   ```bash
   cp .env.example .env.local
   ```

3. Start dev server:

   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000). Use **Explore Tours** or **Try Demo**, or go to `/tour/sample` for the main tour experience.

## Required env vars

| Variable | Where | Purpose |
|----------|--------|---------|
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Client | Map + (optional) Places |
| `OPENROUTER_API_KEY` | Server | Q&A and tour generation |
| `GRADIUM_API_KEY` | Server | TTS and STT |
| `GRADIUM_TTS_URL` | Server | Gradium TTS endpoint |
| `GRADIUM_STT_URL` | Server | Gradium STT endpoint |

Only the Maps key is public; the rest must stay server-side.

## Demo mode

- Default on the tour page so the app works without GPS.
- Location is simulated along the route; use **Play next** in the bottom sheet or the **Debug** panel to jump/trigger POIs.
- **Demo page** (`/demo`): scripted playback and per-stop “teleport & play” for judging.

## Known limitations

- Tours are JSON in `public/tours` (and in-memory/localStorage for generated tours).
- Gradium TTS/STT request/response shape may need adjustment to match your Gradium API.
- No streaming TTS playback in the first version (full response then play).
- Placeholder audio: add `/public/audio/placeholder.mp3` for TTS fallback, or the UI will still work without it.

## Architecture (short)

- **App Router** (Next.js 14), TypeScript, Tailwind, Framer Motion.
- **Domain types** in `lib/types.ts`; **TourRepository** calls `GET /api/tours` and `GET /api/tours/[tourId]`.
- **Map:** `MapLoader` loads Google Maps once; `MapView` draws route, POIs, user marker.
- **Geo:** `GeoProvider` (real GPS), `GeoSimProvider` (demo), `GeoTriggerEngine` (geofence logic).
- **Audio:** `AudioSessionManager` (state, narration, answers); **STTRecorder** sends audio to `POST /api/stt`.
- **Controller:** `useTourController(tourId)` ties data, location, triggers, audio, and voice Q&A together.
- **APIs:** tours (list/detail), `/api/qa`, `/api/tts`, `/api/stt`, `/api/tour/generate`.

See `docs/architecture.md` for Mermaid diagrams and sequence flows.
