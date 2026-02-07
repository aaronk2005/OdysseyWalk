# Odyssey Walk — Integration Contracts

**This document defines the API contracts between frontend and backend. Treat this as the source of truth.**

---

## Overview

The app has 4 main API endpoints:
1. **POST /api/tour/generate** (Owner: Person 3) — Generate walking tour with LLM
2. **POST /api/qa** (Owner: Person 3) — Answer user questions with LLM
3. **POST /api/stt** (Owner: Person 2) — Transcribe audio to text
4. **POST /api/tts** (Owner: Person 2) — Convert text to speech audio

All endpoints:
- Accept JSON (except STT uses multipart form data)
- Return JSON for errors
- Include rate limiting (30 requests per minute per IP)
- Use standard HTTP status codes

---

## POST /api/tour/generate

### Purpose
Generate a walking tour with route, POIs, and narration scripts using OpenRouter LLM.

### Request

**Method**: `POST`  
**Content-Type**: `application/json`

**Body**:
```json
{
  "start": {
    "lat": 37.7749,
    "lng": -122.4194,
    "label": "Union Square, San Francisco"
  },
  "theme": "history",
  "durationMin": 30,
  "lang": "en",
  "voiceStyle": "friendly"
}
```

**Fields**:
- `start.lat` (number, required): Starting latitude
- `start.lng` (number, required): Starting longitude
- `start.label` (string, optional): Human-readable location name
- `theme` (string, required): One of `"history"`, `"food"`, `"campus"`, `"spooky"`, `"art"`
- `durationMin` (number, optional, default: 30): Tour duration in minutes (15-90)
- `lang` (string, optional, default: "en"): Language code (`"en"` or `"fr"`)
- `voiceStyle` (string, optional, default: "friendly"): One of `"friendly"`, `"historian"`, `"funny"`

### Success Response

**Status**: `200 OK`  
**Content-Type**: `application/json`

**Body**:
```json
{
  "sessionId": "session-1234567890",
  "tourPlan": {
    "intro": "Welcome to your 30-minute history tour of Union Square...",
    "outro": "Thanks for exploring with us. We hope you enjoyed the tour.",
    "theme": "history",
    "estimatedMinutes": 30,
    "distanceMeters": 2400,
    "routePoints": [
      { "lat": 37.7749, "lng": -122.4194 },
      { "lat": 37.7760, "lng": -122.4180 },
      { "lat": 37.7755, "lng": -122.4165 },
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
      "script": "This plaza was established in 1850 and served as the city's main gathering place... [90-140 words total]",
      "facts": [
        "Built in 1850",
        "Original cobblestones preserved",
        "Site of first city hall",
        "Hosted major civic events"
      ],
      "orderIndex": 0
    },
    {
      "poiId": "poi-2",
      "name": "Old Library",
      "lat": 37.7755,
      "lng": -122.4165,
      "radiusM": 35,
      "script": "The original library building was constructed in 1887... [90-140 words]",
      "facts": [
        "Opened 1887",
        "Carnegie library grant",
        "Survived 1906 earthquake"
      ],
      "orderIndex": 1
    }
  ]
}
```

**Fields**:
- `sessionId` (string): Unique session identifier (generate with `"session-" + Date.now()`)
- `tourPlan.intro` (string): Welcome narration script (30-60 words)
- `tourPlan.outro` (string): Closing narration script (20-40 words)
- `tourPlan.theme` (string): Echo of request theme
- `tourPlan.estimatedMinutes` (number): Estimated tour duration
- `tourPlan.distanceMeters` (number, optional): Total walking distance in meters
- `tourPlan.routePoints` (array): Ordered list of lat/lng points forming a loop (start → POIs → start)
- `pois` (array): 5-8 points of interest
  - `poiId` (string): Unique POI identifier (e.g., "poi-1")
  - `name` (string): Display name
  - `lat` (number): Latitude
  - `lng` (number): Longitude
  - `radiusM` (number): Trigger radius in meters (typically 35)
  - `script` (string): Narration script (90-140 words)
  - `facts` (array of strings): 3-5 factual points for Q&A grounding
  - `orderIndex` (number): Order in tour (0-indexed)

### Error Responses

#### 400 Bad Request
```json
{
  "error": {
    "code": "INVALID_REQUEST",
    "message": "start with lat, lng, label required",
    "details": null
  }
}
```

#### 429 Too Many Requests
```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests",
    "details": null
  }
}
```
**Headers**: `Retry-After: 45` (seconds)

