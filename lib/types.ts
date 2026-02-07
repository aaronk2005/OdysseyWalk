// ─────────────────────────────────────────────────────────────────────────────
// Odyssey Walk — Core domain types
// ─────────────────────────────────────────────────────────────────────────────

export interface LatLng {
  lat: number;
  lng: number;
}

export interface LocationUpdate {
  lat: number;
  lng: number;
  accuracy?: number;
  speed?: number;
  timestamp: number;
}

export type VoiceStyle = "friendly" | "historian" | "funny";
export type Lang = "en" | "fr";

export interface TourSummary {
  tourId: string;
  name: string;
  city: string;
  estimatedMinutes: number;
  poiCount: number;
  thumbnailUrl: string;
  tags: string[];
}

export interface POI {
  poiId: string;
  tourId: string;
  name: string;
  lat: number;
  lng: number;
  radiusM: number;
  scripts: Partial<Record<VoiceStyle, string>>;
  facts: string[];
  placeId?: string;
  scriptVersion: number;
}

export interface Tour {
  tourId: string;
  name: string;
  city: string;
  polyline?: string;
  routePoints?: LatLng[];
  poiIds: string[];
  defaultVoiceStyle: VoiceStyle;
  defaultLang: Lang;
  estimatedMinutes: number;
  tags: string[];
}

export interface SessionState {
  sessionId?: string;
  tourId: string;
  visitedPoiIds: string[];
  activePoiId: string | null;
  currentIdx: number;
  nextPoiId: string | null;
  mode: "real" | "demo";
}

export enum AudioState {
  IDLE = "IDLE",
  NAVIGATING = "NAVIGATING",
  NARRATING = "NARRATING",
  LISTENING = "LISTENING",
  ANSWERING = "ANSWERING",
  PAUSED = "PAUSED",
}

export interface TriggerEvent {
  type: "POI_TRIGGER";
  poiId: string;
  distM: number;
  timestamp: number;
}

// API request/response shapes
export interface QAResponse {
  answerText: string;
}

export interface TTSRequest {
  text: string;
  voiceStyle: VoiceStyle;
  lang: Lang;
  format: "mp3";
  stream?: boolean;
}

export interface STTResponse {
  transcript: string;
}

export interface GenerateTourRequest {
  startPlace: { name: string; lat: number; lng: number };
  theme: string;
  durationMin: number;
  pace: "slow" | "normal" | "fast";
  lang: Lang;
  voiceStyle: VoiceStyle;
}

export interface GenerateTourResponse {
  tour: Tour;
  pois: POI[];
}
