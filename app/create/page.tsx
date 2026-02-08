"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Locate } from "lucide-react";
import { PlaceSearchBox, type PlaceResult } from "@/components/PlaceSearchBox";
import { TourGenerationPanel, type TourPreferences } from "@/components/TourGenerationPanel";
import { MapView } from "@/components/MapView";
import { MapsKeyBanner } from "@/components/MapsKeyBanner";
import { ApiStatusBanner } from "@/components/ApiStatusBanner";
import { OdysseyLogo } from "@/components/OdysseyLogo";
import { GeneratingSteps } from "@/components/GeneratingSteps";
import { useToast } from "@/components/ToastProvider";
import { saveTour } from "@/lib/data/SessionStore";
import type { GeneratedTourResponse, Theme } from "@/lib/types";
import { fetchWithTimeout } from "@/lib/net/fetchWithTimeout";
import { cn } from "@/lib/utils/cn";

const DEFAULT_PREFERENCES: TourPreferences = {
  theme: "history",
  durationMin: 30,
  lang: "en",
  voiceStyle: "friendly",
};

const GENERATE_TIMEOUT_MS = 30000;

export default function CreateTourPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const mapKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

  const [startPlace, setStartPlace] = useState<PlaceResult | null>(null);
  const [searchLabel, setSearchLabel] = useState("");
  const [preferences, setPreferences] = useState<TourPreferences>(DEFAULT_PREFERENCES);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generated, setGenerated] = useState<GeneratedTourResponse | null>(null);
  const [locating, setLocating] = useState(false);
  const [fitBoundsTrigger, setFitBoundsTrigger] = useState(0);
  const generatingRef = useRef(false);

  const handleUseMyLocation = useCallback(() => {
    if (typeof window === "undefined") {
      showToast("Location is not available.", "error");
      return;
    }
    setLocating(true);
    setError(null);

    const onSuccess = (lat: number, lng: number) => {
      const place: PlaceResult = { lat, lng, label: "My location" };
      setStartPlace(place);
      setSearchLabel("My location");
      setLocating(false);
      showToast("Location set. You can generate a tour from here.", "success");
    };

    const onFail = (msg: string) => {
      setLocating(false);
      showToast(msg, "error");
    };

    // Try Google Maps Geolocation API first (works over HTTP, no permissions needed)
    const geoApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    const tryGoogleGeolocate = () => {
      if (!geoApiKey) return false;
      fetch(`https://www.googleapis.com/geolocation/v1/geolocate?key=${geoApiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ considerIp: true }),
      })
        .then((r) => r.json())
        .then((data) => {
          if (data?.location?.lat && data?.location?.lng) {
            onSuccess(data.location.lat, data.location.lng);
          } else {
            onFail("Could not determine your location. Use the search bar or tap the map instead.");
          }
        })
        .catch(() => {
          onFail("Could not determine your location. Use the search bar or tap the map instead.");
        });
      return true;
    };

    // Try browser geolocation (needs secure context + permission)
    if (navigator.geolocation && window.isSecureContext) {
      navigator.geolocation.getCurrentPosition(
        (pos) => onSuccess(pos.coords.latitude, pos.coords.longitude),
        (err) => {
          console.warn("[Geolocation] Browser geolocation failed:", err.code, err.message);
          // Fallback to Google Geolocation API
          if (!tryGoogleGeolocate()) {
            const msg =
              err.code === 1
                ? "Location blocked. Allow location in your browser, or use the search bar to find a place."
                : "Could not get your location. Use the search bar or tap the map to set a starting point.";
            onFail(msg);
          }
        },
        { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 }
      );
    } else {
      // No secure context or no browser geolocation — use Google API
      if (!tryGoogleGeolocate()) {
        onFail("Location requires HTTPS. Use the search bar or tap the map to set a starting point.");
      }
    }
  }, [showToast]);

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
    if (generatingRef.current) return;
    generatingRef.current = true;
    const start = startPlace ?? { label: searchLabel || "Current location", lat: 37.7849, lng: -122.4094 };
    setGenerating(true);
    setError(null);
    try {
      // Ensure tour/generate receives numeric lat/lng and a non-empty label (required by API)
      const startPayload = {
        lat: Number(start.lat),
        lng: Number(start.lng),
        label: String(start.label || "Location").trim() || "Location",
      };
      const res = await fetchWithTimeout(
        "/api/tour/generate",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            start: startPayload,
            theme: preferences.theme as Theme,
            durationMin: preferences.durationMin,
            lang: preferences.lang,
            voiceStyle: preferences.voiceStyle,
          }),
        },
        { timeoutMs: GENERATE_TIMEOUT_MS }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Generate failed");
      const typed = data as GeneratedTourResponse;
      setGenerated(typed);
      saveTour(typed.sessionId, typed);
      if (typed.tourPlan?.routePoints?.length >= 2) setFitBoundsTrigger((t) => t + 1);
      showToast(`Tour generated! ${typed.pois.length} stops ready.`, "success");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Generation failed";
      setError(msg);
      showToast(msg, "error");
    } finally {
      generatingRef.current = false;
      setGenerating(false);
    }
  }, [startPlace, searchLabel, preferences, showToast]);

  const handleLoadSampleTour = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch("/tours/sample.json");
      if (!res.ok) throw new Error("Sample tour unavailable");
      const raw = (await res.json()) as {
        tour: { tourId: string; routePoints: { lat: number; lng: number }[]; estimatedMinutes: number };
        pois: Array<{
          poiId: string; name: string; lat: number; lng: number; radiusM: number;
          scripts?: { friendly?: string }; facts: string[];
        }>;
      };
      const tourPlan = {
        intro: "Welcome to this sample downtown heritage walk. Enjoy the tour.",
        outro: "Thanks for exploring with us. We hope you enjoyed the tour.",
        theme: "history",
        estimatedMinutes: raw.tour.estimatedMinutes,
        routePoints: raw.tour.routePoints,
      };
      const pois = raw.pois.map((p) => ({
        poiId: p.poiId,
        name: p.name,
        lat: p.lat,
        lng: p.lng,
        radiusM: p.radiusM,
        script: p.scripts?.friendly ?? "",
        facts: p.facts,
      }));
      const data: GeneratedTourResponse = {
        sessionId: raw.tour.tourId,
        tourPlan,
        pois,
      };
      setGenerated(data);
      saveTour(data.sessionId, data);
      if (data.tourPlan?.routePoints?.length >= 2) setFitBoundsTrigger((t) => t + 1);
      showToast("Sample tour loaded. You can start the walk.", "success");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not load sample tour";
      setError(msg);
      showToast(msg, "error");
    }
  }, [showToast]);

  const handleStartWalk = useCallback(() => {
    if (generated) router.push("/tour/active");
  }, [generated, router]);

  const center = startPlace
    ? { lat: startPlace.lat, lng: startPlace.lng }
    : { lat: 37.7849, lng: -122.4094 };
  const routePoints = generated?.tourPlan?.routePoints ?? [];
  const pois = generated?.pois ?? [];

  return (
    <div className="min-h-screen bg-app-bg flex flex-col">
      <header className="sticky top-0 z-20 border-b border-app-border bg-surface shadow-sm px-4 py-4 safe-bottom">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <Link href="/" className="p-2.5 rounded-button hover:bg-app-bg text-ink-primary transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center" aria-label="Back to home">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <Link href="/" className="min-h-[44px] flex items-center shrink-0" aria-label="Odyssey Walk home">
            <OdysseyLogo size="sm" />
          </Link>
          <h1 className="text-heading-sm flex-1">Create Tour</h1>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-6 space-y-6">
        {/* Resume banner removed */}
        {!mapKey && <MapsKeyBanner className="mb-2" />}
        <ApiStatusBanner className="mb-2" />
        <div className="space-y-2">
          <p className="text-hint text-ink-tertiary">Step 1: Set your start</p>
          <p className="text-caption text-ink-secondary">
            Tap the map or search to set your starting point.
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-caption font-medium text-ink-primary" id="start-location-label">Starting location</label>
          <div className="flex gap-2">
            <PlaceSearchBox
              value={searchLabel}
              onChange={setSearchLabel}
              onPlaceSelect={handlePlaceSelect}
              placeholder="Search for a place or tap the map"
              mapApiKey={mapKey}
              className="flex-1 min-w-0"
            />
            <button
              type="button"
              onClick={handleUseMyLocation}
              disabled={locating}
              className={cn(
                "shrink-0 flex items-center justify-center gap-1.5 px-4 rounded-button min-h-[44px] min-w-[44px]",
                "bg-surface border border-app-border text-ink-primary font-medium shadow-sm",
                "hover:bg-surface-muted disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              )}
              title="Use my current location"
              aria-label="Use my current location"
            >
              {locating ? (
                <span className="w-4 h-4 rounded-full border-2 border-ink-tertiary border-t-brand-primary animate-spin" />
              ) : (
                <Locate className="w-4 h-4 text-brand-primary" />
              )}
              <span className="hidden sm:inline">{locating ? "Locating…" : "My location"}</span>
            </button>
          </div>
          {!startPlace && (
            <p className="text-hint text-ink-tertiary">Search or tap the map to set your starting point.</p>
          )}
          {startPlace && (
            <p className="text-hint text-brand-primary font-medium">
              Selected: {startPlace.label}
            </p>
          )}
        </div>

        <div className={cn("rounded-card overflow-hidden border border-app-border shadow-sm", !mapKey && "aspect-video bg-surface-muted flex items-center justify-center")}>
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
              fitBoundsTrigger={routePoints.length >= 2 ? fitBoundsTrigger : undefined}
              className="aspect-video w-full"
            />
          ) : (
            <p className="text-ink-tertiary text-caption p-4">Add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to show the map.</p>
          )}
        </div>

        <div className="space-y-2">
          <p className="text-hint text-ink-tertiary">Step 2: Preferences</p>
          <TourGenerationPanel
            preferences={preferences}
            onPreferencesChange={setPreferences}
            onGenerate={handleGenerate}
            generating={generating}
            disabled={generating}
          />
        </div>

        <AnimatePresence>
          {generating && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="rounded-card border border-app-border bg-surface p-6"
            >
              <GeneratingSteps />
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="rounded-card border border-red-200 bg-red-50 p-4 text-red-800 text-body space-y-3"
            >
              <p>{error}</p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => { setError(null); handleGenerate(); }}
                  className="px-3 py-2 rounded-button bg-surface border border-app-border text-ink-primary text-sm font-medium hover:bg-surface-muted"
                >
                  Retry
                </button>
                <button
                  type="button"
                  onClick={handleLoadSampleTour}
                  className="px-3 py-2 rounded-button bg-brand-secondary text-white text-sm font-medium hover:bg-brand-secondaryHover"
                >
                  Use sample tour
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {generated && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "tween", duration: 0.3 }}
            className="space-y-4"
          >
            <p className="text-caption text-ink-secondary">
              Route with {generated.pois.length} stops. Review the map and start when ready.
            </p>
            <button
              type="button"
              onClick={handleStartWalk}
              className="w-full py-3.5 rounded-button bg-brand-primary text-white font-semibold shadow-md hover:bg-brand-primaryHover active:scale-[0.99] transition-transform min-h-[48px]"
            >
              Start Walk
            </button>
          </motion.div>
        )}

      </main>
    </div>
  );
}
