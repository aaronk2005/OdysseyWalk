"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import type { LatLng } from "@/lib/types";
import type { POI } from "@/lib/types";
import { decodePolyline } from "@/lib/maps/polyline";
import { cn } from "@/lib/utils/cn";
import { MapSkeleton } from "./MapSkeleton";

export interface MapViewProps {
  center: LatLng;
  routePoints?: LatLng[];
  polyline?: string;
  pois: POI[];
  userLocation: LatLng | null;
  visitedPoiIds: string[];
  activePoiId: string | null;
  onPoiClick?: (poiId: string) => void;
  /** Optional: when user clicks the map (e.g. create page to set start) */
  onMapClick?: (lat: number, lng: number) => void;
  followUser?: boolean;
  className?: string;
  mapApiKey: string;
  /** When this value changes, map will fit bounds to route. */
  fitBoundsTrigger?: number;
  /** Navigation mode: thick high-contrast route, glowing active stop, faded visited. */
  navigationMode?: boolean;
  /** Show skeleton loader before map is ready */
  showSkeleton?: boolean;
  /** When set, show turn-by-turn directions from origin to destination (walking) in a bottom panel */
  directionsOrigin?: LatLng | null;
  directionsDestination?: LatLng | null;
}

export function MapView({
  center,
  routePoints: routePointsProp,
  polyline: polylineEncoded,
  pois,
  userLocation,
  visitedPoiIds,
  activePoiId,
  onPoiClick,
  onMapClick,
  followUser = true,
  className,
  mapApiKey,
  fitBoundsTrigger,
  navigationMode = false,
  showSkeleton = false,
  directionsOrigin = null,
  directionsDestination = null,
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<Map<string, google.maps.Marker>>(new Map());
  const userMarkerRef = useRef<google.maps.Marker | null>(null);
  const startMarkerRef = useRef<google.maps.Marker | null>(null);
  const polylineRef = useRef<google.maps.Polyline | null>(null);
  const pathRef = useRef<{ lat: number; lng: number }[]>([]);
  const mapClickListenerRef = useRef<google.maps.MapsEventListener | null>(null);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const directionsRendererRef = useRef<google.maps.DirectionsRenderer | null>(null);
  const directionsServiceRef = useRef<google.maps.DirectionsService | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [directionsPanelReady, setDirectionsPanelReady] = useState(false);
  const directionsRequestKeyRef = useRef<string>("");

  const propsRef = useRef({ center, mapApiKey, onMapClick, userLocation, navigationMode });
  propsRef.current = { center, mapApiKey, onMapClick, userLocation, navigationMode };
  const showDirections =
    Boolean(directionsOrigin && directionsDestination && mapApiKey) &&
    directionsOrigin !== directionsDestination;

  const initMapOnce = useCallback(async () => {
    if (typeof window === "undefined") return;
    const { center: c, mapApiKey: key, onMapClick: onClick, userLocation: loc, navigationMode: navMode } = propsRef.current;
    if (!containerRef.current || !key) return;
    setMapError(null);
    const { loadGoogleMapsOnce } = await import("@/lib/maps/MapLoader");
    try {
      await loadGoogleMapsOnce(key);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to load map";
      setMapError(msg);
      return;
    }
    const g = window.google;
    if (!g?.maps) return;

    const map = new g.maps.Map(containerRef.current, {
      center: { lat: c.lat, lng: c.lng },
      zoom: 15,
      disableDefaultUI: false,
      zoomControl: !navMode,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: !navMode,
      gestureHandling: "greedy", // Better mobile UX: pan with one finger
      styles: [
        { featureType: "water", elementType: "geometry", stylers: [{ color: "#a3ccff" }] },
        { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#5c5c5c" }] },
        { featureType: "landscape", elementType: "geometry", stylers: [{ color: "#e8e6e1" }] },
        { featureType: "road", elementType: "geometry", stylers: [{ color: "#ffffff" }] },
        { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#d4d4d4" }] },
        { featureType: "poi", elementType: "geometry", stylers: [{ color: "#eeeeee" }] },
        { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#d4e8d4" }] },
        { featureType: "transit", elementType: "geometry", stylers: [{ color: "#e8e6e1" }] },
        { featureType: "administrative", elementType: "geometry.stroke", stylers: [{ color: "#c9c9c9" }] },
        { elementType: "labels.text.fill", stylers: [{ color: "#2d2d2d" }] },
        { elementType: "labels.text.stroke", stylers: [{ color: "#ffffff" }, { weight: 2 }] },
      ],
    });
    mapRef.current = map;

    if (loc) {
      const um = new g.maps.Marker({
        position: { lat: loc.lat, lng: loc.lng },
        map,
        title: "Your location",
        icon: {
          path: g.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: "#22c55e",
          fillOpacity: 1,
          strokeColor: "#fff",
          strokeWeight: 3,
        },
        zIndex: 1000, // Always on top
      });
      userMarkerRef.current = um;
    }

    if (onClick) {
      mapClickListenerRef.current?.remove();
      mapClickListenerRef.current = map.addListener("click", (e: google.maps.MapMouseEvent) => {
        const latLng = e.latLng;
        if (latLng) onClick(latLng.lat(), latLng.lng());
      });
    }
    setMapReady(true);
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    setMapReady(false);
    setMapError(null);
    const t = setTimeout(() => {
      initMapOnce();
    }, 50);
    return () => {
      clearTimeout(t);
      mapClickListenerRef.current?.remove();
      mapClickListenerRef.current = null;
      directionsRendererRef.current?.setMap(null);
      directionsRendererRef.current?.setPanel(null);
      directionsRendererRef.current = null;
      markersRef.current.forEach((m) => m.setMap(null));
      markersRef.current.clear();
      userMarkerRef.current?.setMap(null);
      userMarkerRef.current = null;
      startMarkerRef.current?.setMap(null);
      startMarkerRef.current = null;
      polylineRef.current?.setMap(null);
      polylineRef.current = null;
      mapRef.current = null;
      setMapReady(false);
    };
  }, [mounted, retryCount, initMapOnce]);

  // Stable key for routePoints so we don't re-run on every render
  const routeKey = useRef("");
  const currentRouteKey = (routePointsProp ?? []).length + ":" + pois.map(p => p.poiId).join(",");

  // Draw route polyline and POI markers (skip polyline when directions panel is active)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !window.google?.maps) return;
    const g = window.google;

    // ── Clean up ──
    polylineRef.current?.setMap(null);
    polylineRef.current = null;
    startMarkerRef.current?.setMap(null);
    startMarkerRef.current = null;
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current.clear();

    // ── Build path from routePoints (server already provides walking directions) ──
    let path: { lat: number; lng: number }[] = [];
    if (routePointsProp && routePointsProp.length >= 2) {
      path = routePointsProp.map(p => ({ lat: p.lat, lng: p.lng }));
    } else if (polylineEncoded) {
      path = decodePolyline(polylineEncoded).map(p => ({ lat: p.lat, lng: p.lng }));
    } else if (pois.length >= 1) {
      // Last resort: straight lines through POIs
      const c = propsRef.current.center;
      path = [{ lat: c.lat, lng: c.lng }, ...pois.map(p => ({ lat: p.lat, lng: p.lng })), { lat: c.lat, lng: c.lng }];
    }
    pathRef.current = path;

    // ── Draw the route polyline only when not showing directions panel ──
    if (path.length >= 2 && !showDirections) {
      const line = new g.maps.Polyline({
        path,
        geodesic: true,
        strokeColor: navigationMode ? "#0d9488" : "#3b82f6",
        strokeOpacity: 0.85,
        strokeWeight: navigationMode ? 5 : 4,
      });
      line.setMap(map);
      polylineRef.current = line;

      // Fit map to the route
      const bounds = new g.maps.LatLngBounds();
      path.forEach(p => bounds.extend(p));
      map.fitBounds(bounds, 48);
    }

    // ── Start marker (green dot) ──
    if (path.length >= 1 && !showDirections) {
      startMarkerRef.current = new g.maps.Marker({
        position: path[0],
        map,
        title: "Start",
        icon: { path: g.maps.SymbolPath.CIRCLE, scale: 10, fillColor: "#10b981", fillOpacity: 1, strokeColor: "#fff", strokeWeight: 2 },
        zIndex: 999,
      });
    }

    // ── POI markers ──
    pois.forEach((poi, idx) => {
      const isVisited = visitedPoiIds.includes(poi.poiId);
      const isActive = activePoiId === poi.poiId;
      const marker = new g.maps.Marker({
        position: { lat: poi.lat, lng: poi.lng },
        map,
        title: poi.name,
        icon: {
          path: g.maps.SymbolPath.CIRCLE,
          scale: isActive ? 14 : isVisited ? 8 : 11,
          fillColor: isActive ? "#8b5cf6" : isVisited ? "#94a3b8" : "#3b82f6",
          fillOpacity: isVisited && !isActive ? 0.6 : 1,
          strokeColor: "#fff",
          strokeWeight: isActive ? 3 : 2,
        },
        label: { text: String(idx + 1), color: "#fff", fontSize: "11px", fontWeight: "bold" },
        animation: isActive ? g.maps.Animation.BOUNCE : undefined,
        optimized: false,
      });
      marker.addListener("click", () => {
        if (!infoWindowRef.current) infoWindowRef.current = new g.maps.InfoWindow();
        infoWindowRef.current.setContent(
          `<div style="padding:6px 10px;font-family:system-ui"><strong>${poi.name}</strong><br><span style="font-size:12px;color:#64748b">${isVisited ? "Visited" : isActive ? "Current" : "Upcoming"} · Stop ${idx + 1}</span></div>`
        );
        infoWindowRef.current.open(map, marker);
        onPoiClick?.(poi.poiId);
      });
      markersRef.current.set(poi.poiId, marker);
    });

    routeKey.current = currentRouteKey;
  }, [mapReady, currentRouteKey, navigationMode, showDirections]);

  // Reset panel-ready when leaving directions mode so next time we wait for panel mount
  useEffect(() => {
    if (!showDirections) setDirectionsPanelReady(false);
  }, [showDirections]);

  // Directions: request walking route and show turn-by-turn in panel
  useEffect(() => {
    if (!showDirections || !directionsOrigin || !directionsDestination) {
      directionsRendererRef.current?.setMap(null);
      directionsRendererRef.current?.setPanel(null);
      directionsRendererRef.current = null;
      directionsRequestKeyRef.current = "";
      return;
    }

    const map = mapRef.current;
    const panel = panelRef.current;
    if (!map || !mapReady || !window.google?.maps) return;
    if (!panel) return; // wait for ref callback to set directionsPanelReady and re-run

    const g = window.google;
    const requestKey = `${directionsOrigin.lat},${directionsOrigin.lng}-${directionsDestination.lat},${directionsDestination.lng}`;
    if (directionsRequestKeyRef.current === requestKey) return;
    directionsRequestKeyRef.current = requestKey;

    try {
      if (!directionsServiceRef.current) directionsServiceRef.current = new g.maps.DirectionsService();
      const service = directionsServiceRef.current;

      service.route(
        {
          origin: { lat: directionsOrigin.lat, lng: directionsOrigin.lng },
          destination: { lat: directionsDestination.lat, lng: directionsDestination.lng },
          travelMode: g.maps.TravelMode.WALKING,
        },
        (result, status) => {
          try {
            if (status !== g.maps.DirectionsStatus.OK || !result) {
              directionsRequestKeyRef.current = "";
              return;
            }
            if (!mapRef.current) return;
            if (!directionsRendererRef.current) {
              directionsRendererRef.current = new g.maps.DirectionsRenderer({
                suppressMarkers: true,
                preserveViewport: false,
              });
            }
            directionsRendererRef.current.setMap(mapRef.current);
            const p = panelRef.current;
            if (p) directionsRendererRef.current.setPanel(p);
            directionsRendererRef.current.setDirections(result);
          } catch {
            directionsRequestKeyRef.current = "";
          }
        }
      );
    } catch {
      directionsRequestKeyRef.current = "";
    }
  }, [mapReady, showDirections, directionsOrigin, directionsDestination, directionsPanelReady]);

  // Clear directions on unmount or when turning off
  useEffect(() => {
    return () => {
      directionsRendererRef.current?.setMap(null);
      directionsRendererRef.current?.setPanel(null);
      directionsRendererRef.current = null;
    };
  }, [showDirections]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !window.google?.maps) return;
    pois.forEach((poi) => {
      const m = markersRef.current.get(poi.poiId);
      if (!m) return;
      const isVisited = visitedPoiIds.includes(poi.poiId);
      const isActive = activePoiId === poi.poiId;
      m.setIcon({
        path: window.google.maps.SymbolPath.CIRCLE,
        scale: navigationMode ? (isActive ? 16 : isVisited ? 8 : 12) : isActive ? 14 : 10,
        fillColor: navigationMode
          ? isActive
            ? "#0d9488"
            : isVisited
              ? "#94a3b8"
              : "#0d9488"
          : isActive
            ? "#8b5cf6"
            : isVisited
              ? "#64748b"
              : "#3b82f6",
        fillOpacity: navigationMode && isVisited && !isActive ? 0.6 : 1,
        strokeColor: "#fff",
        strokeWeight: navigationMode && isActive ? 3 : 2,
      });
    });
  }, [pois, visitedPoiIds, activePoiId, navigationMode]);

  useEffect(() => {
    if (mapRef.current && mapReady) {
      mapRef.current.panTo({ lat: center.lat, lng: center.lng });
    }
  }, [center.lat, center.lng, mapReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !window.google?.maps) return;
    if (!userLocation) return;
    const g = window.google;
    if (userMarkerRef.current) {
      userMarkerRef.current.setPosition({ lat: userLocation.lat, lng: userLocation.lng });
    } else {
      const um = new g.maps.Marker({
        position: { lat: userLocation.lat, lng: userLocation.lng },
        map,
        title: "Your location",
        icon: {
          path: g.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: "#22c55e",
          fillOpacity: 1,
          strokeColor: "#fff",
          strokeWeight: 3,
        },
        zIndex: 1000, // Always on top
      });
      userMarkerRef.current = um;
    }
    if (followUser) map.panTo({ lat: userLocation.lat, lng: userLocation.lng });
  }, [userLocation?.lat, userLocation?.lng, followUser, mapReady]);

  useEffect(() => {
    if (fitBoundsTrigger == null || fitBoundsTrigger === 0) return;
    const map = mapRef.current;
    const path = pathRef.current;
    if (!map || !window.google?.maps || path.length < 2) return;
    const bounds = new window.google.maps.LatLngBounds();
    path.forEach((p) => bounds.extend(p));
    map.fitBounds(bounds, 48);
  }, [fitBoundsTrigger]);

  if (mapError) {
    return (
      <div
        className={cn(
          "w-full min-h-[200px] rounded-card bg-surface-muted flex flex-col items-center justify-center gap-3 p-6 text-center",
          className
        )}
        role="alert"
        aria-label="Map failed to load"
      >
        <p className="text-body text-ink-secondary">{mapError}</p>
        <button
          type="button"
          onClick={() => {
            setMapError(null);
            setRetryCount((c) => c + 1);
          }}
          className="px-4 py-2.5 rounded-button bg-brand-primary text-white font-medium hover:bg-brand-primaryHover min-h-[44px]"
          aria-label="Retry loading map"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className={cn("relative w-full h-full min-h-[200px]", className)}>
      <div
        ref={containerRef}
        className="absolute inset-0 min-h-[200px] bg-surface-muted rounded-card"
        aria-label="Map"
        aria-busy={!mapReady}
      />
      {showDirections && (
        <div
          ref={(el) => {
            (panelRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
            if (el) setDirectionsPanelReady(true);
          }}
          className="absolute bottom-0 left-0 right-0 z-10 max-h-[35%] min-h-[80px] overflow-auto rounded-t-xl bg-surface/98 backdrop-blur-sm border border-app-border border-b-0 shadow-lg text-center text-sm font-medium text-ink-primary [&_.adp]:!text-ink-primary [&_.adp]:!font-medium [&_.adp-step]:!text-ink-secondary [&_.adp-placemark]:!text-ink-secondary [&_.adp-text]:!text-ink-primary [&_.adp-text]:!text-sm [&_.adp-text]:!font-normal [&_.adp-warnbox]:!hidden [&_.warnbox-content]:!hidden"
          aria-label="Turn-by-turn directions"
        />
      )}
    </div>
  );
}
