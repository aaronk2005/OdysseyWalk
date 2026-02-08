// ─────────────────────────────────────────────────────────────────────────────
// Odyssey Walk — Core domain types (product flow source of truth)
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
export type Lang = "en" | "fr" | "es" | "de" | "it" | "ja" | "pt" | "zh";
export type Theme = "history" | "food" | "campus" | "spooky" | "art" | "nature" | "architecture" | "culture";

/** Legacy: for static tour list API if used */
export interface TourSummary {
  tourId: string;
  name: string;
  city: string;
  estimatedMinutes: number;
  poiCount: number;
  thumbnailUrl: string;
  tags: string[];
}

/** Legacy: static tour from JSON (e.g. public/tours) */
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

// ─── Generated Tour (API contract) ───────────────────────────────────────────
export interface GeneratedTourRequest {
  start: { lat: number; lng: number; label: string };
  theme: Theme;
  durationMin: number;
  lang: Lang;
  voiceStyle: VoiceStyle;
}

export interface TourPlan {
  intro: string;
  outro: string;
  theme: string;
  estimatedMinutes: number;
  distanceMeters?: number;
  routePoints: LatLng[];
  /** Date of the tour (e.g. generation date) */
  tourDate?: string;
  /** Voice settings for consistent TTS throughout tour */
  voiceLang?: Lang;
  voiceStyle?: VoiceStyle;
}

export interface POI {
  poiId: string;
  name: string;
  lat: number;
  lng: number;
  radiusM: number;
  /** New flow: single script per POI */
  script?: string;
  /** Legacy: scripts by voice style */
  scripts?: Partial<Record<VoiceStyle, string>>;
  facts: string[];
  orderIndex?: number;
  placeId?: string;
  scriptVersion?: number;
  tourId?: string;
  /** Short description (1–2 sentences) */
  description?: string;
  /** Minutes to walk from previous stop or start */
  timeToGetThereMin?: number;
  /** Minutes spent at this stop */
  timeSpentMin?: number;
  /** Price if applicable (e.g. "Free", "$5") */
  price?: string | null;
  /** Theme of this stop (from tour) */
  theme?: string;
  /** Place website URL when available */
  website?: string | null;
}

export interface GeneratedTourResponse {
  sessionId: string;
  tourPlan: TourPlan;
  pois: POI[];
}

// ─── Session (active walk state) ─────────────────────────────────────────────
export type SessionMode = "real" | "demo";

export interface SessionState {
  sessionId: string;
  tourPlan: TourPlan;
  pois: POI[];
  visitedPoiIds: string[];
  activePoiId: string | null;
  mode: SessionMode;
  startedAt: number;
  endedAt?: number;
}

// ─── Audio ───────────────────────────────────────────────────────────────────
export enum AudioState {
  IDLE = "IDLE",
  PLAYING_INTRO = "PLAYING_INTRO",
  NAVIGATING = "NAVIGATING",
  NARRATING = "NARRATING",
  LISTENING = "LISTENING",
  ANSWERING = "ANSWERING",
  PLAYING_OUTRO = "PLAYING_OUTRO",
  PAUSED = "PAUSED",
}

// ─── Geofence trigger ────────────────────────────────────────────────────────
export interface TriggerEvent {
  type: "POI_TRIGGER";
  poiId: string;
  distM: number;
  timestamp: number;
}

// ─── API shapes ──────────────────────────────────────────────────────────────
export interface QAResponse {
  answerText: string;
}

export interface STTResponse {
  transcript: string;
}

export interface TTSRequest {
  text: string;
  lang: Lang;
  voiceStyle: VoiceStyle;
  purpose: "intro" | "poi" | "answer" | "outro";
}
