# Prompt: Gradium TTS narration + voice “next” to advance stops

Use this prompt to generate code that:

1. Uses the **Gradium API** (via existing TTS) to **narrate each stop** using the generated itinerary and script text.
2. On **every stop**, lets the user **press a button** to record their mic; uses **Gradium STT**; if they say **“next” or “continue”**, **progress to the next stop**.

The **first stop** narration is already triggered when the user presses the **Start Walk** button (intro plays, then the first stop can play via geo-trigger or manual tap).

---

## Codebase context

- **Stack:** Next.js 14 (App Router), TypeScript. Walking tour app: generate tour → start walk → hear narration at each stop; hold mic for Q&A.
- **Tour data source:** After `POST /api/tour/generate`, the client stores the response in session (e.g. `SessionStore`). The **itinerary at runtime** is:
  - `session.tourPlan.intro` — welcome script (TTS)
  - `session.tourPlan.outro` — closing script (TTS)
  - `session.pois[]` — each POI has `poi.script` (90–140 word narration), `poi.name`, `poi.poiId`, etc.
- **Generated text file:** `app/api/tour/generate/route.ts` also writes a summary to `generated-tours/tour-{theme}-{slug}-{timestamp}.txt` (intro, stops with script snippets, outro). The **primary source for narration text** is the **session** (in-memory); the text file is for reference/export. Use **session.tourPlan** and **session.pois[].script** for TTS.
- **Gradium already wired:**
  - **TTS:** `POST /api/tts` — body `{ text, lang?, voiceStyle?, purpose?, returnBase64? }`. Uses `GRADIUM_API_KEY` and `GRADIUM_TTS_URL`. Returns audio (bytes or base64). Used by `AudioSessionManager` for intro, POI script, answer, outro.
  - **STT:** `POST /api/stt` — FormData with `audio` (File/Blob) and optional `lang`. Uses `GRADIUM_API_KEY` and `GRADIUM_STT_URL`. Returns `{ transcript }`.
- **Active tour page:** `app/tour/active/page.tsx` — uses `useActiveTour()` which provides:
  - `startWalk()` — called when user presses “Start Walk”; plays intro via `AudioSessionManager.playIntro(s.tourPlan.intro)` then sets `introPlayed = true`.
  - `playPoi(poi)` — plays `poi.script` via TTS and updates visited/active state.
  - `jumpNext()` — advances to the next unvisited POI (demo sim) and calls `playPoi(next)`.
- **Audio:** `lib/audio/AudioSessionManager.ts` — `playIntro(text)`, `playPoiScript(poi)`, `playOutro(text)`. It calls `/api/tts` and caches by text/lang/voiceStyle. **Use this for narration;** no new TTS pipeline needed.
- **Voice recording:** `lib/voice/STTRecorder.ts` — records mic, stops after release or timeout, uploads blob to `/api/stt`, returns transcript via callback. `VoiceController.ts` uses it for Q&A (transcript → QA API → TTS answer). You need a **separate flow** for “next/continue” that only interprets the transcript and advances the tour.

---

## Required behavior

### 1. Narrate each stop with Gradium TTS

- **Source of narration text:** Use the **generated itinerary** from the session loaded after tour/generate:
  - **Intro:** `session.tourPlan.intro` — played when the user presses **Start Walk** (already implemented in `startWalk()`).
  - **Each stop:** `session.pois[i].script` (or fallback `poi.scripts?.friendly` etc.). Play via `AudioSessionManager.playPoiScript(poi)` (already used by geo-trigger and manual POI tap).
  - **Outro:** `session.tourPlan.outro` — played after the last stop (already in place).
- **Implementation:** Keep using the existing flow: Start Walk → intro TTS; then for each stop, play that stop’s `poi.script` through the existing TTS pipeline (`/api/tts` → Gradium). No change to TTS API or env vars beyond what’s already there (`GRADIUM_API_KEY`, `GRADIUM_TTS_URL`). Optionally, if you add a “read from file” feature later, the generated text file in `generated-tours/` can be used as fallback or display; the **canonical narration text** is the session’s `tourPlan` and `pois[].script`.

### 2. “Next” / “Continue” by voice on every stop

