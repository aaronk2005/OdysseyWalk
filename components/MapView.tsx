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
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<Map<string, google.maps.Marker>>(new Map());
  const userMarkerRef = useRef<google.maps.Marker | null>(null);
  const polylineRef = useRef<google.maps.Polyline | null>(null);
  const pathRef = useRef<{ lat: number; lng: number }[]>([]);
  const mapClickListenerRef = useRef<google.maps.MapsEventListener | null>(null);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [mounted, setMounted] = useState(false);

  const propsRef = useRef({ center, mapApiKey, onMapClick, userLocation, navigationMode });
  propsRef.current = { center, mapApiKey, onMapClick, userLocation, navigationMode };

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
      markersRef.current.forEach((m) => m.setMap(null));
      markersRef.current.clear();
      userMarkerRef.current?.setMap(null);
      userMarkerRef.current = null;
      polylineRef.current?.setMap(null);
      polylineRef.current = null;
      mapRef.current = null;
      setMapReady(false);
    };
  }, [mounted, retryCount, initMapOnce]);

  // Sync route polyline and POI markers when map is ready and route/pois change (e.g. after generate on /create)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !window.google?.maps) return;

    const g = window.google;
    const points = routePointsProp?.length
      ? routePointsProp
      : polylineEncoded
        ? decodePolyline(polylineEncoded)
        : [];
    const path = points.length >= 2 ? points.map((p) => ({ lat: p.lat, lng: p.lng })) : [];

    if (polylineRef.current) {
      polylineRef.current.setMap(null);
      polylineRef.current = null;
    }
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current.clear();
    pathRef.current = path;

    if (path.length >= 2) {
      const line = new g.maps.Polyline({
        path,
        geodesic: true,
        strokeColor: navigationMode ? "#0d9488" : "#3b82f6",
        strokeOpacity: navigationMode ? 0.95 : 0.8,
        strokeWeight: navigationMode ? 6 : 4,
      });
      line.setMap(map);
      polylineRef.current = line;
      const bounds = new g.maps.LatLngBounds();
      path.forEach((p) => bounds.extend(p));
      map.fitBounds(bounds, 48);
    }

    pois.forEach((poi) => {
      const isVisited = visitedPoiIds.includes(poi.poiId);
      const isActive = activePoiId === poi.poiId;
      const marker = new g.maps.Marker({
        position: { lat: poi.lat, lng: poi.lng },
        map,
        title: poi.name,
        icon: {
          path: g.maps.SymbolPath.CIRCLE,
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
        },
        animation: isActive ? g.maps.Animation.BOUNCE : undefined,
        optimized: false, // Better rendering for custom icons
      });
      marker.addListener("click", () => {
        // Show info window on click
        if (!infoWindowRef.current) {
          infoWindowRef.current = new g.maps.InfoWindow();
        }
        const statusText = isVisited ? "✓ Visited" : isActive ? "📍 Current stop" : "Upcoming";
        const content = `<div style="padding:8px;font-family:system-ui;"><strong style="display:block;margin-bottom:4px;">${poi.name}</strong><span style="font-size:12px;color:#64748b;">${statusText}</span></div>`;
        infoWindowRef.current.setContent(content);
        infoWindowRef.current.open(map, marker);
        onPoiClick?.(poi.poiId);
      });
      markersRef.current.set(poi.poiId, marker);
    });
  }, [mapReady, routePointsProp, polylineEncoded, pois, onPoiClick, navigationMode]);

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
    <div
      ref={containerRef}
      className={cn("w-full h-full min-h-[200px] bg-surface-muted rounded-card", className)}
      aria-label="Map"
      aria-busy={!mapReady}
    />
  );
}
