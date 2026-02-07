import type { Tour, TourSummary, POI } from "@/lib/types";

const memoryCache = new Map<string, { tour: Tour; pois: POI[] }>();

export async function listTours(): Promise<TourSummary[]> {
  const res = await fetch("/api/tours");
  if (!res.ok) throw new Error("Failed to list tours");
  const data = await res.json();
  return data.tours as TourSummary[];
}

export async function getTour(tourId: string): Promise<{ tour: Tour; pois: POI[] }> {
  const cached = memoryCache.get(tourId);
  if (cached) return cached;

  const res = await fetch(`/api/tours/${tourId}`);
  if (!res.ok) {
    const fromMemory = getCachedTour(tourId);
    if (fromMemory) return fromMemory;
    if (typeof localStorage !== "undefined") {
      const raw = localStorage.getItem(`odyssey-tour-${tourId}`);
      if (raw) {
        try {
          const data = JSON.parse(raw);
          const result = { tour: data.tour as Tour, pois: data.pois as POI[] };
          memoryCache.set(tourId, result);
          return result;
        } catch {
          // ignore
        }
      }
    }
    throw new Error(`Failed to load tour: ${tourId}`);
  }
  const data = await res.json();
  const result = { tour: data.tour as Tour, pois: data.pois as POI[] };
  memoryCache.set(tourId, result);
  return result;
}

export function cacheTour(tourId: string, tour: Tour, pois: POI[]): void {
  memoryCache.set(tourId, { tour, pois });
}

export function getCachedTour(tourId: string): { tour: Tour; pois: POI[] } | null {
  return memoryCache.get(tourId) ?? null;
}
