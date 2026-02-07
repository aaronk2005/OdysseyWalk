"use client";

import { useEffect, useRef, useCallback } from "react";
import type { LatLng } from "@/lib/types";
import type { POI } from "@/lib/types";
import { decodePolyline } from "@/lib/maps/polyline";
import { cn } from "@/lib/utils/cn";

export interface MapViewProps {
  center: LatLng;
  routePoints?: LatLng[];
  polyline?: string;
  pois: POI[];
  userLocation: LatLng | null;
  visitedPoiIds: string[];
  activePoiId: string | null;
  onPoiClick?: (poiId: string) => void;
  followUser?: boolean;
  className?: string;
  mapApiKey: string;
  /** When this value changes, map will fit bounds to route. */
  fitBoundsTrigger?: number;
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
  followUser = true,
  className,
  mapApiKey,
  fitBoundsTrigger,
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<Map<string, google.maps.Marker>>(new Map());
  const userMarkerRef = useRef<google.maps.Marker | null>(null);
  const polylineRef = useRef<google.maps.Polyline | null>(null);
  const pathRef = useRef<{ lat: number; lng: number }[]>([]);

  const points = routePointsProp?.length
    ? routePointsProp
    : polylineEncoded
      ? decodePolyline(polylineEncoded)
      : [];
  if (points.length >= 2) pathRef.current = points.map((p) => ({ lat: p.lat, lng: p.lng }));

  const initMap = useCallback(async () => {
    if (!containerRef.current || !mapApiKey) return;
    const { loadGoogleMapsOnce } = await import("@/lib/maps/MapLoader");
    try {
      await loadGoogleMapsOnce(mapApiKey);
    } catch {
      return;
    }
    const g = window.google;
    if (!g?.maps) return;

    const map = new g.maps.Map(containerRef.current, {
      center: { lat: center.lat, lng: center.lng },
      zoom: 15,
      disableDefaultUI: false,
      zoomControl: true,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
      styles: [
        { elementType: "geometry", stylers: [{ color: "#0f1629" }] },
        { elementType: "labels.text.fill", stylers: [{ color: "#94a3b8" }] },
      ],
    });
    mapRef.current = map;

    if (points.length >= 2) {
      const path = points.map((p) => ({ lat: p.lat, lng: p.lng }));
      pathRef.current = path;
      const line = new g.maps.Polyline({
        path,
        geodesic: true,
        strokeColor: "#3b82f6",
        strokeOpacity: 0.8,
        strokeWeight: 4,
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
          scale: isActive ? 14 : 10,
          fillColor: isActive ? "#8b5cf6" : isVisited ? "#64748b" : "#3b82f6",
          fillOpacity: 1,
          strokeColor: "#fff",
          strokeWeight: 2,
        },
      });
      marker.addListener("click", () => onPoiClick?.(poi.poiId));
      markersRef.current.set(poi.poiId, marker);
    });

    if (userLocation) {
      const um = new g.maps.Marker({
        position: { lat: userLocation.lat, lng: userLocation.lng },
        map,
        icon: {
          path: g.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: "#22c55e",
          fillOpacity: 1,
          strokeColor: "#fff",
          strokeWeight: 2,
        },
      });
      userMarkerRef.current = um;
    }
  }, [mapApiKey, center.lat, center.lng]);

  useEffect(() => {
    initMap();
    return () => {
      markersRef.current.forEach((m) => m.setMap(null));
      markersRef.current.clear();
      userMarkerRef.current?.setMap(null);
      userMarkerRef.current = null;
      polylineRef.current?.setMap(null);
      polylineRef.current = null;
      mapRef.current = null;
    };
  }, [initMap]);

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
        scale: isActive ? 14 : 10,
        fillColor: isActive ? "#8b5cf6" : isVisited ? "#64748b" : "#3b82f6",
        fillOpacity: 1,
        strokeColor: "#fff",
        strokeWeight: 2,
      });
    });
  }, [pois, visitedPoiIds, activePoiId]);

  useEffect(() => {
    if (!userLocation || !userMarkerRef.current) return;
    userMarkerRef.current.setPosition({ lat: userLocation.lat, lng: userLocation.lng });
    if (followUser && mapRef.current) {
      mapRef.current.panTo({ lat: userLocation.lat, lng: userLocation.lng });
    }
  }, [userLocation?.lat, userLocation?.lng, followUser]);

  useEffect(() => {
    if (fitBoundsTrigger == null || fitBoundsTrigger === 0) return;
    const map = mapRef.current;
    const path = pathRef.current;
    if (!map || !window.google?.maps || path.length < 2) return;
    const bounds = new window.google.maps.LatLngBounds();
    path.forEach((p) => bounds.extend(p));
    map.fitBounds(bounds, 48);
  }, [fitBoundsTrigger]);

  return (
    <div
      ref={containerRef}
      className={cn("w-full h-full min-h-[200px] bg-navy-900 rounded-2xl", className)}
      aria-label="Map"
    />
  );
}
