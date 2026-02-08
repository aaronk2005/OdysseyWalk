# Prompt: STT Transcript Display Feature

## Goal
Show the user the speech-to-text transcript after they release the mic, so they can confirm that what they said was correctly captured and sent to the Q&A pipeline.

## Context
- **Flow:** User holds mic → speaks → releases → audio uploaded to `/api/stt` → transcript returned → sent to `/api/qa` → answer played.
- **Why it helps:**
  1. **Confidence:** User sees that their speech was recognized before the answer plays.
  2. **Debugging:** If the answer seems wrong, they can check whether the transcript was misheard.
  3. **Accessibility:** Users who prefer text can verify the system understood them.

## Implementation Checklist

### 1. VoiceController callbacks
- [ ] Add `onTranscriptReceived?: (transcript: string) => void` to `VoiceControllerCallbacks`.
- [ ] In `startRecording()`, call `onTranscriptReceived?.(transcript)` right after receiving a non-empty transcript from STT (before `runVoiceQaLoop`).

### 2. Active tour page
- [ ] Add state: `const [lastTranscript, setLastTranscript] = useState<string | null>(null)`.
- [ ] Pass `onTranscriptReceived: (t) => setLastTranscript(t)` into `startRecording()`.
- [ ] Clear transcript on new recording: `setLastTranscript(null)` in `handleAskStart`.
- [ ] Pass `lastTranscript` to `VoiceBar`.

### 3. VoiceBar UI
- [ ] Add prop: `lastTranscript?: string | null`.
- [ ] When `lastTranscript` is set, show a small card/banner below the mic:
  - Label: "You said:"
  - Quote the transcript in quotation marks.
  - Use muted styling so it doesn’t dominate the UI.
- [ ] Animate appearance (e.g. fade/slide in) for a smooth UX.

### 4. Behavior
- [ ] Transcript appears after mic release and before/during "Thinking…".
- [ ] Transcript stays visible during "Speaking…" (answer playback).
- [ ] Transcript clears when the user starts a new recording.

## Design Notes
- Keep the transcript block compact (e.g. `max-w-full`, `break-words`).
- Consider truncation for very long transcripts (e.g. max 2–3 lines with ellipsis).
- Ensure the transcript doesn’t overlap or cover critical UI (mic, "Say next" button).

## Acceptance Criteria
- [ ] User holds mic, speaks "When was this building built?", releases.
- [ ] Shortly after release, a box appears with: "You said:" and "When was this building built?"
- [ ] The transcript remains visible while the answer plays.
- [ ] On the next hold-and-speak, the previous transcript is cleared and replaced with the new one (or cleared until the new one arrives).
