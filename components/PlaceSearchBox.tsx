"use client";

import { useRef, useEffect } from "react";
import { MapPin } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface PlaceResult {
  label: string;
  lat: number;
  lng: number;
}

interface PlaceSearchBoxProps {
  value: string;
  onChange: (value: string) => void;
  onPlaceSelect: (place: PlaceResult) => void;
  placeholder?: string;
  className?: string;
  mapApiKey: string;
}

export function PlaceSearchBox({
  value,
  onChange,
  onPlaceSelect,
  placeholder = "Search for a place or click the map",
  className,
  mapApiKey,
}: PlaceSearchBoxProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  useEffect(() => {
    if (!mapApiKey || !inputRef.current || typeof window === "undefined") return;
    let mounted = true;
    import("@/lib/maps/MapLoader").then(({ loadGoogleMapsOnce }) => {
      loadGoogleMapsOnce(mapApiKey)
        .then(() => {
          if (!mounted || !inputRef.current) return;
          const g = (typeof window !== "undefined" && window.google) as typeof google | undefined;
          if (!g?.maps?.places) return;
          const Autocomplete = g.maps.places.Autocomplete;
          const autocomplete = new Autocomplete(inputRef.current, {
            types: ["establishment", "geocode"],
            fields: ["place_id", "geometry", "formatted_address", "name"],
          });
          autocomplete.addListener("place_changed", () => {
            const place = autocomplete.getPlace();
            const loc = place.geometry?.location;
            if (loc) {
              onPlaceSelect({
                label: (place.formatted_address as string) || (place.name as string) || "Selected place",
                lat: loc.lat(),
                lng: loc.lng(),
              });
              onChange((place.formatted_address as string) || (place.name as string) || "");
            }
          });
          autocompleteRef.current = autocomplete;
        })
        .catch(() => {});
    });
    return () => {
      mounted = false;
      autocompleteRef.current = null;
    };
  }, [mapApiKey, onPlaceSelect, onChange]);

  return (
    <div className={cn("relative", className)}>
      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50 pointer-events-none" />
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          "w-full pl-10 pr-4 py-3 rounded-xl bg-navy-800/80 border border-white/10",
          "text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-accent-blue/50"
        )}
      />
    </div>
  );
}
