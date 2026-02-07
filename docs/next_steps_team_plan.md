# Odyssey Walk — Team Execution Plan

## Critical Demo Success Criteria

These items **must never break** during judging:

1. ✅ `/demo` scripted demo runs successfully without any API keys (fallback tour + placeholder audio)
2. ✅ Map renders with route polyline + POI markers on `/create` and `/tour/active`
3. ✅ "Generate Tour" on `/create` returns valid JSON with 5–8 POIs and shows route on map
4. ✅ Clicking "Start Walk" navigates to `/tour/active` and plays intro narration (TTS or fallback text)
5. ✅ Demo mode simulated movement triggers at least 2 POI narrations automatically
6. ✅ Bottom sheet player shows current POI, progress (X of Y stops), and audio controls
7. ✅ Press-and-hold mic captures audio OR falls back to typed question modal if STT unavailable
8. ✅ Q&A flow completes: question → answer text → TTS playback (or text fallback)
9. ✅ Completion screen shows after last POI with visited stops + "Generate Another" button
10. ✅ No console errors that crash the app; graceful degradation for missing API keys
11. ✅ Mobile-responsive UI (iPhone/Android viewport); bottom sheet doesn't cover map
12. ✅ `/api/health` endpoint returns config status for quick debugging

---

## System Overview

**Odyssey Walk** is a voice-first walking tour app. Users select a start location on Google Maps, and the backend generates a walking route with 5–8 POIs using OpenRouter (LLM). When the user starts the walk, GPS or simulated movement triggers automatic TTS narration at each stop via Gradium. Users can press-and-hold a mic button to ask questions; audio is transcribed (Gradium STT), answered by OpenRouter with grounding in the current POI's script, and spoken back via Gradium TTS. The app supports demo mode with simulated movement and manual POI jumps for testing without GPS permissions.

---

## Integration Contracts

### POST /api/tour/generate (Owner: Person 3)

**Purpose**: Generate a walking tour with route + POIs + narration scripts.

**Request** (JSON):
```json
{
  "start": {
    "lat": 37.7749,
    "lng": -122.4194,
    "label": "Union Square, SF"
  },
  "theme": "history",
  "durationMin": 30,
  "lang": "en",
  "voiceStyle": "friendly"
}
```

**Success Response** (200 OK):
```json
{
  "sessionId": "session-1234567890",
  "tourPlan": {
    "intro": "Welcome to your 30-minute history tour...",
    "outro": "Thanks for exploring with us...",
    "theme": "history",
    "estimatedMinutes": 30,
    "distanceMeters": 2400,
    "routePoints": [
      { "lat": 37.7749, "lng": -122.4194 },
      { "lat": 37.7760, "lng": -122.4180 },
      { "lat": 37.7749, "lng": -122.4194 }
    ]
  },
  "pois": [
    {
      "poiId": "poi-1",
      "name": "Historic Plaza",
      "lat": 37.7760,
      "lng": -122.4180,
      "radiusM": 35,
      "script": "This plaza was established in 1850... [90-140 words]",
      "facts": [
        "Built in 1850",
        "Original cobblestones preserved",
        "Site of first city hall"
      ],
      "orderIndex": 0
    }
  ]
}
```

**Error Response** (503/500):
```json
{
  "error": {
    "code": "LLM_UNAVAILABLE",
    "message": "OpenRouter not configured or rate limited",
    "details": "Set OPENROUTER_API_KEY in .env"
  }
}
```

**Timeouts**: Max 15 seconds; client should show loading spinner and error toast after 15s.

**Client Fallback**:
- On error: show error toast, allow user to retry or load a fallback demo tour from `/public/tours/sample.json`
- On timeout: show "Generation taking longer than expected" with retry button

---

### POST /api/qa (Owner: Person 3)

**Purpose**: Answer user questions grounded in current POI context.

**Request** (JSON):
```json
{
  "sessionId": "session-1234567890",
  "poiId": "poi-1",
  "questionText": "When was this built?",
  "context": {
    "currentPoiScript": "This plaza was established in 1850...",
    "tourIntro": "Welcome to your history tour...",
    "theme": "history"
  }
}
```

**Success Response** (200 OK):
```json
{
  "answerText": "According to the tour, this plaza was established in 1850 and features original cobblestones from that era."
}
```

**Error Response** (503/500):
```json
{
  "error": {
    "code": "QA_UNAVAILABLE",
    "message": "OpenRouter not available",
    "details": null
  },
  "answerText": "I'm having trouble connecting right now. Please check the POI description for more info."
}
```

**Timeouts**: Max 10 seconds.

**Client Fallback**:
- On error: display fallback answer text from error response; play via TTS or show text-only
- Always complete the Q&A flow gracefully (never leave user hanging)

---

### POST /api/stt (Owner: Person 2)

**Purpose**: Transcribe audio to text using Gradium STT.

**Request** (multipart/form-data):
```
audio: [File/Blob] (webm, wav, mp3)
lang: "en"
```

**Success Response** (200 OK):
```json
{
  "transcript": "When was this building constructed?"
}
```

**Error Response** (503/500):
```json
{
  "error": {
    "code": "STT_UNAVAILABLE",
    "message": "Gradium STT not configured or failed",
    "details": "Check GRADIUM_API_KEY and GRADIUM_STT_URL"
  },
  "transcript": ""
}
```

**Timeouts**: Max 8 seconds.

**Client Fallback**:
- On error or empty transcript: show typed question modal (`<AskTextModal>`)
- User types question manually; proceed with Q&A flow

---

### POST /api/tts (Owner: Person 2)

**Purpose**: Convert text to speech using Gradium TTS.

**Request** (JSON):
```json
{
  "text": "Welcome to your tour. We'll visit five historic stops...",
  "lang": "en",
  "voiceStyle": "friendly",
  "purpose": "intro",
  "returnBase64": false
}
```

