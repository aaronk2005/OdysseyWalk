import type { LatLng } from "@/lib/types";

export interface DirectionsRoute {
  distanceMeters: number;
  durationSeconds: number;
  polyline: string; // Encoded overview polyline
  routePoints: LatLng[]; // Detailed step-level points (follows streets precisely)
}

export interface PlaceDirectionsResult extends DirectionsRoute {
  /** Exact Google-verified location for each waypoint/POI (in optimized order) */
  waypointLocations: LatLng[];
  /** The optimized order of waypoints (e.g. [2,0,1] means original index 2 is first) */
  waypointOrder: number[];
}

// ─── Primary: Address-based walking directions ─────────────────────────────
/**
 * Get walking directions using place names/addresses as waypoints.
 * Google geocodes each address automatically, giving exact coordinates.
 * Decodes ALL step-level polylines for a street-precise route (not the simplified overview).
 */
export async function getWalkingDirectionsByPlaces(
  origin: LatLng,
  placeQueries: string[], // e.g. ["Empire State Building, 350 5th Ave, New York, NY", ...]
  apiKey: string
): Promise<PlaceDirectionsResult | null> {
  if (placeQueries.length < 1) return null;

  try {
    const originStr = `${origin.lat},${origin.lng}`;
    // Use optimize:true| prefix so Google reorders waypoints for shortest walking path
    const waypointsStr = "optimize:true|" + placeQueries.join("|");

    const url = new URL("https://maps.googleapis.com/maps/api/directions/json");
    url.searchParams.set("origin", originStr);
    url.searchParams.set("destination", originStr); // Loop back to start
    url.searchParams.set("waypoints", waypointsStr);
    url.searchParams.set("mode", "walking");
    url.searchParams.set("key", apiKey);

    const response = await fetch(url.toString());
    if (!response.ok) return null;

    const data = await response.json();
    if (data.status !== "OK" || !data.routes?.[0]) {
      return null;
    }

    const route = data.routes[0];
    let totalDistanceMeters = 0;
    let totalDurationSeconds = 0;
    const allPoints: LatLng[] = [];
    const waypointLocations: LatLng[] = [];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    route.legs.forEach((leg: any, legIdx: number) => {
      totalDistanceMeters += leg.distance.value;
      totalDurationSeconds += leg.duration.value;

      // Each leg's end_location is a waypoint (except the last leg which returns to start)
      if (legIdx < route.legs.length - 1) {
        waypointLocations.push({
          lat: leg.end_location.lat,
          lng: leg.end_location.lng,
        });
      }

      // Decode ALL step polylines for full street-level detail
      if (leg.steps) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        for (const step of leg.steps as any[]) {
          if (step.polyline?.points) {
            const stepPoints = decodePolyline(step.polyline.points);
            // Skip duplicate first point (end of prev step == start of next step)
            const startIdx =
              allPoints.length > 0 &&
              stepPoints.length > 0 &&
              Math.abs(allPoints[allPoints.length - 1].lat - stepPoints[0].lat) < 0.00001 &&
              Math.abs(allPoints[allPoints.length - 1].lng - stepPoints[0].lng) < 0.00001
                ? 1
                : 0;
            allPoints.push(...stepPoints.slice(startIdx));
          }
        }
      }
    });

    // Google returns the optimized order when optimize:true is used
    // e.g. waypoint_order: [2, 0, 1] means original waypoint 2 comes first
    const waypointOrder: number[] = route.waypoint_order ?? placeQueries.map((_: string, i: number) => i);

    return {
      distanceMeters: totalDistanceMeters,
      durationSeconds: totalDurationSeconds,
      polyline: route.overview_polyline?.points || "",
      routePoints: allPoints,
      waypointLocations,
      waypointOrder,
    };
  } catch {
    return null;
  }
}

// ─── Fallback: Coordinate-based walking directions ─────────────────────────
/**
 * Get walking directions between LatLng waypoints (fallback if place-based fails).
 * Now also decodes step-level polylines for better detail.
 */
export async function getWalkingDirections(
  waypoints: LatLng[],
  apiKey: string
): Promise<DirectionsRoute | null> {
  if (waypoints.length < 2) return null;

  try {
    const origin = `${waypoints[0].lat},${waypoints[0].lng}`;
    const destination = `${waypoints[waypoints.length - 1].lat},${waypoints[waypoints.length - 1].lng}`;
    const intermediateWaypoints =
      waypoints.length > 2
        ? waypoints
            .slice(1, -1)
            .map((w) => `${w.lat},${w.lng}`)
            .join("|")
        : undefined;

    const url = new URL("https://maps.googleapis.com/maps/api/directions/json");
    url.searchParams.set("origin", origin);
    url.searchParams.set("destination", destination);
    if (intermediateWaypoints) {
      url.searchParams.set("waypoints", intermediateWaypoints);
    }
    url.searchParams.set("mode", "walking");
    url.searchParams.set("key", apiKey);

    const response = await fetch(url.toString());
    if (!response.ok) return null;

    const data = await response.json();
    if (data.status !== "OK" || !data.routes?.[0]) return null;

    const route = data.routes[0];
    let totalDistanceMeters = 0;
    let totalDurationSeconds = 0;
    const allPoints: LatLng[] = [];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    route.legs.forEach((leg: any) => {
      totalDistanceMeters += leg.distance.value;
      totalDurationSeconds += leg.duration.value;

      // Decode step-level polylines for detail (instead of overview_polyline)
      if (leg.steps) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        for (const step of leg.steps as any[]) {
          if (step.polyline?.points) {
            const stepPoints = decodePolyline(step.polyline.points);
            const startIdx =
              allPoints.length > 0 &&
              stepPoints.length > 0 &&
              Math.abs(allPoints[allPoints.length - 1].lat - stepPoints[0].lat) < 0.00001 &&
              Math.abs(allPoints[allPoints.length - 1].lng - stepPoints[0].lng) < 0.00001
                ? 1
                : 0;
            allPoints.push(...stepPoints.slice(startIdx));
          }
        }
      }
    });

    // If step-level decoding gave us nothing, fall back to overview
    if (allPoints.length === 0) {
      const polyline = route.overview_polyline?.points;
      if (polyline) allPoints.push(...decodePolyline(polyline));
    }

    const polyline = route.overview_polyline?.points || "";

    return {
      distanceMeters: totalDistanceMeters,
      durationSeconds: totalDurationSeconds,
      polyline,
      routePoints: allPoints,
    };
  } catch {
    return null;
  }
}

/**
 * Decode Google Maps encoded polyline string to LatLng array.
 */
function decodePolyline(encoded: string): LatLng[] {
  const points: LatLng[] = [];
  let index = 0;
  const len = encoded.length;
  let lat = 0;
  let lng = 0;

  while (index < len) {
    let shift = 0;
    let result = 0;
    let byte: number;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const deltaLat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += deltaLat;

    shift = 0;
    result = 0;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const deltaLng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += deltaLng;

    points.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }

  return points;
}