#### 503 Service Unavailable
```json
{
  "error": {
    "code": "LLM_UNAVAILABLE",
    "message": "OpenRouter not configured or rate limited",
    "details": "Set OPENROUTER_API_KEY in .env"
  }
}
```

#### 502 Bad Gateway
```json
{
  "error": {
    "code": "INVALID_JSON",
    "message": "Invalid JSON from model",
    "details": "LLM returned non-JSON response after retry"
  }
}
```

### Timeouts & Retries

- **Timeout**: 15 seconds
- **Retries**: 1 retry if JSON parsing fails (append "ONLY OUTPUT JSON" to prompt)
- **Client behavior**: Show loading spinner; after 15s show error toast with retry button

### Client Fallback

On error:
1. Show error toast: `"Tour generation failed: [error.message]"`
2. Offer "Retry" button
3. **Fallback**: Load pre-baked tour from `/public/tours/fallback.json` (client-side)
4. Allow user to proceed with fallback tour

---

## POST /api/qa

### Purpose
Answer user questions grounded in current POI context using OpenRouter LLM.

### Request

**Method**: `POST`  
**Content-Type**: `application/json`

**Body**:
```json
{
  "sessionId": "session-1234567890",
  "poiId": "poi-1",
  "questionText": "When was this plaza built?",
  "context": {
    "currentPoiScript": "This plaza was established in 1850 and served as the city's main gathering place...",
    "tourIntro": "Welcome to your 30-minute history tour of Union Square...",
    "theme": "history"
  }
}
```

**Fields**:
- `sessionId` (string, required): Session identifier from `/api/tour/generate`
- `poiId` (string, required): Current POI identifier
- `questionText` (string, required): User's question (from STT or typed input)
- `context.currentPoiScript` (string, required): Full narration script of current POI
- `context.tourIntro` (string, optional): Tour introduction for additional context
- `context.theme` (string, optional): Tour theme

### Success Response

**Status**: `200 OK`  
**Content-Type**: `application/json`

**Body**:
```json
{
  "answerText": "According to the tour, this plaza was established in 1850 and features original cobblestones from that era."
}
```

**Fields**:
- `answerText` (string): Grounded answer (2-3 sentences, max 100 words)

### Error Responses

#### 503 Service Unavailable (with fallback answer)
```json
{
  "error": {
    "code": "QA_UNAVAILABLE",
    "message": "OpenRouter not available",
    "details": null
  },
  "answerText": "Based on this stop: This plaza was established in 1850 and served as the city's main gathering place..."
}
```

**Note**: Even on error, `answerText` is provided (fallback to first 80 chars of POI script).

### Timeouts & Retries

- **Timeout**: 10 seconds
- **Retries**: 1 retry on network error
- **Client behavior**: Show "Thinking..." state; after 10s use fallback answer from error response

### Client Fallback

On error:
1. Extract `answerText` from error response (always present)
2. Display answer text in bottom sheet
3. Attempt TTS playback with fallback answer
4. If TTS also fails, show text-only (no audio)

---

## POST /api/stt

### Purpose
Transcribe audio to text using Gradium STT API.

### Request

**Method**: `POST`  
**Content-Type**: `multipart/form-data`

**Body** (form fields):
- `audio` (File/Blob): Audio recording (webm, wav, or mp3 format)
- `lang` (string, optional, default: "en"): Language code

**Example with curl**:
```bash
curl -X POST http://localhost:3000/api/stt \
  -F "audio=@recording.webm" \
  -F "lang=en"
```

**Example with fetch**:
```javascript
const formData = new FormData();
formData.append('audio', audioBlob, 'recording.webm');
formData.append('lang', 'en');

const response = await fetch('/api/stt', {
  method: 'POST',
  body: formData
});
```

### Success Response

**Status**: `200 OK`  
**Content-Type**: `application/json`

**Body**:
```json
{
  "transcript": "When was this building constructed?"
}
```

**Fields**:
- `transcript` (string): Transcribed text from audio

### Error Responses

#### 400 Bad Request
```json
{
  "error": {
    "code": "INVALID_REQUEST",
    "message": "Missing audio file",
    "details": null
  },
  "transcript": ""
}
```

#### 503 Service Unavailable
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

### Timeouts & Retries

- **Timeout**: 8 seconds
- **Retries**: 1 retry on network error
- **Client behavior**: Show "Listening..." state; after 8s fall back to typed question modal

### Client Fallback

On error or empty transcript:
1. Hide "Listening..." state
2. Show `<AskTextModal>` (typed question input)
3. User types question manually
4. Proceed with `/api/qa` using typed text

