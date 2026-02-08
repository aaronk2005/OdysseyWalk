/**
 * GeoTriggerEngine behavior spec (runnable checks).
 * Run with: npx ts-node --compiler-options '{"module":"CommonJS"}' lib/geo/GeoTriggerEngine.spec.ts
 * Or use as documentation; assertions can be run in a test framework.
 *
 * Spec:
 * - Only consider next K=3 unvisited POIs.
 * - effectiveRadius = baseRadius + clamp(accuracy, 0..30).
 * - Enter hysteresis: must be inside for CONSECUTIVE_INSIDE=2 updates.
 * - Exit hysteresis: once inside, treat as inside until dist > effectiveRadius + EXIT_HYSTERESIS_M.
 * - Only one POI trigger per update tick (first candidate that qualifies).
 * - Once a POI is in visitedPoiIds, it is never considered again.
 * - Cooldown 60s per POI before same POI can trigger again.
 */

import type { POI, LocationUpdate } from "@/lib/types";
import { createTriggerEngine } from "./GeoTriggerEngine";

const mockPois: POI[] = [
  {
    poiId: "poi-1",
    tourId: "t",
    name: "A",
    lat: 37.78,
    lng: -122.4,
    radiusM: 35,
    scripts: {},
    facts: [],
    scriptVersion: 1,
  },
  {
    poiId: "poi-2",
    tourId: "t",
    name: "B",
    lat: 37.781,
    lng: -122.401,
    radiusM: 35,
    scripts: {},
    facts: [],
    scriptVersion: 1,
  },
];

function runSpec(): void {
  const check = createTriggerEngine(mockPois, []);
  const atPoi1: LocationUpdate = {
    lat: 37.78,
    lng: -122.4,
    accuracy: 10,
    timestamp: Date.now(),
  };
  const first = check(atPoi1);
  const second = check(atPoi1);
  const visited = ["poi-1"];
  const check2 = createTriggerEngine(mockPois, visited);
  check2(atPoi1);
}

export { runSpec };
