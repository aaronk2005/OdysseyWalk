import type { LocationUpdate } from "@/lib/types";
import type { ILocationProvider, LocationCallback } from "./ILocationProvider";
const THROTTLE_MS = 2000;

export type GeoPermissionCallback = (denied: boolean) => void;

export class GeoProvider implements ILocationProvider {
  private watchId: number | null = null;
  private callbacks = new Set<LocationCallback>();
  private lastEmit = 0;
  private permissionCallback: GeoPermissionCallback | null = null;
  private visibilityBound = false;

  setPermissionCallback(cb: GeoPermissionCallback | null): void {
    this.permissionCallback = cb;
  }

  start(): void {
    if (typeof window === "undefined" || !navigator.geolocation) {
      this.permissionCallback?.(true);
      return;
    }
    if (this.watchId != null) return;

    const emit = (update: LocationUpdate) => {
      const now = update.timestamp;
      if (now - this.lastEmit < THROTTLE_MS) return;
      this.lastEmit = now;
      this.callbacks.forEach((cb) => cb(update));
    };

    const options: PositionOptions = {
      enableHighAccuracy: true,
      maximumAge: 5000,
      timeout: 10000,
    };

    this.watchId = navigator.geolocation.watchPosition(
      (pos) => {
        if (typeof document !== "undefined" && document.hidden) return;
        const now = Date.now();
        const update: LocationUpdate = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy ?? undefined,
          speed: pos.coords.speed ?? undefined,
          timestamp: now,
        };
        emit(update);
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          this.permissionCallback?.(true);
        }
      },
      options
    );

    const onVisibility = () => {
      if (document.hidden && this.watchId != null && navigator.geolocation) {
        navigator.geolocation.clearWatch(this.watchId);
        this.watchId = null;
      } else if (!document.hidden && this.watchId === null && navigator.geolocation) {
        this.start();
      }
    };
    if (typeof document !== "undefined" && !this.visibilityBound) {
      this.visibilityBound = true;
      document.addEventListener("visibilitychange", onVisibility);
      this.cleanupVisibility = () => {
        document.removeEventListener("visibilitychange", onVisibility);
        this.visibilityBound = false;
      };
    }
  }

  private cleanupVisibility: (() => void) | null = null;

  stop(): void {
    this.cleanupVisibility?.();
    this.cleanupVisibility = null;
    if (this.watchId != null && typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
  }

  subscribe(cb: LocationCallback): () => void {
    this.callbacks.add(cb);
    return () => this.callbacks.delete(cb);
  }
}
