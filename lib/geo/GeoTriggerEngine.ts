import type { LatLng, LocationUpdate, TriggerEvent, POI } from "@/lib/types";
import { distanceMeters } from "@/lib/maps/haversine";

const NEXT_K = 3;
const ACCURACY_CLAMP_MAX = 30;
const CONSECUTIVE_INSIDE = 1;
const COOLDOWN_MS = 60_000;
const EXIT_HYSTERESIS_M = 5;

export function createTriggerEngine(pois: POI[], visitedPoiIds: string[]) {
  const lastTriggerTime = new Map<string, number>();
  const consecutiveInside = new Map<string, number>();
  const lastInside = new Map<string, boolean>();

  return function check(location: LocationUpdate): TriggerEvent | null {
    const now = location.timestamp;
    const user: LatLng = { lat: location.lat, lng: location.lng };
    const accuracy = Math.min(ACCURACY_CLAMP_MAX, Math.max(0, location.accuracy ?? 0));
    const unvisited = pois.filter((p) => !visitedPoiIds.includes(p.poiId));
    const nextCandidates = unvisited.slice(0, NEXT_K);
    if (nextCandidates.length === 0) return null;

    for (const poi of nextCandidates) {
      const baseRadius = poi.radiusM ?? 35;
      const effectiveRadius = baseRadius + accuracy;
      const distM = distanceMeters(user, { lat: poi.lat, lng: poi.lng });
      const wasInside = lastInside.get(poi.poiId) ?? false;
      const inside = distM <= effectiveRadius;
      const exitHysteresis = wasInside && distM <= effectiveRadius + EXIT_HYSTERESIS_M;
      const reallyInside = inside || exitHysteresis;
      lastInside.set(poi.poiId, reallyInside);

      if (!reallyInside) {
        consecutiveInside.set(poi.poiId, 0);
        continue;
      }

      const count = (consecutiveInside.get(poi.poiId) ?? 0) + 1;
      consecutiveInside.set(poi.poiId, count);
      if (count < CONSECUTIVE_INSIDE) continue;

      const last = lastTriggerTime.get(poi.poiId) ?? 0;
      if (now - last < COOLDOWN_MS) continue;

      consecutiveInside.set(poi.poiId, 0);
      lastTriggerTime.set(poi.poiId, now);
      return { type: "POI_TRIGGER", poiId: poi.poiId, distM, timestamp: now };
    }
    return null;
  };
}

/** Tracks consecutive inside count with hysteresis; one POI per call. */
export function createConsecutiveTriggerEngine(
  pois: POI[],
  getVisited: () => string[]
) {
  const consecutiveInside = new Map<string, number>();
  const lastInside = new Map<string, boolean>();

  return function check(location: LocationUpdate): TriggerEvent | null {
    const visited = getVisited();
    const unvisited = pois.filter((p) => !visited.includes(p.poiId));
    const nextCandidates = unvisited.slice(0, NEXT_K);
    const user: LatLng = { lat: location.lat, lng: location.lng };
    const accuracy = Math.min(ACCURACY_CLAMP_MAX, Math.max(0, location.accuracy ?? 0));

    for (const poi of nextCandidates) {
      const baseRadius = poi.radiusM ?? 35;
      const effectiveRadius = baseRadius + accuracy;
      const distM = distanceMeters(user, { lat: poi.lat, lng: poi.lng });
      const wasInside = lastInside.get(poi.poiId) ?? false;
      const inside = distM <= effectiveRadius;
      const exitHysteresis = wasInside && distM <= effectiveRadius + EXIT_HYSTERESIS_M;
      const reallyInside = inside || exitHysteresis;
      lastInside.set(poi.poiId, reallyInside);

      if (!reallyInside) {
        consecutiveInside.set(poi.poiId, 0);
        continue;
      }
      const count = (consecutiveInside.get(poi.poiId) ?? 0) + 1;
      consecutiveInside.set(poi.poiId, count);
      if (count >= CONSECUTIVE_INSIDE) {
        consecutiveInside.set(poi.poiId, 0);
        return {
          type: "POI_TRIGGER",
          poiId: poi.poiId,
          distM,
          timestamp: location.timestamp,
        };
      }
    }
    return null;
  };
}