**Success Response** (200 OK, audio/mpeg):
```
[Raw audio bytes]
Headers:
  Content-Type: audio/mpeg
  Cache-Control: public, max-age=86400
```

**Or with `returnBase64: true`** (200 OK, application/json):
```json
{
  "audioBase64": "SUQzBAAAAAAAI1RTU0UAAAA...",
  "mimeType": "audio/mpeg",
  "durationMs": 12000
}
```

**Error Response** (503/500):
```json
{
  "error": {
    "code": "TTS_UNAVAILABLE",
    "message": "Gradium TTS failed",
    "details": "Provider returned 500"
  }
}
```

**Timeouts**: Max 6 seconds.

**Client Fallback**:
- On error: display text answer in bottom sheet; play local placeholder audio (`/public/audio/placeholder.mp3`) or silent
- Cache successful TTS responses in memory by hash(text + lang + voiceStyle + purpose)

---

## Person 1: UI + Maps + Client Orchestration

### Overview
You own the entire **client-side experience**: Google Maps integration, all pages (`/`, `/create`, `/tour/active`, `/tour/complete`, `/demo`), bottom sheet player, settings drawer, debug panel, geofence trigger wiring, and client state management. The voice/AI backends are "black box" endpoints owned by Person 2 and Person 3.

---

### Deliverable 1: `/create` Page (Map + Search + Generate)

**Files**:
- `app/create/page.tsx` ✅ (already scaffolded)
- `components/MapView.tsx` ✅
- `components/PlaceSearchBox.tsx` ✅
- `components/TourGenerationPanel.tsx` ✅

**Tasks**:
- [ ] Implement Google Maps with click-to-set-start
  - [ ] Wire `onMapClick` in `MapView` to set start location
  - [ ] Show green pin at selected start location
  - [ ] Display "Dropped pin" or geocoded label below search box
- [ ] Implement Places Autocomplete in `PlaceSearchBox`
  - [ ] On place select, update map center + start location
  - [ ] Show "Selected: [place name]" confirmation
- [ ] Build `TourGenerationPanel` UI
  - [ ] Theme selector (history, food, campus, spooky, art)
  - [ ] Duration slider (15–60 min)
  - [ ] Language toggle (en/fr)
  - [ ] Voice style selector (friendly, historian, funny)
  - [ ] "Generate My Tour" button with loading spinner
- [ ] Wire generate flow
  - [ ] On button click: `POST /api/tour/generate` with preferences
  - [ ] Show loading state (disable button, show spinner)
  - [ ] On success: `saveTour(sessionId, response)` from `SessionStore`
  - [ ] Render route polyline + POI markers on map
  - [ ] Show "Start Walk" button
  - [ ] On error: show toast with error message + retry button
- [ ] Handle missing maps key
  - [ ] If `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` missing: show placeholder with setup instructions
  - [ ] Allow generate to work without map (text-only mode)

**Acceptance Criteria**:
- Map loads with search bar and click-to-pin working
- Generate request sends correct JSON to backend
- Route + POIs render on map after successful generate
- Error toast appears on generate failure with retry option
- "Start Walk" navigates to `/tour/active`

**Test Steps**:
1. Open `/create`
2. Click map → green pin appears with "Dropped pin" label
3. Type "Union Square SF" in search → select from autocomplete → pin moves
4. Select theme "history", duration 30min, lang "en", voice "friendly"
5. Click "Generate My Tour" → spinner shows for 2-5s
6. Route polyline + 5-8 blue markers appear
7. Click "Start Walk" → navigate to `/tour/active`

---

### Deliverable 2: `/tour/active` Page (Map + Player + Controls)

**Files**:
- `app/tour/active/page.tsx` ✅
- `components/BottomSheetPlayer.tsx` ✅
- `components/MapView.tsx` ✅
- `components/DemoModeBanner.tsx` ✅
- `hooks/useActiveTour.ts` ✅

**Tasks**:
- [ ] Load session from `SessionStore.loadTour()`
  - [ ] If no session: redirect to `/create`
  - [ ] Display session theme in header (e.g. "History Walk")
- [ ] Render full-screen map with route + POIs
  - [ ] Show polyline from `session.tourPlan.routePoints`
  - [ ] Render POI markers: blue (unvisited), gray (visited), purple (active)
  - [ ] Show green user location marker that updates in real-time
  - [ ] Implement "follow camera" toggle (pan map to user location)
- [ ] Wire "Start Walk" button (before intro plays)
  - [ ] On click: call `useActiveTour().startWalk()`
  - [ ] Play intro narration via `AudioSessionManager.playIntro()`
  - [ ] Start geo provider (real or demo based on `session.mode`)
  - [ ] Set `introPlayed = true` to show bottom sheet player
- [ ] Integrate `GeoTriggerEngine`
  - [ ] Subscribe to location updates from `GeoProvider` or `GeoSimProvider`
  - [ ] On `POI_TRIGGER` event: mark POI visited, play POI script
  - [ ] Update progress bar and "X of Y stops" counter
  - [ ] On last POI: play outro → navigate to `/tour/complete`
- [ ] Build `BottomSheetPlayer` UI
  - [ ] Collapsed state: current POI name, progress bar, play/pause button
  - [ ] Expanded state: POI script text, mic button, skip/replay controls
  - [ ] Show "Next: [POI name]" and estimated distance
  - [ ] Press-and-hold mic button triggers recording
- [ ] Wire audio controls
  - [ ] Play/Pause: `AudioSessionManager.pause()` / `.resume()`
  - [ ] Skip: `jumpNext()` (teleport to next POI in demo mode)
  - [ ] Replay: `AudioSessionManager.playPoiScript(currentPoi)`