---

## POST /api/tts

### Purpose
Convert text to speech audio using Gradium TTS API.

### Request

**Method**: `POST`  
**Content-Type**: `application/json`

**Body**:
```json
{
  "text": "Welcome to your tour. We'll visit five historic stops in the next 30 minutes.",
  "lang": "en",
  "voiceStyle": "friendly",
  "purpose": "intro",
  "returnBase64": false
}
```

**Fields**:
- `text` (string, required): Text to synthesize (max 5000 chars)
- `lang` (string, optional, default: "en"): Language code (`"en"` or `"fr"`)
- `voiceStyle` (string, optional, default: "friendly"): One of `"friendly"`, `"historian"`, `"funny"`
- `purpose` (string, optional, default: "poi"): One of `"intro"`, `"poi"`, `"answer"`, `"outro"` (for caching)
- `returnBase64` (boolean, optional, default: false): If true, return audio as base64 JSON; else return raw bytes

### Success Response (Raw Audio)

**Status**: `200 OK`  
**Content-Type**: `audio/mpeg`  
**Headers**:
- `Cache-Control: public, max-age=86400`
- `X-RateLimit-Limit: 30`
- `X-RateLimit-Remaining: 27`

**Body**: Raw audio bytes (MP3)

### Success Response (Base64)

**Status**: `200 OK`  
**Content-Type**: `application/json`

**Body**:
```json
{
  "audioBase64": "SUQzBAAAAAAAI1RTU0UAAAA...",
  "mimeType": "audio/mpeg",
  "durationMs": 12000
}
```

**Fields**:
- `audioBase64` (string): Base64-encoded audio
- `mimeType` (string): MIME type (`"audio/mpeg"`)
- `durationMs` (number, optional): Estimated duration in milliseconds

### Error Responses

#### 400 Bad Request
```json
{
  "error": {
    "code": "INVALID_REQUEST",
    "message": "Missing text",
    "details": null
  }
}
```

#### 503 Service Unavailable
```json
{
  "error": {
    "code": "TTS_UNAVAILABLE",
    "message": "Gradium TTS failed",
    "details": "Provider returned 500"
  }
}
```

### Timeouts & Retries

- **Timeout**: 6 seconds
- **Retries**: 1 retry on network error
- **Client behavior**: Show loading state; after 6s fall back to text display

### Client Fallback

On error:
1. Display text answer in bottom sheet (no audio)
2. Attempt to play `/public/audio/placeholder.mp3` (silent/short audio)
3. If placeholder missing, show text-only

### Client Playback

**For raw bytes**:
```javascript
const response = await fetch('/api/tts', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ text, lang, voiceStyle, purpose })
});
const blob = await response.blob();
const audioUrl = URL.createObjectURL(blob);
const audio = new Audio(audioUrl);
await audio.play();
```

**For base64**:
```javascript
const response = await fetch('/api/tts', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ text, lang, voiceStyle, purpose, returnBase64: true })
});
const { audioBase64, mimeType } = await response.json();
const blob = new Blob([Uint8Array.from(atob(audioBase64), c => c.charCodeAt(0))], { type: mimeType });
const audioUrl = URL.createObjectURL(blob);
const audio = new Audio(audioUrl);
await audio.play();
```

---

## Client Expectations

### Status Codes

