# Prompt: STT Push-to-Talk and LLM Q&A Flow

## Goal
Configure and document the flow: **mic → STT → LLM** so that the app listens while the user holds the mic button, transcribes on release, and sends the transcript to the LLM to answer questions about the current tour stop.

## Context
- **Push-to-talk:** User holds the mic button → speech is captured → on release, recording stops, transcript is obtained and sent to the LLM.
- **Two STT paths:**
  1. **Server STT** (when `GRADIUM_STT_WS_URL` or wss `GRADIUM_STT_URL` + `GRADIUM_API_KEY` are set): Record audio with `MediaRecorder`, upload blob to `POST /api/stt`; server converts webm→PCM (via ffmpeg) and runs Gradium STT WebSocket; returns `{ transcript }`.
  2. **Browser STT** (default when server STT is not configured): Use the browser’s `SpeechRecognition` API only. Hold = start recognition, release = stop recognition; final transcript is collected and passed to the Q&A pipeline. No upload.

## Implementation Summary (Done)

### 1. STTRecorder (`lib/voice/STTRecorder.ts`)
- **`start(options?: { useServerStt?: boolean })`**
  - When `useServerStt === false`: use **browser-only** path (`startBrowserRecognitionHoldToTalk`). No `MediaRecorder`, no upload. `SpeechRecognition` with `continuous: true` runs while the button is held; on `stop()`, recognition stops and `onend` delivers the accumulated transcript via `onTranscript` then `onStop`.
  - When `useServerStt === true` (or omitted): existing behavior — `MediaRecorder` → on release upload to `/api/stt` → `onTranscript(transcript)`.
- **Hold-to-talk browser path:** Accumulate final results in `onresult`, then in `onend` call `onTranscript(accumulated.join(' '))` and `onStop`. Empty transcript still triggers `onTranscript('')` so the controller can show “Voice input unavailable” or similar.

### 2. VoiceController (`lib/voice/VoiceController.ts`)
- **`startRecording(callbacks, options?: { useServerStt?: boolean })`**
  - Forwards `options` to `sttRecorder.start(options)`.
  - When transcript is received (from either path), `runVoiceQaLoop(session, question, callbacks)` is called: `POST /api/qa` with `questionText` and tour context, then TTS plays the answer.

### 3. Active tour page (`app/tour/active/page.tsx`)
- Fetches `/api/health` and keeps `apiStatus` (including `gradiumSttConfigured`).
- **`handleAskStart`** calls `startRecording(callbacks, { useServerStt: apiStatus?.gradiumSttConfigured ?? false })`.
  - So: **server STT only when configured**; otherwise **browser SpeechRecognition** (hold-to-talk) so speech is registered without needing a server STT endpoint.

### 4. API status type
- **`ApiStatus`** (e.g. in `DebugPanel`) includes **`gradiumSttConfigured?: boolean`** so the client knows whether to use server or browser STT.
- Health response and page `setApiStatus` include `gradiumSttConfigured`.

## Flow (User Perspective)
1. User **holds** the mic button → UI shows “Listening…”.
2. User **speaks** (e.g. “When was this building built?”).
3. User **releases** the button → recording/recognition stops.
4. Transcript is obtained (browser or server).
5. If transcript is non-empty: “Thinking…” → `POST /api/qa` with question + current POI context → answer is spoken via TTS (“Speaking…”).
6. If transcript is empty: “Voice input unavailable” (or similar) and return to idle.

## Configuration

### Browser STT (default, no server config)
- **Leave `GRADIUM_STT_URL` unset** (or leave it empty in `.env.example`).
- The app uses the browser’s SpeechRecognition (Chrome, Edge, Safari). Works with **hold-to-talk** out of the box.

### Server STT (optional)
- Set **`GRADIUM_API_KEY`** and **`GRADIUM_STT_WS_URL`** (e.g. `wss://us.api.gradium.ai/api/speech/asr`). The app uses Gradium’s **WebSocket-only** getSTT stream: it converts uploaded webm to PCM with **ffmpeg** on the server, then sends PCM over the WebSocket and returns the transcript. When server STT is configured, the app records and uploads the blob on release; the server handles the rest.

## Acceptance Criteria
- [x] With **browser STT** (default): Hold mic → speak → release → transcript is sent to LLM and answer plays.
- [x] With **server STT** configured: Same flow using uploaded audio and server transcript.
- [x] Empty transcript (e.g. release without speaking): No LLM call; user sees fallback message and returns to idle.
- [x] LLM receives current POI context and returns an answer; TTS plays it.

## Quick verification
1. Start a tour (Create → Start Walk).
2. Hold the **mic** button, say e.g. “When was this built?”, then release.
3. You should see: Listening… → Thinking… → Speaking… and hear the answer.
4. If you release without speaking: “Voice input unavailable” toast and return to idle.
5. Ensure `OPENROUTER_API_KEY` is set in `.env.local` so `/api/qa` can respond.

## Files Touched
- `lib/voice/STTRecorder.ts` — `start(options)`, browser hold-to-talk path, `finishBrowserHoldToTalk`.
- `lib/voice/VoiceController.ts` — `startRecording(_, options)`, pass-through to `sttRecorder.start(options)`.
- `app/tour/active/page.tsx` — pass `useServerStt: apiStatus?.gradiumSttConfigured ?? false` into `startRecording`.
- `components/DebugPanel.tsx` — `ApiStatus.gradiumSttConfigured`.
- This prompt: `docs/PROMPT_stt_push_to_talk_llm.md`.
