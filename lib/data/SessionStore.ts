import type { GeneratedTourResponse, SessionState } from "@/lib/types";

const STORAGE_KEY = "odyssey-active-session";
const memory: { data: SessionState | null } = { data: null };

export function saveTour(sessionId: string, response: GeneratedTourResponse): void {
  const state: SessionState = {
    sessionId: response.sessionId,
    tourPlan: response.tourPlan,
    pois: response.pois,
    visitedPoiIds: [],
    activePoiId: null,
    mode: "real",
    startedAt: 0,
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
