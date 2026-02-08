import type { GeneratedTourResponse, SessionState, TourPlan, Tour, POI, LatLng } from "@/lib/types";

const STORAGE_KEY = "odyssey-active-session";
const memory: { data: SessionState | null } = { data: null };

/**
 * Save a pre-planned tour (from JSON/API) as the active session so the user can start the walk.
 */
export function savePreplannedTour(
  tourId: string,
  tour: Pick<Tour, "name" | "city" | "estimatedMinutes" | "tags" | "defaultLang" | "defaultVoiceStyle"> & { routePoints?: LatLng[] },
  pois: POI[]
): void {
  const sorted = [...pois].sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));
  let routePoints: LatLng[] = [];
  if (tour.routePoints && tour.routePoints.length >= 2) {
    routePoints = tour.routePoints;
  } else if (sorted.length >= 1) {
    routePoints = sorted.map((p) => ({ lat: p.lat, lng: p.lng }));
  }
  const intro =
    `Welcome to ${tour.name} in ${tour.city}. This walking tour has ${sorted.length} stops and takes about ${tour.estimatedMinutes} minutes. Tap Start when you're ready to begin.`;
  const outro =
    `You've reached the end of ${tour.name}. Thanks for walking with us.`;
  const tourPlan: TourPlan = {
    intro,
    outro,
    theme: (tour.tags && tour.tags[0]) ?? "culture",
    estimatedMinutes: tour.estimatedMinutes,
    routePoints,
    voiceLang: tour.defaultLang ?? "en",
    voiceStyle: tour.defaultVoiceStyle ?? "friendly",
  };
  const poisWithRadius: POI[] = sorted.map((p) => ({
    ...p,
    radiusM: p.radiusM ?? 35,
  }));
  const state: SessionState = {
    sessionId: tourId,
    tourPlan,
    pois: poisWithRadius,
    visitedPoiIds: [],
    activePoiId: null,
    mode: "real",
    startedAt: 0,
    isPreplanned: true,
  };
  memory.data = state;
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // ignore
    }
  }
}

export function saveTour(sessionId: string, response: GeneratedTourResponse): void {
  const state: SessionState = {
    sessionId: response.sessionId,
    tourPlan: response.tourPlan,
    pois: response.pois,
    visitedPoiIds: [],
    activePoiId: null,
    mode: "real",
    startedAt: 0,
    isPreplanned: false,
  };
  memory.data = state;
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // ignore
    }
  }
}

export function loadTour(): SessionState | null {
  if (memory.data) return memory.data;
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const state = JSON.parse(raw) as SessionState;
    memory.data = state;
    return state;
  } catch {
    return null;
  }
}

export function updateSession(update: Partial<SessionState>): void {
  const current = memory.data ?? loadTour();
  if (!current) return;
  const next: SessionState = { ...current, ...update };
  memory.data = next;
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  }
}

export function clearTour(): void {
  memory.data = null;
  if (typeof window !== "undefined") {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }
}
