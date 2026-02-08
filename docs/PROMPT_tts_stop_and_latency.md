# TTS: Stop Overlapping Audio & Reduce Latency — Implementation Prompt

## Context

OdysseyWalk uses **Gradium TTS** (WebSocket or POST) for intro, POI narration, Q&A answers, and outro. Audio is played in the browser via `AudioSessionManager` (`lib/audio/AudioSessionManager.ts`), which fetches from `/api/tts` and plays the returned WAV (or falls back to browser SpeechSynthesis).

---

## What Was Fixed (Overlapping Audio)

**Bug:** If the user pressed "Start walk" again before the intro finished, or moved to the next stop before the current POI TTS finished, a new TTS request was started but the previous one was not stopped. Both could complete and play, causing jumbled overlapping audio.

**Root cause:**  
- `playIntro` / `playPoiScript` / etc. called `stop()` (which only stops the *currently playing* `HTMLAudioElement`).  
- They then called `playTts()`, which does an **async fetch** to `/api/tts`.  
- If the user triggered another play before the first fetch completed, two `playTts` flows ran in parallel. Whichever called `playUrl()` last overwrote `this.currentAudio`, so the previous `Audio` element was never paused and kept playing.

**Implemented fix:**

1. **Play ID + superseded check**  
   Each new play (intro, POI, answer, outro) gets a unique `currentPlayId`. When `playTts` finishes (cache hit or fetch), it only calls `playUrl()` if `this.currentPlayId` still matches the id captured at the start of that call. So only the **latest** user action results in playback; older in-flight requests no longer play when they complete.

2. **Abort in-flight fetch**  
   When starting a new play or calling `stop()`, the previous TTS fetch is aborted via `AbortController`. The fetch in `fetchAndCacheTts` uses this `signal`; aborted requests don’t call `playUrl`, and the UI doesn’t wait for stale responses.

3. **Stop existing playback in `playUrl`**  
   Before creating and playing a new `Audio`, `playUrl()` now pauses and clears any existing `this.currentAudio`. So even if an older flow somehow reached `playUrl`, only one audio element plays at a time.

4. **`stop()` clears active play**  
   `stop()` sets `currentPlayId = 0` and aborts the in-flight fetch, so any completing `playTts` sees it’s superseded and doesn’t play.

Files changed: `lib/audio/AudioSessionManager.ts` (playId/currentPlayId, fetchAbortController, signal passed to fetch and playTts, and playUrl clearing currentAudio).

---

## Prompt: Reduce TTS Latency / Delay

Use the following as a prompt for implementing lower perceived latency between user actions (e.g. pressing "Start walk" or "Next stop") and hearing TTS.

---

**Prompt:**

We want to reduce the delay between (1) pressing "Start walk" and hearing the intro, and (2) moving to the next destination and hearing that stop’s description. Right now there’s noticeable latency.

**Current flow:**

- **Start walk:** `useActiveTour` calls `AudioSessionManager.prewarm(intro, firstPoiScript)` on load, then when the user taps Start it calls `AudioSessionManager.playIntro(intro)`. If the intro isn’t cached yet, `playTts` fetches from `/api/tts` and only then plays the full WAV. So the user waits for: optional prewarm + full TTS response + playback start.
- **Next stop:** When the user goes to the next POI (or "Next" button), `playPoiScript(poi)` runs. If that POI’s script isn’t in the cache, the user waits for the full `/api/tts` response before playback.

**Requirements:**

1. **Preserve the new TTS stopping behavior**  
   Do not regress the fix that stops previous TTS when the user starts a new play or moves to the next stop. Keep play ID, abort in-flight fetch, and clearing `currentAudio` in `playUrl`.

2. **Reduce time-to-first-audio**  
   - Ensure prewarm for intro (and optionally first POI) is started as early as possible and, if feasible, consider blocking or delaying the visibility of "Start" until intro (and optionally first POI) are cached, so the first tap feels instant.  
   - Optionally explore **streaming TTS**: start playback as soon as the first chunk of audio is available (e.g. first WAV chunk or first segment from the provider), instead of waiting for the full response. This may require:  
     - Backend: streaming response from Gradium (or chunked WAV) and forwarding chunks to the client.  
     - Frontend: use `MediaSource` / `AudioContext` or chunked blob URLs to play the first chunk while the rest is still loading.  
   - Keep or extend prewarm for the next 2–3 POIs so "Next stop" often hits cache.

3. **Keep fallbacks**  
   Preserve behavior when TTS is unavailable: browser SpeechSynthesis and placeholder audio. Ensure abort/superseded logic doesn’t break these paths.

4. **Acceptance criteria**  
   - Pressing "Start walk" multiple times or moving to the next stop while TTS is playing never results in two narrations playing at once.  
   - Perceived delay from "Start" to first intro audio is reduced (e.g. by stronger prewarm and/or streaming).  
   - Perceived delay from "Next stop" to POI narration is reduced (prewarm + optional streaming).

Implement the above in the existing TTS and audio session code without breaking current stop/cancel behavior.

---

## Summary

| Item | Status |
|------|--------|
| Stop previous TTS when starting new play (intro / POI / answer / outro) | ✅ Implemented in `AudioSessionManager` |
| Abort in-flight TTS fetch when starting new play or `stop()` | ✅ Implemented |
| Single active playback (clear `currentAudio` in `playUrl`) | ✅ Implemented |
| Reduce latency (prewarm, optional streaming) | 📋 Use the prompt above |