- [ ] Implement press-and-hold mic flow (owned by you for UI; STT/TTS are Person 2's endpoints)
  - [ ] On mouse/touch down: start recording via `startRecording()`
  - [ ] Show "Listening..." state in bottom sheet
  - [ ] On release: stop recording, send audio to `/api/stt`
  - [ ] On STT success: send transcript to `/api/qa`
  - [ ] On Q&A success: play answer via `/api/tts`
  - [ ] On STT failure: show typed question modal
  - [ ] Show "Thinking..." and "Speaking..." states

**Acceptance Criteria**:
- Map shows route + user location + POI markers with correct colors
- "Start Walk" plays intro and starts geo tracking
- POI trigger automatically plays narration when user enters radius
- Bottom sheet shows current POI, progress, and audio controls work
- Mic button records and completes Q&A flow (or falls back to typed question)
- Last POI triggers outro and navigates to `/tour/complete`

**Test Steps**:
1. Generate tour on `/create` → click "Start Walk"
2. `/tour/active` loads with map + route + "Start Walk" button
3. Click "Start Walk" → intro narration plays
4. In demo mode: click "Next stop" → teleport to POI1 → narration plays
5. Bottom sheet shows "Stop 1 of 7", current POI name, audio playing
6. Press and hold mic → "Listening..." → release → "Thinking..." → answer plays
7. Click skip → teleport to POI2
8. Reach last POI → outro plays → redirect to `/tour/complete`

---

### Deliverable 3: Settings Drawer + Debug Panel

**Files**:
- `components/SettingsDrawer.tsx` ✅
- `components/DebugPanel.tsx` ✅

**Tasks**:
- [ ] Build `SettingsDrawer` UI (slide-in from right)
  - [ ] Demo mode toggle: switch between "real" and "demo" geo providers
  - [ ] Voice style selector: friendly, historian, funny
  - [ ] Language toggle: en, fr
  - [ ] Follow camera toggle: enable/disable map panning to user location
  - [ ] Close button (X)
- [ ] Wire settings state
  - [ ] Read from `session.mode` for demo toggle
  - [ ] On toggle: `updateSession({ mode: "demo" })` and refresh geo provider
  - [ ] Voice/lang changes: call `AudioSessionManager.setOptions()`
- [ ] Build `DebugPanel` (bottom-left expandable button)
  - [ ] Show/hide on Bug icon click
  - [ ] Display current lat/lng
  - [ ] Display audio state (IDLE, NARRATING, etc.)
  - [ ] API status indicators: fetch `/api/health` on mount
    - Green: Maps key present, OpenRouter configured, Gradium configured
    - Red: Missing
  - [ ] "Jump to POI" buttons for each POI (teleport in demo mode)
  - [ ] "Play next POI" button (force trigger)
  - [ ] "Clear audio cache" button
  - [ ] Last error display (from failed API calls)

**Acceptance Criteria**:
- Settings icon in header opens drawer with all controls
- Demo mode toggle switches geo provider immediately
- Debug panel shows API status (green/red) and works in demo mode
- "Jump to POI" teleports user and triggers narration

**Test Steps**:
1. On `/tour/active`, click Settings (gear icon)
2. Toggle demo mode → banner appears, "Next stop" button shows
3. Change voice style to "historian" → next narration uses new style
4. Click Bug icon (bottom-left) → debug panel expands
5. See API status: Maps (green), OpenRouter (green), Gradium (red if missing)
6. Click "Jump to POI 3" → teleport + narration plays
7. Click "Clear audio cache" → cache size resets

---

### Deliverable 4: Demo Mode + Simulated Movement

**Files**:
- `lib/geo/GeoSimProvider.ts` ✅
- `components/DemoModeBanner.tsx` ✅
- `app/demo/page.tsx` ✅

**Tasks**:
- [ ] Ensure `GeoSimProvider` works
  - [ ] `setRoute(routePoints)` initializes path
  - [ ] `start()` begins simulated movement along path (speed: 1 update/2s)
  - [ ] `jumpToPoi(poiId)` teleports to POI coordinates
  - [ ] Emits location updates every 2s
- [ ] Wire demo mode in `useActiveTour`
  - [ ] If `session.mode === "demo"`: use `GeoSimProvider`
  - [ ] If `session.mode === "real"`: use `GeoProvider`
  - [ ] On permission denied: auto-switch to demo mode
- [ ] Build `DemoModeBanner` (top of active page)
  - [ ] Show "Demo mode: simulated movement"
  - [ ] "Next stop" button: calls `jumpNext()`
  - [ ] "Run 90s Demo" link: navigates to `/demo`
- [ ] Build `/demo` scripted demo page
  - [ ] Hardcoded 2-POI tour with short scripts
  - [ ] "Run 90s Demo" button
  - [ ] Flow: intro (skip) → POI1 script 6s → sample Q&A → answer 5s → POI2 script 6s → done
  - [ ] No mic required; all automated

**Acceptance Criteria**:
- Demo mode banner appears when `session.mode === "demo"`
- "Next stop" teleports to next unvisited POI and triggers narration
- `/demo` runs full scripted flow without user interaction
- Permission denied on real mode auto-switches to demo

**Test Steps**:
1. Generate tour → start walk → deny location permission
2. Demo mode banner appears with "Next stop" button
3. Click "Next stop" → teleport to POI1 → narration plays
4. Navigate to `/demo` from banner link
5. Click "Run 90s Demo" → see progress: "Playing stop 1..." → "Sample Q&A..." → "Playing stop 2..." → "Done."

---

### Deliverable 5: Completion Screen

**Files**:
- `app/tour/complete/page.tsx` ✅
- `components/CompletionSummary.tsx` ✅

**Tasks**:
- [ ] Load session from `SessionStore.loadTour()`
  - [ ] If no `endedAt`, set it now
  - [ ] Calculate duration from `startedAt` to `endedAt`
- [ ] Render `CompletionSummary`
  - [ ] Show checkmark icon + "Tour completed"
  - [ ] Display: stops visited (X of Y), approx. time, distance (if available)
  - [ ] List visited POI names with checkmarks
  - [ ] "Save Tour" button: persist to `localStorage` key `odyssey-saved-tours`
  - [ ] "Generate Another" link: navigate to `/create`

**Acceptance Criteria**:
- Completion screen shows summary after last POI outro
- "Save Tour" persists session to localStorage
- "Generate Another" redirects to `/create`

**Test Steps**:
1. Complete a tour (reach last POI)
2. `/tour/complete` shows "Tour completed" with stats
3. See "5 of 7 stops visited", "32 min"
4. Click "Save Tour" → toast confirms save
5. Click "Generate Another" → navigate to `/create`

---

### Merge Strategy (Person 1)
- **Owns folders**: `/app` (pages), `/components`, `/hooks`, `/lib/geo`, `/lib/maps`
- **Merge early**: commit UI skeleton (pages + components) to `main` after Phase 1
- **Merge frequently**: push working map + generate flow after Phase 2
- **Integration point**: Phase 3 (after Person 2/3 endpoints are ready)

---

## Person 2: Voice Stack (Gradium STT + TTS)

### Overview
You own the **voice input/output pipeline**: `/api/stt` and `/api/tts` endpoints, plus client-side audio playback helpers. Your job is to make voice in/out reliable with robust fallbacks. Person 1 will call your endpoints as black boxes; Person 3 will use your TTS endpoint to play answers.

---

### Deliverable 1: `/api/stt` Endpoint

**Files**:
- `app/api/stt/route.ts` ✅
- `lib/net/fetchWithTimeout.ts` ✅
- `lib/rateLimit.ts` ✅

**Tasks**:
- [ ] Implement `POST /api/stt`
  - [ ] Accept multipart form data: `audio` (File/Blob), `lang` (string)
  - [ ] Extract audio blob from `req.formData()`
  - [ ] Forward to Gradium STT API at `process.env.GRADIUM_STT_URL`
  - [ ] Include `Authorization: Bearer ${process.env.GRADIUM_API_KEY}` header
  - [ ] Parse Gradium response for transcript field (could be `.text`, `.transcript`, or `.transcription`)
  - [ ] Return `{ transcript: string }`
- [ ] Add error handling
  - [ ] If Gradium API fails: return 503 with `{ error: {...}, transcript: "" }`
  - [ ] If audio missing: return 400 with `{ error: "Missing audio file" }`
  - [ ] Catch network errors and return 500
- [ ] Implement timeout (8 seconds) with `fetchWithTimeout`
  - [ ] Use `lib/net/fetchWithTimeout.ts` helper
  - [ ] Set `timeoutMs: 8000, retries: 1`
- [ ] Add rate limiting
  - [ ] Use `rateLimit(ip, "/api/stt")` from `lib/rateLimit.ts`
  - [ ] Return 429 if limit exceeded (30 requests per minute per IP)
- [ ] Test with curl
  - [ ] `curl -X POST http://localhost:3000/api/stt -F "audio=@test.webm" -F "lang=en"`
  - [ ] Verify transcript returned

**Acceptance Criteria**:
- Endpoint accepts audio and returns transcript
- Timeout after 8s returns error response
- Rate limit triggers after 30 requests in 60s
- Graceful error responses with standard error format

**Test Steps**:
1. Record 5-second audio in browser (`STTRecorder`)
2. Send to `/api/stt` via client
3. Verify transcript returned in <8s
4. Disconnect network → verify 503 error with empty transcript
5. Send 31 requests in 60s → verify 429 response

**curl Test**:
```bash
# Test STT with sample audio
curl -X POST http://localhost:3000/api/stt \
  -F "audio=@sample.webm" \
  -F "lang=en"

# Expected:
# {"transcript":"When was this building constructed?"}
```

---

### Deliverable 2: `/api/tts` Endpoint

**Files**:
- `app/api/tts/route.ts` ✅
- `lib/net/fetchWithTimeout.ts` ✅
- `lib/rateLimit.ts` ✅

**Tasks**:
- [ ] Implement `POST /api/tts`
  - [ ] Accept JSON: `{ text, lang, voiceStyle, purpose, returnBase64 }`
  - [ ] Forward to Gradium TTS API at `process.env.GRADIUM_TTS_URL`
  - [ ] Include `Authorization: Bearer ${process.env.GRADIUM_API_KEY}` header
  - [ ] Map `voiceStyle` to Gradium voice parameter (e.g., "historian" → "narrator")
  - [ ] Receive audio bytes (mp3) from Gradium
  - [ ] If `returnBase64: true`: convert to base64 and return JSON `{ audioBase64, mimeType }`
  - [ ] Else: return raw bytes with `Content-Type: audio/mpeg` header
- [ ] Add error handling
  - [ ] If Gradium API fails: return 503 with `{ error: {...} }`
  - [ ] If text missing: return 400 with `{ error: "Missing text" }`
  - [ ] Catch network errors and return 500
- [ ] Implement timeout (6 seconds) with `fetchWithTimeout`
  - [ ] Use `lib/net/fetchWithTimeout.ts` helper
  - [ ] Set `timeoutMs: 6000, retries: 1`
- [ ] Add rate limiting
  - [ ] Use `rateLimit(ip, "/api/tts")` from `lib/rateLimit.ts`
  - [ ] Return 429 if limit exceeded
- [ ] Add cache headers
  - [ ] `Cache-Control: public, max-age=86400` for audio responses
- [ ] Test with curl
  - [ ] `curl -X POST http://localhost:3000/api/tts -H "Content-Type: application/json" -d '{"text":"Hello","lang":"en","voiceStyle":"friendly","purpose":"intro"}' --output test.mp3`
  - [ ] Verify audio file playable

**Acceptance Criteria**:
- Endpoint accepts text and returns audio (bytes or base64)
- Timeout after 6s returns error response
- Rate limit works
- Audio is playable in browser
- Cache headers set for performance

**Test Steps**:
1. Call `/api/tts` with text "Welcome to your tour"
2. Receive audio bytes in <6s
3. Play audio in browser → hear TTS voice
4. Call with `returnBase64: true` → receive base64 string
5. Disconnect Gradium → verify 503 error

**curl Test**:
```bash
# Test TTS with text
curl -X POST http://localhost:3000/api/tts \
  -H "Content-Type: application/json" \
  -d '{"text":"Welcome to your history tour","lang":"en","voiceStyle":"friendly","purpose":"intro","returnBase64":false}' \
  --output intro.mp3

# Play audio
# open intro.mp3  (macOS) or start intro.mp3 (Windows)
```

---

### Deliverable 3: Client Audio Playback Helpers

**Files**:
- `lib/audio/AudioSessionManager.ts` ✅
- `lib/voice/STTRecorder.ts` ✅

**Tasks**:
- [ ] Verify `AudioSessionManager` works
  - [ ] `playIntro(text)`: calls `/api/tts` → plays audio
  - [ ] `playPoiScript(poi)`: calls `/api/tts` with poi.script → plays
  - [ ] `playAnswer(text)`: calls `/api/tts` → plays
  - [ ] `playOutro(text)`: calls `/api/tts` → plays
  - [ ] Cache TTS responses in memory by hash(text + lang + voiceStyle + purpose)
  - [ ] Prewarm intro + first POI script on tour load
- [ ] Handle TTS failures gracefully
  - [ ] If `/api/tts` returns 503: display text in UI + play `/public/audio/placeholder.mp3` (silent)
  - [ ] Never block the UI waiting for audio
- [ ] Implement `STTRecorder` for mic capture
  - [ ] Use `MediaRecorder` API to capture audio
  - [ ] Record in `audio/webm` format
  - [ ] On stop: upload blob to `/api/stt`
  - [ ] Return transcript to caller
- [ ] Handle STT failures gracefully
  - [ ] If `/api/stt` returns 503 or empty transcript: trigger typed question modal
  - [ ] Never lose user's question intent

**Acceptance Criteria**:
- Audio playback works for all purposes (intro, poi, answer, outro)
- TTS cache avoids redundant API calls
- Fallback to text display + placeholder audio on TTS failure
- STT fallback to typed question modal on failure

**Test Steps**:
1. Load tour → intro plays via TTS
2. Reach POI1 → narration plays via TTS
3. Disconnect network → reach POI2 → text shown + silent/placeholder plays
4. Press mic → record 3s → STT transcribes
5. Disconnect network → press mic → typed question modal appears

---

### Deliverable 4: Fallback Strategy Documentation

**Files**:
- `docs/voice_fallback_strategy.md` (create)

**Tasks**:
- [ ] Document all failure modes and fallbacks
  - [ ] STT unavailable → typed question modal
  - [ ] TTS unavailable → text display + placeholder audio
  - [ ] Gradium API down → use fallback responses from `/api/qa` and `/api/tts` error responses
  - [ ] Mic permission denied → only typed questions available
- [ ] Add env var check at startup
  - [ ] If `GRADIUM_API_KEY` missing: log warning, enable fallback mode
  - [ ] Show banner in UI: "Voice unavailable; using text fallback"
- [ ] Create mock mode for local testing without Gradium keys
  - [ ] If `process.env.MOCK_GRADIUM === "true"`:
    - `/api/stt` returns `{ transcript: "[mock] " + filename }`
    - `/api/tts` returns 1-second silent mp3 (base64 hardcoded)

**Acceptance Criteria**:
- Documentation covers all fallback scenarios
- Mock mode allows testing without real API keys
- UI degrades gracefully when voice unavailable

---

### Merge Strategy (Person 2)
- **Owns folders**: `/app/api/stt`, `/app/api/tts`, `/lib/audio`, `/lib/voice`
- **Merge early**: Push `/api/stt` and `/api/tts` stubs (return mock data) after Phase 1
- **Merge working**: Push fully integrated endpoints after Gradium credentials are confirmed
- **Integration point**: Phase 3 (Person 1 needs TTS for narration; Person 3 needs TTS for answers)

---

## Person 3: AI + Backend Flow (OpenRouter + Tour + Q&A + Session)

### Overview
You own the **AI-powered backend**: `/api/tour/generate` and `/api/qa`, plus session management strategy. Your job is to make tour generation and Q&A reliable, safe, and grounded. You also define the session storage approach (client localStorage or server-side sessions).

---

### Deliverable 1: `/api/tour/generate` Endpoint

**Files**:
- `app/api/tour/generate/route.ts` ✅
- `lib/net/fetchWithTimeout.ts` ✅
- `lib/rateLimit.ts` ✅

**Tasks**:
- [ ] Implement `POST /api/tour/generate`
  - [ ] Accept JSON: `{ start: { lat, lng, label }, theme, durationMin, lang, voiceStyle }`
  - [ ] Validate input: start lat/lng required, theme in allowed list
  - [ ] Build system prompt for OpenRouter:
    - "You are a tour plan generator. Output ONLY valid JSON (no markdown, no code fence)."
    - "Structure: { intro, outro, pois: [{ name, lat, lng, script, facts }] }"
    - "Generate 5-8 POIs in a walking loop from start. Scripts: 90-140 words. Facts: 3-5 items."
    - "Keep content safe and plausible. Do not claim precise facts unless general knowledge."
  - [ ] Call OpenRouter `openai/gpt-4o-mini` with system + user prompt
  - [ ] Parse JSON response (strip markdown code fences if present)
  - [ ] If JSON invalid: retry once with "ONLY OUTPUT JSON" appended to prompt
  - [ ] Build `GeneratedTourResponse`:
    - `sessionId`: generate unique ID (e.g., `"session-" + Date.now()`)
    - `tourPlan`: extract intro, outro, theme, estimatedMinutes; build `routePoints` from start + POI coords + return to start
    - `pois`: map LLM output to POI array with `poiId`, `orderIndex`, `radiusM: 35`
  - [ ] Handle POI coordinates:
    - If LLM returns small numbers (e.g. 0.002): treat as offset from start (lat + 0.002)
    - If LLM returns absolute coords (e.g. 37.78): use as-is
  - [ ] Return JSON response
- [ ] Add error handling
  - [ ] If OpenRouter API fails: return 503 with `{ error: { code: "LLM_UNAVAILABLE", ... } }`
  - [ ] If JSON parsing fails after retry: return 502 with `{ error: { code: "INVALID_JSON", ... } }`
  - [ ] Catch network errors and return 500
- [ ] Implement timeout (15 seconds) with `fetchWithTimeout`
  - [ ] Use `lib/net/fetchWithTimeout.ts` helper
  - [ ] Set `timeoutMs: 15000, retries: 1`
- [ ] Add rate limiting
  - [ ] Use `rateLimit(ip, "/api/tour/generate")` from `lib/rateLimit.ts`
  - [ ] Return 429 if limit exceeded
- [ ] Test with curl
  - [ ] `curl -X POST http://localhost:3000/api/tour/generate -H "Content-Type: application/json" -d '{"start":{"lat":37.7749,"lng":-122.4194,"label":"SF"},"theme":"history","durationMin":30,"lang":"en","voiceStyle":"friendly"}'`
  - [ ] Verify valid JSON response with 5-8 POIs

**Acceptance Criteria**:
- Endpoint returns valid JSON matching `GeneratedTourResponse` schema
- Retry logic handles invalid JSON from LLM
- POI coordinates are reasonable (within ~0.01 degrees of start)
- Timeout and rate limit work
- Error responses follow standard format

**Test Steps**:
1. Call `/api/tour/generate` with valid request
2. Receive response in <15s with 5-8 POIs
3. Verify `routePoints` forms a loop (start → POIs → start)
4. Verify POI scripts are 90-140 words
5. Disconnect OpenRouter → verify 503 error
6. Send invalid request (missing start) → verify 400 error

**curl Test**:
```bash
# Test tour generation
curl -X POST http://localhost:3000/api/tour/generate \
  -H "Content-Type: application/json" \
  -d '{
    "start": {"lat": 37.7749, "lng": -122.4194, "label": "Union Square, SF"},
    "theme": "history",
    "durationMin": 30,
    "lang": "en",
    "voiceStyle": "friendly"
  }'

# Expected: JSON with sessionId, tourPlan, pois array
```

---

### Deliverable 2: `/api/qa` Endpoint

**Files**:
- `app/api/qa/route.ts` ✅
- `lib/net/fetchWithTimeout.ts` ✅
- `lib/rateLimit.ts` ✅

**Tasks**:
- [ ] Implement `POST /api/qa`
  - [ ] Accept JSON: `{ sessionId, poiId, questionText, context: { currentPoiScript, tourIntro, theme } }`
  - [ ] Validate input: questionText required
  - [ ] Build system prompt for OpenRouter:
    - "You are a friendly tour guide. Answer in 2-3 short sentences."
    - "Use only the provided context. If uncertain, say so."
    - "Theme: [theme]"
    - "Tour intro: [intro]"
    - "Current stop script: [script]"
  - [ ] Call OpenRouter `openai/gpt-4o-mini` with system + user (questionText) prompt
  - [ ] Parse response for answer text
  - [ ] Return `{ answerText: string }`
- [ ] Add error handling
  - [ ] If OpenRouter API fails: return 503 with `{ error: {...}, answerText: "[fallback answer]" }`
  - [ ] Fallback answer: "Based on this stop: [first 80 chars of script]..."
  - [ ] Never return empty answerText; always provide something usable
- [ ] Implement timeout (10 seconds) with `fetchWithTimeout`
  - [ ] Use `lib/net/fetchWithTimeout.ts` helper
  - [ ] Set `timeoutMs: 10000, retries: 1`
- [ ] Add rate limiting
  - [ ] Use `rateLimit(ip, "/api/qa")` from `lib/rateLimit.ts`
  - [ ] Return 429 if limit exceeded
- [ ] Test with curl
  - [ ] `curl -X POST http://localhost:3000/api/qa -H "Content-Type: application/json" -d '{"sessionId":"test","poiId":"poi-1","questionText":"When was it built?","context":{"currentPoiScript":"This plaza was built in 1850...","tourIntro":"Welcome","theme":"history"}}'`
  - [ ] Verify answer text returned

**Acceptance Criteria**:
- Endpoint returns grounded answers in 2-3 sentences
- Answers based on provided context (script + facts)
- Fallback answer always returned on error
- Timeout and rate limit work

**Test Steps**:
1. Call `/api/qa` with question "When was this built?" and POI context
2. Receive answer in <10s referencing the POI script
3. Ask unrelated question → receive "I don't have that information" or grounded redirect
4. Disconnect OpenRouter → receive fallback answer from error response
5. Verify fallback answer is still useful (references script)

**curl Test**:
```bash
# Test Q&A
curl -X POST http://localhost:3000/api/qa \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "session-123",
    "poiId": "poi-1",
    "questionText": "What year was this built?",
    "context": {
      "currentPoiScript": "This historic plaza was established in 1850 and features original cobblestones...",
      "tourIntro": "Welcome to your history tour",
      "theme": "history"
    }
  }'

# Expected: {"answerText":"According to the tour, this plaza was established in 1850."}
```

---

### Deliverable 3: Session Management Strategy

**Files**:
- `lib/data/SessionStore.ts` ✅

**Tasks**:
- [ ] Define session storage approach (choose one):
  - **Option A (recommended)**: Client-side only with localStorage
    - `saveTour(sessionId, response)`: store in `localStorage` key `odyssey-active-session`
    - `loadTour()`: read from localStorage
    - `updateSession(partial)`: merge updates
    - `clearTour()`: remove from localStorage
  - **Option B**: Server-side sessions with in-memory Map
    - Store sessions in `Map<sessionId, SessionState>` on server
    - Expire sessions after 24 hours
    - Require sessionId in all requests
- [ ] Implement `SessionStore` module (already scaffolded for Option A)
  - [ ] `saveTour()`: serialize to JSON and save
  - [ ] `loadTour()`: parse JSON from localStorage
  - [ ] `updateSession()`: merge partial updates (e.g., `visitedPoiIds`, `activePoiId`)
  - [ ] Handle localStorage quota errors gracefully
- [ ] Document session lifecycle
  - [ ] Create: on successful `/api/tour/generate` response
  - [ ] Update: on POI trigger, Q&A completion, settings change
  - [ ] End: on last POI completion (`endedAt` set)
  - [ ] Save: on "Save Tour" button (copy to `odyssey-saved-tours` array)
  - [ ] Clear: on "Generate Another" or logout

**Acceptance Criteria**:
- Sessions persist across page refreshes
- Session updates are immediate (no stale data)
- Storage errors handled gracefully (fallback to memory-only)

**Test Steps**:
1. Generate tour → verify session saved to localStorage
2. Refresh page → verify tour loads from localStorage
3. Reach POI → verify `visitedPoiIds` updated
4. Complete tour → verify `endedAt` set
5. Click "Save Tour" → verify tour copied to `odyssey-saved-tours`

---

### Deliverable 4: Fallback Tour Generation

**Files**:
- `public/tours/fallback.json` (create)
- `app/api/tour/generate/route.ts` ✅

**Tasks**:
- [ ] Create fallback tour JSON
  - [ ] Hardcoded tour with 5 POIs near SF (or generic city)
  - [ ] Includes intro, outro, POI scripts, facts
  - [ ] Same schema as `GeneratedTourResponse`
- [ ] Wire fallback in `/api/tour/generate`
  - [ ] If OpenRouter API fails: load `/public/tours/fallback.json`
  - [ ] Replace `start` coordinates with user's start location (offset POIs)
  - [ ] Return fallback tour with 200 status + warning header `X-Fallback: true`
  - [ ] Log fallback usage for monitoring
- [ ] Test fallback flow
  - [ ] Disconnect OpenRouter
  - [ ] Call `/api/tour/generate`
  - [ ] Verify fallback tour returned

**Acceptance Criteria**:
- Fallback tour always available (no dependencies on external APIs)
- Fallback tour quality is good enough for demo
- Header indicates fallback was used

**Test Steps**:
1. Unset `OPENROUTER_API_KEY`
2. Call `/api/tour/generate`
3. Verify fallback tour returned with `X-Fallback: true` header
4. Verify POIs are near user's start location

---

### Deliverable 5: Prompt Engineering Documentation

**Files**:
- `docs/openrouter_prompts.md` (create)

**Tasks**:
- [ ] Document tour generation prompt template
  - [ ] System prompt with JSON schema requirements
  - [ ] User prompt with start location + preferences
  - [ ] Safety guidelines (no precise facts, no hallucinated data)
  - [ ] Example output
- [ ] Document Q&A prompt template
  - [ ] System prompt with grounding instructions
  - [ ] User prompt (question)
  - [ ] Example exchanges
- [ ] Document model selection rationale
  - [ ] Why `openai/gpt-4o-mini` (fast, cost-effective, good for structured output)
  - [ ] Fallback models if primary unavailable
- [ ] Add prompt iteration notes
  - [ ] What prompts failed
  - [ ] What constraints improved output quality

**Acceptance Criteria**:
- Prompts are versioned and documented
- Team can iterate on prompts without code changes (if prompts stored in config)

---

### Merge Strategy (Person 3)
- **Owns folders**: `/app/api/tour`, `/app/api/qa`, `/lib/data`, `/public/tours`
- **Merge early**: Push `/api/tour/generate` stub (mock response) after Phase 1
- **Merge working**: Push fully integrated endpoint after OpenRouter credentials are confirmed
- **Integration point**: Phase 2 (Person 1 needs generate to work; Person 2 needs Q&A for answer flow)

---

## Timeline & Merge Strategy

### Phase 1: Contracts + Health + Skeleton (Day 1 morning)

**Goal**: All three developers can work in parallel with stable contracts.

**Person 1**:
- [ ] Create page skeletons: `/`, `/create`, `/tour/active`, `/tour/complete`, `/demo`
- [ ] Add component stubs: `MapView`, `BottomSheetPlayer`, `PlaceSearchBox`, etc.
- [ ] Wire `MapLoader` to load Google Maps script

**Person 2**:
- [ ] Create `/api/stt` stub that returns `{ transcript: "[mock] question" }`
- [ ] Create `/api/tts` stub that returns 1-second silent mp3 (base64 hardcoded)
- [ ] Implement `fetchWithTimeout` and `rateLimit` helpers

**Person 3**:
- [ ] Create `/api/tour/generate` stub that returns hardcoded tour from `/public/tours/fallback.json`
- [ ] Create `/api/qa` stub that returns `{ answerText: "This is a mock answer." }`
- [ ] Implement `SessionStore` with localStorage

**All**:
- [ ] Create `/api/health` endpoint that checks env vars
- [ ] Merge all stubs to `main` branch
- [ ] Test end-to-end flow with mock data

**Merge checkpoint**: All stubs merged; `/demo` page works without API keys.

---

### Phase 2: Tour Generation + Route Rendering (Day 1 afternoon)

**Goal**: User can generate a tour and see it on the map.

**Person 1**:
- [ ] Wire `/create` page to call `/api/tour/generate`
- [ ] Render route polyline + POI markers on map
- [ ] Add "Start Walk" button that navigates to `/tour/active`

**Person 3**:
- [ ] Integrate OpenRouter into `/api/tour/generate`
- [ ] Implement JSON parsing with retry logic
- [ ] Test with real API key; verify 5-8 POIs returned

**Person 2**:
- [ ] (waiting) Test TTS endpoint with Gradium credentials when available

**Merge checkpoint**: Generate + render route works.

---

### Phase 3: POI Trigger + Narration (Day 2 morning)

**Goal**: User reaches POI → narration plays automatically.

**Person 1**:
- [ ] Wire `GeoTriggerEngine` on `/tour/active`
- [ ] Subscribe to location updates (real or demo)
- [ ] On POI trigger: update session, play narration
- [ ] Display progress in bottom sheet

**Person 2**:
- [ ] Integrate Gradium into `/api/tts`
- [ ] Test TTS playback with real audio
- [ ] Implement cache in `AudioSessionManager`

**Person 3**:
- [ ] (support) Ensure sessionId and POI data structure stable

**Merge checkpoint**: POI trigger + TTS narration works.

---

### Phase 4: Q&A Loop (Day 2 afternoon)

**Goal**: User presses mic → asks question → hears answer.

**Person 1**:
- [ ] Wire mic button to record audio
- [ ] Send audio to `/api/stt`
- [ ] Send transcript to `/api/qa`
- [ ] Send answer to `/api/tts` and play

**Person 2**:
- [ ] Integrate Gradium into `/api/stt`
- [ ] Test STT with real audio recording
- [ ] Implement typed question fallback

**Person 3**:
- [ ] Integrate OpenRouter into `/api/qa`
- [ ] Test grounded answers with POI context
- [ ] Implement fallback answer on error

**Merge checkpoint**: Full Q&A loop works with voice or typed question.

---

### Phase 5: Demo Mode + Polish + QA (Day 3)

**Goal**: Demo mode works flawlessly; UI polished; all fallbacks tested.

**Person 1**:
- [ ] Wire demo mode banner + simulated movement
- [ ] Build settings drawer + debug panel
- [ ] Test all UI interactions on mobile viewport
- [ ] Add loading states and error toasts

**Person 2**:
- [ ] Test all voice fallbacks (STT → typed, TTS → text)
- [ ] Ensure audio playback is smooth (no stuttering)
- [ ] Document voice troubleshooting

**Person 3**:
- [ ] Test fallback tour generation
- [ ] Verify session persistence across page refreshes
- [ ] Document all API failure modes

**All**:
- [ ] Run full QA checklist (see `demo_checklist.md`)
- [ ] Fix critical bugs
- [ ] Prepare demo script

**Merge checkpoint**: Final build ready for submission.

---

## Definition of Done (Pre-Submission Checklist)

Before submitting, **all** of these must pass:

- [ ] **Build succeeds**: `npm run build` completes without errors
- [ ] **Health endpoint works**: `GET /api/health` returns green status for configured APIs
- [ ] **Generate tour works**: `/create` → generate → route + POIs render on map
- [ ] **Start walk works**: Click "Start Walk" → intro plays → active page loads
- [ ] **POI trigger works**: Reach POI (or jump in demo mode) → narration plays
- [ ] **Progress updates**: Bottom sheet shows "Stop X of Y" and updates correctly
- [ ] **Q&A voice works**: Press mic → record → answer plays (or typed fallback if STT fails)
- [ ] **Q&A typed fallback**: If STT unavailable, typed question modal appears and works
- [ ] **TTS fallback**: If TTS unavailable, text answer displays (no crash)
- [ ] **Completion screen**: Last POI → outro → `/tour/complete` with summary
- [ ] **Demo mode**: Toggle demo → simulated movement + "Next stop" button work
- [ ] **90s demo works**: `/demo` runs full scripted flow without user interaction
- [ ] **Mobile responsive**: UI works on iPhone/Android viewport (bottom sheet doesn't obscure map)
- [ ] **No console errors**: No unhandled exceptions during normal flow
- [ ] **Graceful degradation**: Missing API keys → fallback tour + typed questions + text answers
- [ ] **Settings persist**: Change voice style in settings → next narration uses new style
- [ ] **Debug panel works**: API status indicators correct; "Jump to POI" works in demo mode
- [ ] **Toast notifications**: Errors show as toasts (not alerts)
- [ ] **All endpoints rate-limited**: 429 responses returned after limit exceeded
- [ ] **Documentation complete**: README + demo checklist + integration contracts finalized

---

## Notes

- **Communication**: Use Slack/Discord for quick questions; GitHub PRs for code review
- **Merge conflicts**: Person 1 owns `/app` and `/components`; Person 2 owns `/app/api/stt` and `/app/api/tts`; Person 3 owns `/app/api/tour` and `/app/api/qa`
- **Testing**: Each person tests their own endpoints with curl before integration
- **Demo prep**: Run full demo checklist 1 hour before judging; fix critical bugs only
- **Backup plan**: If Gradium unavailable, use typed questions + text answers (no voice)
