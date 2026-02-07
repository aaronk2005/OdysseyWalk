"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { PlaceSearchBox, type PlaceResult } from "@/components/PlaceSearchBox";
import { TourGenerationPanel, type TourPreferences } from "@/components/TourGenerationPanel";
import { MapView } from "@/components/MapView";
import { saveTour } from "@/lib/data/SessionStore";
import type { GeneratedTourResponse, Theme } from "@/lib/types";
import { getClientConfig } from "@/lib/config";
import { cn } from "@/lib/utils/cn";

const DEFAULT_PREFERENCES: TourPreferences = {
  theme: "history",
  durationMin: 30,
  lang: "en",
  voiceStyle: "friendly",
};

export default function CreateTourPage() {
  const router = useRouter();
  const clientConfig = getClientConfig();
  const mapKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

  const [startPlace, setStartPlace] = useState<PlaceResult | null>(null);
  const [searchLabel, setSearchLabel] = useState("");
  const [preferences, setPreferences] = useState<TourPreferences>(DEFAULT_PREFERENCES);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generated, setGenerated] = useState<GeneratedTourResponse | null>(null);

  const handlePlaceSelect = useCallback((place: PlaceResult) => {
    setStartPlace(place);
    setSearchLabel(place.label);
    setError(null);
  }, []);

  const handleMapClick = useCallback((lat: number, lng: number) => {
    const place: PlaceResult = { lat, lng, label: "Dropped pin" };
    setStartPlace(place);
    setSearchLabel(place.label);
    setError(null);
  }, []);

  const handleGenerate = useCallback(async () => {
    const start = startPlace ?? { label: searchLabel || "Current location", lat: 37.7849, lng: -122.4094 };
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/tour/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          start: { lat: start.lat, lng: start.lng, label: start.label },
          theme: preferences.theme as Theme,
          durationMin: preferences.durationMin,
          lang: preferences.lang,
          voiceStyle: preferences.voiceStyle,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Generate failed");
      setGenerated(data as GeneratedTourResponse);
      saveTour(data.sessionId, data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  }, [startPlace, searchLabel, preferences]);

  const handleStartWalk = useCallback(() => {
    if (generated) router.push("/tour/active");
  }, [generated, router]);

  const center = startPlace
    ? { lat: startPlace.lat, lng: startPlace.lng }
    : { lat: 37.7849, lng: -122.4094 };
  const routePoints = generated?.tourPlan?.routePoints ?? [];
  const pois = generated?.pois ?? [];

  return (
    <div className="min-h-screen bg-navy-950 flex flex-col">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-navy-950/90 backdrop-blur px-4 py-4">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <Link href="/" className="p-2 rounded-lg hover:bg-white/10 text-white" aria-label="Back">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="font-semibold text-xl text-white">Create Tour</h1>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-6 space-y-6">
        <div className="space-y-2">
          <label className="text-sm font-medium text-white/80">Starting location</label>
          <PlaceSearchBox
            value={searchLabel}
            onChange={setSearchLabel}
            onPlaceSelect={handlePlaceSelect}
            placeholder="Search for a place or click the map"
            mapApiKey={mapKey}
          />
          {startPlace && (
            <p className="text-xs text-emerald-400">
              Selected: {startPlace.label}
            </p>
          )}
        </div>

        <TourGenerationPanel
          preferences={preferences}
          onPreferencesChange={setPreferences}
          onGenerate={handleGenerate}
          generating={generating}
        />

        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-200 text-sm">
            {error}
          </div>
        )}

        {generated && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <p className="text-white/80">
              Route with {generated.pois.length} stops. Review the map and start when ready.
            </p>
            <button
              type="button"
              onClick={handleStartWalk}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-accent-blue to-accent-purple text-white font-semibold"
            >
              Start Walk
            </button>
          </motion.div>
        )}

        <div className={cn("rounded-2xl overflow-hidden border border-white/10", !mapKey && "aspect-video bg-navy-800 flex items-center justify-center")}>
          {mapKey ? (
            <MapView
              mapApiKey={mapKey}
              center={center}
              routePoints={routePoints.length >= 2 ? routePoints : undefined}
              pois={pois}
              userLocation={startPlace ? { lat: startPlace.lat, lng: startPlace.lng } : null}
              visitedPoiIds={[]}
              activePoiId={null}
              onMapClick={handleMapClick}
              followUser={false}
              className="aspect-video w-full"
            />
          ) : (
            <p className="text-white/50 text-sm">Add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to show the map.</p>
          )}
        </div>

        <p className="text-center text-sm text-white/50">
          <Link href="/demo" className="text-accent-blue hover:underline">Try the demo</Link> without generating a tour.
        </p>
      </main>
    </div>
  );
}
