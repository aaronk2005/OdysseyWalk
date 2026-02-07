import type { LatLng } from "@/lib/types";

export interface DirectionsRoute {
  distanceMeters: number;
  durationSeconds: number;
  polyline: string; // Encoded polyline
  routePoints: LatLng[];
}

/**
 * Get walking directions between waypoints using Google Maps Directions API.
 * Falls back to Haversine distance if API fails.
 */
export async function getWalkingDirections(
  waypoints: LatLng[],
  apiKey: string
): Promise<DirectionsRoute | null> {
  if (waypoints.length < 2) return null;

  try {
    // Build waypoints string (exclude start/end from waypoints parameter)
    const origin = `${waypoints[0].lat},${waypoints[0].lng}`;
    const destination = `${waypoints[waypoints.length - 1].lat},${waypoints[waypoints.length - 1].lng}`;
    const intermediateWaypoints =
      waypoints.length > 2
        ? waypoints.slice(1, -1).map((w) => `${w.lat},${w.lng}`).join("|")
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

    // Aggregate distance and duration from all legs
    route.legs.forEach((leg: { distance: { value: number }; duration: { value: number }; steps: unknown[] }) => {
      totalDistanceMeters += leg.distance.value;
      totalDurationSeconds += leg.duration.value;
    });

    // Decode polyline to get route points
    const polyline = route.overview_polyline.points;
    const decoded = decodePolyline(polyline);
    allPoints.push(...decoded);

    return {
      distanceMeters: totalDistanceMeters,
      durationSeconds: totalDurationSeconds,
      polyline,
      routePoints: allPoints,
    };
  } catch (error) {
    console.warn("[Directions] API error, falling back to Haversine:", error);
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
