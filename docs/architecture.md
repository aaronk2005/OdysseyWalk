# Odyssey Walk — Architecture

## Overview

Odyssey Walk is a mobile-first, voice-first audio tour app. The client loads tour data from JSON (or generated via LLM), displays a Google Map with route and POIs, and uses geofencing or demo simulation to trigger narration. Voice Q&A is implemented via press-and-hold STT → OpenRouter LLM → TTS playback.

## Component diagram (Mermaid)

```mermaid
flowchart TB
  subgraph Client
    UI[Pages / Tour UI]
    Map[MapView]
    Player[BottomSheetPlayer]
    Hook[useTourController]
    Repo[TourRepository]
    GeoSim[GeoSimProvider]
    GeoReal[GeoProvider]
    Trigger[GeoTriggerEngine]
    Audio[AudioSessionManager]
    STT[STTRecorder]
  end

  subgraph API
    API_Tours[GET /api/tours]
    API_Tour[GET /api/tours/:id]
    API_QA[POST /api/qa]
    API_TTS[POST /api/tts]
    API_STT[POST /api/stt]
    API_Gen[POST /api/tour/generate]
  end

  subgraph External
    GMaps[Google Maps JS API]
    OpenRouter[OpenRouter LLM]
    GradiumTTS[Gradium TTS]
    GradiumSTT[Gradium STT]
  end

  UI --> Hook
  Hook --> Repo
  Hook --> Map
  Hook --> Player
  Hook --> GeoSim
  Hook --> GeoReal
  Hook --> Trigger
  Hook --> Audio
  Hook --> STT

  Repo --> API_Tours
  Repo --> API_Tour
  Map --> GMaps
  Trigger --> GeoSim
  Trigger --> GeoReal
  Audio --> API_TTS
  STT --> API_STT
  Hook --> API_QA

  API_Tours --> FS[public/tours JSON]
  API_Tour --> FS
  API_QA --> OpenRouter
  API_TTS --> GradiumTTS
  API_STT --> GradiumSTT
  API_Gen --> OpenRouter
```

## Sequence: POI trigger → narration

```mermaid
sequenceDiagram
  participant User
  participant Controller
  participant Geo
  participant Trigger
  participant Audio
  participant API_TTS

  User->>Geo: (moves / demo steps)
  Geo->>Controller: LocationUpdate
  Controller->>Trigger: check(update)
  Trigger-->>Controller: POI_TRIGGER(poiId)
  Controller->>Controller: mark visited, set activePoiId
  Controller->>Audio: playNarration(poiId, script)
  Audio->>API_TTS: POST /api/tts { text }
  API_TTS->>Audio: audio bytes
  Audio->>User: playback
```

## Sequence: Ask Q&A loop

```mermaid
sequenceDiagram
  participant User
  participant UI
  participant STT
  participant API_STT
  participant Controller
  participant API_QA
  participant API_TTS
  participant Audio

  User->>UI: press & hold mic
  UI->>Audio: interruptForListening()
  UI->>STT: start()
  STT->>User: recording…
  User->>UI: release
  UI->>STT: stop()
  STT->>API_STT: POST multipart audio
  API_STT-->>STT: { transcript }
  STT->>Controller: onTranscript(transcript)
  Controller->>API_QA: POST { question, poiId, facts }
  API_QA-->>Controller: { answerText }
  Controller->>API_TTS: POST { text: answerText }
  API_TTS-->>Controller: audio bytes
  Controller->>Audio: playAnswerStream(answerText)
  Audio->>User: playback
```

## Key files

| Layer        | Files |
|-------------|--------|
| Types       | `lib/types.ts` |
| Data        | `lib/data/TourRepository.ts` |
| Maps        | `lib/maps/MapLoader.ts`, `polyline.ts`, `haversine.ts` |
| Geo         | `lib/geo/GeoProvider.ts`, `GeoSimProvider.ts`, `GeoTriggerEngine.ts` |
| Audio/Voice | `lib/audio/AudioSessionManager.ts`, `lib/voice/STTRecorder.ts` |
| UI          | `components/MapView.tsx`, `BottomSheetPlayer.tsx`, `TourCard.tsx`, etc. |
| Controller  | `hooks/useTourController.ts` |
| API         | `app/api/tours/`, `app/api/qa/`, `app/api/tts/`, `app/api/stt/`, `app/api/tour/generate/` |

## Secrets

- **Client:** only `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`.
- **Server:** `OPENROUTER_API_KEY`, `GRADIUM_API_KEY`, `GRADIUM_TTS_URL`, `GRADIUM_STT_URL`.
