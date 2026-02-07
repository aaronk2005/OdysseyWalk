import type { LatLng, LocationUpdate } from "@/lib/types";
import type { ILocationProvider, LocationCallback } from "./ILocationProvider";

const STEP_MS = 3000;

export interface DemoSequenceOptions {
  poiIds: string[];
  delayMsBetweenStops: number;
}

export class GeoSimProvider implements ILocationProvider {
  private routePoints: LatLng[] = [];
  private currentIdx = 0;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private callbacks = new Set<LocationCallback>();
  private poiById = new Map<string, { lat: number; lng: number }>();
  private sequenceTimeoutId: ReturnType<typeof setTimeout> | null = null;

  setRoute(points: LatLng[]): void {
    this.routePoints = points.length ? [...points] : [];
    this.currentIdx = 0;
  }

  setPoiPositions(pois: { poiId: string; lat: number; lng: number }[]): void {
    this.poiById.clear();
    pois.forEach((p) => this.poiById.set(p.poiId, { lat: p.lat, lng: p.lng }));
  }

  start(): void {
    if (this.intervalId) return;
    if (this.routePoints.length === 0) {
      const first = this.poiById.values().next().value;
      if (first) this.emit({ ...first, timestamp: Date.now() });
      return;
    }
    this.emitFromRoute();
    this.intervalId = setInterval(() => {
      this.currentIdx = Math.min(this.currentIdx + 1, this.routePoints.length - 1);
      this.emitFromRoute();
    }, STEP_MS);
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    if (this.sequenceTimeoutId) {
      clearTimeout(this.sequenceTimeoutId);
      this.sequenceTimeoutId = null;
    }
  }

  stepForward(): void {
    if (this.routePoints.length === 0) return;
    this.currentIdx = Math.min(this.currentIdx + 1, this.routePoints.length - 1);
    this.emitFromRoute();
  }

  jumpToPoi(poiId: string): void {
    const pos = this.poiById.get(poiId);
    if (pos) {
      this.emit({ ...pos, timestamp: Date.now() });
      const idx = this.routePoints.findIndex(
        (p) => Math.abs(p.lat - pos.lat) < 1e-5 && Math.abs(p.lng - pos.lng) < 1e-5
      );
      if (idx >= 0) this.currentIdx = idx;
    }
  }

  resetToStart(): void {
    this.currentIdx = 0;
    if (this.routePoints.length > 0) {
      const p = this.routePoints[0];
      this.emit({ lat: p.lat, lng: p.lng, timestamp: Date.now() });
    } else {
      const first = this.poiById.values().next().value;
      if (first) this.emit({ ...first, timestamp: Date.now() });
    }
  }

  /**
   * Scripted run: teleport to each POI in order with delay, then stop.
   * Deterministic and pitch-friendly. Does not require user permissions.
   */
  runDemoSequence(
    options: DemoSequenceOptions,
    onEachPoi: (poiId: string, index: number) => void
  ): void {
    this.stop();
    const { poiIds, delayMsBetweenStops } = options;
    let index = 0;
    const runNext = () => {
      if (index >= poiIds.length) return;
      const poiId = poiIds[index];
      this.jumpToPoi(poiId);
      onEachPoi(poiId, index);
      index++;
      if (index < poiIds.length) {
        this.sequenceTimeoutId = setTimeout(runNext, delayMsBetweenStops);
      }
    };
    runNext();
  }

  getCurrentPosition(): LatLng | null {
    if (this.routePoints.length === 0) {
      const first = this.poiById.values().next().value;
      return first ? { lat: first.lat, lng: first.lng } : null;
    }
    const p = this.routePoints[this.currentIdx];
    return p ? { lat: p.lat, lng: p.lng } : null;
  }

  getCurrentIndex(): number {
    return this.currentIdx;
  }

  subscribe(cb: LocationCallback): () => void {
    this.callbacks.add(cb);
    return () => this.callbacks.delete(cb);
  }

  private emitFromRoute(): void {
    const p = this.routePoints[this.currentIdx];
    if (p) this.emit({ lat: p.lat, lng: p.lng, timestamp: Date.now() });
  }

  private emit(update: LocationUpdate): void {
    this.callbacks.forEach((cb) => cb(update));
  }
}