- **200**: Success (proceed with response data)
- **400**: Invalid request (show error toast, don't retry)
- **429**: Rate limited (show toast: "Too many requests. Try again in [Retry-After] seconds.")
- **500**: Server error (show toast, offer retry)
- **502**: Bad Gateway / LLM error (show toast, offer retry or fallback)
- **503**: Service unavailable (show toast, use fallback immediately)

### Timeouts

| Endpoint | Timeout | Client Action on Timeout |
|----------|---------|--------------------------|
| `/api/tour/generate` | 15s | Show error toast with retry button |
| `/api/qa` | 10s | Use fallback answer from error response |
| `/api/stt` | 8s | Show typed question modal |
| `/api/tts` | 6s | Display text answer without audio |

### Retries

- **Auto-retry**: Network errors (once)
- **Manual retry**: User-triggered via button (unlimited)
- **No retry**: 400 (bad request), 429 (rate limit)

### Toasts vs Blocking Errors

**Show toast (non-blocking)**:
- Rate limit exceeded (429)
- Service temporarily unavailable (503)
- LLM timeout or invalid response (502)

**Show blocking error** (prevent user from proceeding):
- Invalid request (400) — fix required before retry
- Critical config missing (e.g., all API keys missing) — show setup instructions

### Loading States

- **Generate tour**: Show spinner on "Generate My Tour" button; disable button; display "Generating tour..."
- **Q&A**: Show "Listening..." → "Thinking..." → "Speaking..." states in bottom sheet
- **Audio playback**: Show audio progress bar; animate mic button pulse

---

## Mock Mode (Local Testing Without API Keys)

### Purpose
Allow local development and testing without real Gradium or OpenRouter API keys.

### Setup

Add to `.env.local`:
```
MOCK_GRADIUM=true
MOCK_OPENROUTER=true
```

### Mock Responses

#### POST /api/tour/generate (mock)
Returns hardcoded tour from `/public/tours/fallback.json` with user's start location.

#### POST /api/qa (mock)
Returns:
```json
{
  "answerText": "[Mock answer] Based on the current POI, the answer is in the script provided."
}
```

#### POST /api/stt (mock)
Returns:
```json
{
  "transcript": "[mock] What is this place?"
}
```

#### POST /api/tts (mock)
Returns 1-second silent MP3 (hardcoded base64 string).

### Usage

1. Set `MOCK_GRADIUM=true` and `MOCK_OPENROUTER=true`
2. Start dev server: `npm run dev`
3. App works fully without external API calls
4. Use for UI development and integration testing

---

## Rate Limiting

All endpoints implement the same rate limit:
- **Limit**: 30 requests per minute per IP address
- **Window**: 60 seconds (sliding)
- **Response**: 429 Too Many Requests
- **Headers**:
  - `X-RateLimit-Limit: 30`
  - `X-RateLimit-Remaining: 12`
  - `X-RateLimit-Reset: 1699999999` (Unix timestamp)
  - `Retry-After: 45` (seconds until reset)

### Client Handling

On 429 response:
1. Parse `Retry-After` header
2. Show toast: "Rate limit exceeded. Please wait [Retry-After] seconds."
3. Disable relevant buttons for [Retry-After] seconds
4. Auto-enable after wait period

---

## Health Endpoint

### GET /api/health

**Purpose**: Check API configuration status (for debugging and smoke tests).

**Request**: `GET /api/health`

**Response** (200 OK):
```json
{
  "ok": true,
  "mapsKeyPresent": true,
  "openRouterConfigured": true,
  "gradiumConfigured": false
}
```

**Fields**:
- `ok` (boolean): Overall health (true if at least one service configured)
- `mapsKeyPresent` (boolean): `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` is set
- `openRouterConfigured` (boolean): `OPENROUTER_API_KEY` is set
- `gradiumConfigured` (boolean): `GRADIUM_API_KEY`, `GRADIUM_TTS_URL`, `GRADIUM_STT_URL` all set

**Usage**:
- Open `/api/health` before demo to verify config
- Debug panel can fetch and display status with green/red indicators

---

## Error Format (Standard)

All API errors follow this structure:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": "Optional additional context or null"
  }
}
```

**Error Codes**:
- `INVALID_REQUEST`: Missing or malformed request fields (400)
- `RATE_LIMIT_EXCEEDED`: Too many requests (429)
- `LLM_UNAVAILABLE`: OpenRouter not configured or failed (503)
- `INVALID_JSON`: LLM returned non-JSON response (502)
- `QA_UNAVAILABLE`: OpenRouter failed for Q&A (503)
- `STT_UNAVAILABLE`: Gradium STT not configured or failed (503)
- `TTS_UNAVAILABLE`: Gradium TTS not configured or failed (503)

---

## Testing Checklist

Before integrating with frontend, verify each endpoint works with curl:

- [ ] `POST /api/tour/generate` returns valid JSON with 5-8 POIs
- [ ] `POST /api/qa` returns grounded answer (2-3 sentences)
- [ ] `POST /api/stt` returns transcript from audio file
- [ ] `POST /api/tts` returns playable MP3 audio
- [ ] `GET /api/health` returns config status
- [ ] All endpoints return 429 after 30 requests in 60s
- [ ] All endpoints timeout correctly (test with slow network)
- [ ] Mock mode works without API keys

---

## Notes

- **Versioning**: If breaking changes are needed, version the API (`/api/v2/...`)
- **Logging**: Log all API calls with request ID for debugging
- **Security**: Never expose API keys in client code; all sensitive keys are server-only
- **CORS**: Not needed (same-origin); if deploying separately, configure CORS headers

---

**Last updated**: 2026-02-07
