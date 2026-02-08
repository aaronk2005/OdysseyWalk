"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { ArrowLeft, Sparkles, RotateCcw, CheckCircle2 } from "lucide-react";
import { MapView } from "@/components/MapView";
import { OdysseyLogo } from "@/components/OdysseyLogo";
import { Confetti } from "@/components/Confetti";
import { useToast } from "@/components/ToastProvider";
import { loadTour, updateSession } from "@/lib/data/SessionStore";
import { AudioSessionManager } from "@/lib/audio/AudioSessionManager";
import type { SessionState } from "@/lib/types";

/**
 * Walk Complete: "Where you walked" — same layout as pre-walk (map top, sheet bottom).
 * Plays the outro audio on load. Map shows full route and visited stops.
 */
export default function TourCompletePage() {
  const [session, setSession] = useState<SessionState | null>(null);
  const [fitBoundsTrigger, setFitBoundsTrigger] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const outroPlayedRef = useRef(false);
  const { showToast } = useToast();
  const prefersReducedMotion = usePrefersReducedMotion();
  const mapKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

  useEffect(() => {
    const s = loadTour();
    if (s && !s.endedAt) {
      updateSession({ endedAt: Date.now() });
      setSession(loadTour());
    } else {
      setSession(s);
    }
    setShowConfetti(true);
  }, []);

  useEffect(() => {
    if (session?.tourPlan.routePoints?.length) {
      setFitBoundsTrigger((k) => k + 1);
    }
  }, [session?.sessionId]);

  // Play outro when we have session (voice options from tourPlan for consistent TTS)
  useEffect(() => {
    if (!session?.tourPlan?.outro || outroPlayedRef.current) return;
    outroPlayedRef.current = true;
    const { voiceLang, voiceStyle } = session.tourPlan;
    if (voiceLang) AudioSessionManager.setOptions({ lang: voiceLang });
    if (voiceStyle) AudioSessionManager.setOptions({ voiceStyle });
    AudioSessionManager.playOutro(session.tourPlan.outro).catch(() => {});
  }, [session?.sessionId, session?.tourPlan?.outro, session?.tourPlan?.voiceLang, session?.tourPlan?.voiceStyle]);

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
  const meta = [
    durationMin > 0 && `${durationMin} min`,
    `${visited.length} stop${visited.length !== 1 ? "s" : ""}`,
    tourPlan.distanceMeters != null && tourPlan.distanceMeters > 0 &&
      `${(tourPlan.distanceMeters / 1000).toFixed(1)} km`,
  ]
    .filter(Boolean)
    .join(" · ");
  const center = tourPlan.routePoints?.[0]
    ? { lat: tourPlan.routePoints[0].lat, lng: tourPlan.routePoints[0].lng }
    : { lat: 37.78, lng: -122.41 };

  return (
    <div className="fixed inset-0 flex flex-col bg-app-bg">
      {showConfetti && <Confetti />}

      {/* Header: absolute like pre-walk */}
      <header className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 py-3 z-20 safe-top">
        <Link
          href="/create"
          className="p-2 min-w-[40px] min-h-[40px] flex items-center justify-center rounded-full hover:bg-surface/80 text-ink-primary transition-colors"
          aria-label="Back to create"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <Link href="/" className="min-h-[40px] flex items-center justify-center" aria-label="Odyssey Walk home">
          <OdysseyLogo size="sm" />
        </Link>
        <span className="w-9 min-w-[36px]" aria-hidden />
      </header>

      {/* Map: where you walked — same proportion as pre-walk */}
      <div
        className="absolute left-0 right-0 flex flex-col shrink-0"
        style={{ paddingTop: "max(env(safe-area-inset-top), 52px)" }}
      >
        <div className="h-[62vh] min-h-[260px] relative overflow-hidden">
          {mapKey && tourPlan.routePoints?.length ? (
            <MapView
              mapApiKey={mapKey}
              center={center}
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
          ) : (
            <div className="absolute inset-0 flex items-center justify-center p-4 bg-surface-muted">
              <p className="text-caption text-ink-secondary text-center">Map unavailable</p>
            </div>
          )}
        </div>
      </div>

      {/* Bottom sheet: same style as pre-walk briefing */}
      <motion.div
        initial={prefersReducedMotion ? { opacity: 0 } : { y: "100%" }}
        animate={prefersReducedMotion ? { opacity: 1 } : { y: 0 }}
        transition={prefersReducedMotion ? { duration: 0.2 } : { type: "spring", damping: 28, stiffness: 200 }}
        className="absolute bottom-0 left-0 right-0 z-30 min-h-[38vh] rounded-t-3xl bg-surface shadow-[0_-12px_40px_rgba(0,0,0,0.12)] safe-bottom flex flex-col justify-end overflow-y-auto"
      >
        <div className="flex justify-center pt-3 pb-1">
          <span className="w-10 h-1 rounded-full bg-ink-tertiary/30" aria-hidden />
        </div>

        <div className="px-6 pb-8 pt-2 max-w-lg mx-auto w-full">
          <h2 className="text-xl font-bold text-ink-primary text-center tracking-tight">
            {tourLabel}
          </h2>
          <p className="text-center text-caption text-ink-secondary mt-1.5">{meta}</p>

          <div className="flex items-center gap-3 mt-4">
            <CheckCircle2 className="w-10 h-10 text-brand-primary shrink-0" />
            <div>
              <p className="text-body text-ink-secondary">
                You walked, you listened, you asked. Here&apos;s where you went.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-4">
            <div className="rounded-xl bg-app-bg/80 border border-app-border p-3">
              <p className="text-hint text-ink-tertiary uppercase tracking-wider">Stops visited</p>
              <p className="text-xl font-semibold text-ink-primary">{visited.length}</p>
            </div>
            <div className="rounded-xl bg-app-bg/80 border border-app-border p-3">
              <p className="text-hint text-ink-tertiary uppercase tracking-wider">Duration</p>
              <p className="text-xl font-semibold text-ink-primary">
                {durationMin > 0 ? `${durationMin} min` : "—"}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 mt-5">
            <Link
              href="/create"
              className="flex items-center justify-center py-4 rounded-2xl bg-brand-primary text-white font-bold hover:bg-brand-primaryHover transition-colors min-h-[52px]"
            >
              Create another walk
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