- **UI:** On the active tour screen (e.g. in `BottomSheetPlayer` or the same area), add a **button** (e.g. “Say next to continue” or “Hold to say Next”) that is visible on **every stop** (including the first stop after Start Walk).
- **Flow:**
  1. User presses (and optionally holds) the button.
  2. App records the microphone (reuse the same pattern as Q&A: e.g. `STTRecorder` or a dedicated short recording that posts to `/api/stt`).
  3. Send the recorded audio to `POST /api/stt` (Gradium STT).
  4. On response, normalize the transcript (e.g. trim, lowercase). If the transcript **contains** or **equals** “next” or “continue”, call the existing **advance-to-next-stop** logic (e.g. `jumpNext()` from `useActiveTour`, which moves to the next POI and plays it). If not, optionally show a short hint (“Say ‘next’ or ‘continue’ to go to the next stop”) or ignore.
- **First stop:** The **first** stop’s narration is already started when the user presses **Start Walk** (intro plays; then either geo-trigger or manual tap plays the first POI). So the “next/continue” button on the first stop should advance to the **second** stop when the user says “next” or “continue”.
- **Last stop:** When the user says “next” or “continue” on the last stop, advance as you already do (play outro, then redirect to complete page).
- **Implementation notes:**
  - Reuse `STTRecorder` (or the same pattern: `getUserMedia` → `MediaRecorder` → FormData to `/api/stt`). You can add a small wrapper or a separate callback path that, instead of sending the transcript to the QA flow, only checks for “next”/“continue” and calls `jumpNext()`.
  - Keep the existing “hold mic for Q&A” behavior; the “next/continue” control should be a **separate** button so the user can either ask a question (hold mic) or advance (press “Say next to continue” and speak).
  - Prefer a **press-to-record** (or hold-to-record) pattern for the “next” button so the user explicitly opts in to recording.

### 3. Environment and API

- **Gradium:** Use existing env: `GRADIUM_API_KEY`, `GRADIUM_TTS_URL`, `GRADIUM_STT_URL`. TTS is already used by `AudioSessionManager`; STT is already used by the Q&A flow. No new env vars required.
- **Text file:** The tour generate API writes `generated-tours/tour-{theme}-{slug}-{timestamp}.txt`. Use **session** (tourPlan + pois) as the source for narration text. The text file can be used for debugging or as optional fallback copy; do not require the client to read that file for playback.

---

## Summary checklist for generated code

- [ ] **Narration:** Use existing TTS path: `session.tourPlan.intro`, `session.pois[].script`, `session.tourPlan.outro` via `AudioSessionManager` (which calls `/api/tts` → Gradium). First stop narration starts when user presses Start Walk (already implemented).
- [ ] **Next/Continue button:** Add a dedicated button on the active tour UI (e.g. in `BottomSheetPlayer` or below it) that starts mic recording and sends audio to `POST /api/stt`.
- [ ] **Interpret transcript:** If transcript (trimmed, case-insensitive) contains or equals “next” or “continue”, call `jumpNext()` (or equivalent) to advance to the next stop and play its narration.
- [ ] **First stop:** Start Walk already plays intro; first POI can play by geo or tap; “next”/“continue” from first stop advances to second POI.
- [ ] **Last stop:** “next”/“continue” on last stop triggers existing “play outro → complete page” flow.
- [ ] **Separation:** Keep “hold mic for Q&A” and “say next to continue” as separate controls so both flows coexist.

---

## Files to touch (suggested)

- `app/tour/active/page.tsx` — ensure Start Walk and advance logic are used; pass any new handler for “next/continue” to the player.
- `components/BottomSheetPlayer.tsx` — add the “Say next to continue” (or “Hold to say Next”) button and wire it to record → STT → check “next”/“continue” → advance.
- `hooks/useActiveTour.ts` — already exposes `jumpNext()`; no change unless you add a dedicated “advance and play next” helper.
- Optionally a small helper or hook (e.g. `useVoiceNext()`) that encapsulates: start record → on transcript → if “next”/“continue” then call `jumpNext()`.

Use the **Gradium API key** and existing **TTS/STT** routes; do not add new API keys or endpoints unless you have a specific reason (e.g. a different STT endpoint for “next” only).
