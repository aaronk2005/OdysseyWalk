# Odyssey Walk — QA Checklist

Use this checklist before demos and releases. Check off each item as verified.

---

## Setup validation

- [ ] **Env vars**
  - [ ] `.env.local` exists (copy from `.env.example`)
  - [ ] `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` set (required for map; app works without for demo)
  - [ ] `OPENROUTER_API_KEY` set (for Q&A and tour generation)
  - [ ] `GRADIUM_API_KEY`, `GRADIUM_TTS_URL`, `GRADIUM_STT_URL` set (for TTS/STT)
- [ ] **Health**
  - [ ] `npm install` completes
  - [ ] `npm run dev` starts; open http://localhost:3000
  - [ ] GET `/api/health` returns `{ ok: true, mapsKeyPresent, openRouterConfigured, gradiumConfigured }`
- [ ] **No secrets client-side**
  - [ ] Search codebase for `OPENROUTER_API_KEY`, `GRADIUM_API_KEY` — only in server (API routes / lib used only on server)

---

## Manual test cases — Happy path

- [ ] **Landing**
  - [ ] Hero loads; "Explore Tours" and "Try Demo" work
  - [ ] Feature cards visible
- [ ] **Tours list**
  - [ ] GET `/api/tours` returns at least sample + spooky
  - [ ] Tour cards show name, city, duration, stops
  - [ ] Click card → navigates to `/tour/[tourId]`
- [ ] **Tour page (demo mode)**
  - [ ] Map loads (or friendly "no map key" message)
  - [ ] Route polyline and POI markers visible
  - [ ] Bottom sheet: Play → first POI narration plays
  - [ ] Skip next → next POI narration
  - [ ] Replay → same POI narration again
  - [ ] Progress bar reflects visited count
- [ ] **Voice Q&A (if keys set)**
  - [ ] Hold mic → "Listening…" → release → transcript → "Thinking…" → answer plays
  - [ ] Narration pauses while listening/answering
- [ ] **Create tour**
  - [ ] Set theme, duration → "Generate Tour" → tour + POIs returned
  - [ ] "Save & Open" → navigates to new tour; tour plays

---

## Manual test cases — Edge cases

- [ ] **Missing maps key**
  - [ ] Unset `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` → banner or message; demo/non-map mode still works
- [ ] **Tour load failure**
  - [ ] Invalid tourId → error screen with "Back to tours" and "Try demo tour"
- [ ] **TTS failure**
  - [ ] Disable TTS or bad key → fallback: text + "Try audio again" or placeholder
- [ ] **STT failure**
  - [ ] Deny mic or bad STT → text input fallback; submit → QA still works
- [ ] **LLM failure**
  - [ ] Bad OpenRouter key → canned answer from POI facts
- [ ] **Rate limit**
  - [ ] Rapid /api/qa or /api/tts calls → 429 with friendly message

---

## Demo script steps (judge run)

1. [ ] Open http://localhost:3000
2. [ ] Click "Explore Tours" → see tour cards
3. [ ] Click "Downtown Heritage Walk" (or first card)
4. [ ] Confirm map + route + markers; demo badge visible
5. [ ] Tap "Play" in bottom sheet → hear first stop narration
6. [ ] Tap "Skip next" → hear second stop
7. [ ] (Optional) Hold mic → ask "When was it built?" → hear answer
8. [ ] Open Settings → toggle Demo off/on; change voice style
9. [ ] Open Debug → "Play next POI" → "Jump to POI" for any stop
10. [ ] Go to /demo → "Run 90-second demo" → script runs without permissions

---

## Fallback verification

- [ ] **Maps key missing:** Banner shown; POI list + audio still work (non-map mode)
- [ ] **TTS down:** Narration text shown; "Try audio again" or placeholder
- [ ] **STT down:** Text input modal; typed question → QA
- [ ] **OpenRouter down:** Answer = 2–3 POI facts joined
- [ ] **Geo permission denied:** Auto-switch to demo mode (or clear message)

---

## Performance quick checks

- [ ] **First load:** LCP < 3s on fast 3G
- [ ] **Map:** No repeated script load; single map instance
- [ ] **Audio:** No memory leak (play 5+ narrations; check heap)
- [ ] **Toasts:** Repeated same message deduped

---

## Sign-off

- **Date:** _______________
- **Tester:** _______________
- **Build:** `npm run build` passed: [ ]
