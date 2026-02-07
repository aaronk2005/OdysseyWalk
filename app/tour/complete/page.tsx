"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Sparkles, RotateCcw, Share2, CheckCircle2 } from "lucide-react";
import { MapView } from "@/components/MapView";
import { OdysseyLogo } from "@/components/OdysseyLogo";
import { Confetti } from "@/components/Confetti";
import { useToast } from "@/components/ToastProvider";
import { loadTour, updateSession } from "@/lib/data/SessionStore";
import type { SessionState } from "@/lib/types";

/**
 * Walk Complete: emotional payoff. Map zoomed out, friendly message, stats, clear CTAs.
 */
export default function TourCompletePage() {
  const [session, setSession] = useState<SessionState | null>(null);
  const [fitBoundsTrigger, setFitBoundsTrigger] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const { showToast } = useToast();
  const mapKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

  useEffect(() => {
    const s = loadTour();
    if (s && !s.endedAt) {
      updateSession({ endedAt: Date.now() });
      setSession(loadTour());
    } else {
      setSession(s);
    }
    // Show confetti on mount for celebration
    setShowConfetti(true);
  }, []);

  useEffect(() => {
    if (session?.tourPlan.routePoints?.length) {
      setFitBoundsTrigger((k) => k + 1);
    }
  }, [session?.sessionId]);

  const handleSaveTour = () => {
    const s = loadTour();
    if (s && typeof window !== "undefined") {
      try {
        const saved = JSON.parse(localStorage.getItem("odyssey-saved-tours") ?? "[]");
        saved.push({ ...s, savedAt: Date.now() });
        localStorage.setItem("odyssey-saved-tours", JSON.stringify(saved));
      } catch {
        // ignore
      }
    }
  };

  const handleShare = async () => {
    const tourName = session?.tourPlan?.theme
      ? `${session.tourPlan.theme.charAt(0).toUpperCase() + session.tourPlan.theme.slice(1)} Walk`
      : "Odyssey Walk";
    const text = `I just completed "${tourName}" on Odyssey Walk.`;
    const url = typeof window !== "undefined" ? window.location.origin : "";
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: "Odyssey Walk",
          text,
          url,
        });
        showToast("Shared successfully!", "success");
      } catch (e) {
        if ((e as Error).name !== "AbortError") {
          try {
            await navigator.clipboard.writeText(`${text} ${url}`);
            showToast("Link copied to clipboard", "success");
          } catch {
            showToast("Could not share", "error");
          }
        }
      }
    } else {
      try {
        await navigator.clipboard.writeText(`${text} ${url}`);
        showToast("Link copied to clipboard", "success");
      } catch {
        showToast("Could not copy link", "error");
      }
    }
  };

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-app-bg">
        <div className="w-10 h-10 rounded-full border-2 border-brand-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  const { tourPlan, pois, visitedPoiIds, startedAt, endedAt } = session;
  const durationMs = endedAt && startedAt ? endedAt - startedAt : 0;
  const durationMin = Math.round(durationMs / 60000);
  const visited = pois.filter((p) => visitedPoiIds.includes(p.poiId));
  const tourLabel =
    tourPlan.theme.charAt(0).toUpperCase() + tourPlan.theme.slice(1) + " Walk";

  return (
    <div className="min-h-screen bg-app-bg flex flex-col">
      {showConfetti && <Confetti />}
      <header className="sticky top-0 z-20 border-b border-app-border bg-surface/95 backdrop-blur-sm safe-top">
        <div className="max-w-2xl mx-auto flex items-center gap-4 px-3 py-2.5">
          <Link
            href="/create"
            className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full hover:bg-app-bg text-ink-primary transition-colors"
            aria-label="Back to create"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <Link href="/" className="min-h-[44px] flex items-center shrink-0" aria-label="Odyssey Walk home">
            <OdysseyLogo size="sm" />
          </Link>
          <h1 className="text-heading-sm flex-1">Walk complete</h1>
        </div>
      </header>

      <main className="flex-1 flex flex-col max-w-2xl mx-auto w-full">
        {/* Map: zoomed out to show full route, completed stops checked */}
        {mapKey && tourPlan.routePoints?.length ? (
          <div className="h-[28vh] min-h-[180px] relative overflow-hidden rounded-b-2xl">
            <MapView
              mapApiKey={mapKey}
              center={
                tourPlan.routePoints[0]
                  ? { lat: tourPlan.routePoints[0].lat, lng: tourPlan.routePoints[0].lng }
                  : { lat: 37.78, lng: -122.41 }
              }
              routePoints={tourPlan.routePoints}
              pois={pois}
              userLocation={null}
              visitedPoiIds={visitedPoiIds}
              activePoiId={null}
              followUser={false}
              fitBoundsTrigger={fitBoundsTrigger}
              navigationMode
              className="absolute inset-0 rounded-none"
            />
          </div>
        ) : null}

        {/* Message + stats + CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="px-4 py-6 pb-10"
        >
          <div className="flex items-center gap-3 mb-4">
            <CheckCircle2 className="w-10 h-10 text-brand-primary shrink-0" />
            <div>
              <h2 className="text-xl font-bold text-ink-primary tracking-tight">
                Nice walk.
              </h2>
              <p className="text-body text-ink-secondary">
                You walked, you listened, you asked. The {tourLabel} is complete.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="rounded-2xl bg-surface border border-app-border p-4">
              <p className="text-hint text-ink-tertiary uppercase tracking-wider">Stops visited</p>
              <p className="text-2xl font-semibold text-ink-primary">{visited.length}</p>
            </div>
            <div className="rounded-2xl bg-surface border border-app-border p-4">
              <p className="text-hint text-ink-tertiary uppercase tracking-wider">Duration</p>
              <p className="text-2xl font-semibold text-ink-primary">
                {durationMin > 0 ? `${durationMin} min` : "—"}
              </p>
            </div>
            {tourPlan.distanceMeters != null && tourPlan.distanceMeters > 0 && (
              <div className="rounded-2xl bg-surface border border-app-border p-4 col-span-2">
                <p className="text-hint text-ink-tertiary uppercase tracking-wider">Distance</p>
                <p className="text-xl font-semibold text-ink-primary">
                  {(tourPlan.distanceMeters / 1000).toFixed(1)} km
                </p>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3">
            <Link
              href="/create"
              className="flex items-center justify-center gap-2 py-4 rounded-2xl bg-brand-primary text-white font-bold hover:bg-brand-primaryHover transition-colors min-h-[52px]"
            >
              <Sparkles className="w-5 h-5" />
              Create another walk
            </Link>
            <Link
              href="/tour/active"
              className="flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-surface border border-app-border text-ink-primary font-medium hover:bg-surface-muted transition-colors min-h-[48px]"
            >
              <RotateCcw className="w-4 h-4" />
              Replay narration
            </Link>
            <button
              type="button"
              onClick={handleShare}
              className="flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-surface border border-app-border text-ink-primary font-medium hover:bg-surface-muted transition-colors min-h-[48px]"
            >
              <Share2 className="w-4 h-4" />
              Share this walk
            </button>
          </div>

          <button
            type="button"
            onClick={handleSaveTour}
            className="mt-4 w-full py-2.5 text-sm text-ink-tertiary hover:text-ink-secondary transition-colors"
          >
            Save tour to my list
          </button>
        </motion.div>
      </main>
    </div>
  );
}
