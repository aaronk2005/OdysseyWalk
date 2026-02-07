import type { LocationUpdate } from "@/lib/types";

export type LocationCallback = (update: LocationUpdate) => void;

export interface ILocationProvider {
  start(): void;
  stop(): void;
  subscribe(cb: LocationCallback): () => void;
}
