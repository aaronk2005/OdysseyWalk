"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Sparkles, Clock, Play, Bookmark, MapPin } from "lucide-react";
import { TourCard } from "@/components/TourCard";
import { OdysseyLogo } from "@/components/OdysseyLogo";
import { listTours } from "@/lib/data/TourRepository";
import { saveTour } from "@/lib/data/SessionStore";
import type { TourSummary, GeneratedTourResponse } from "@/lib/types";

const sectionMotion = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.35 },
};
const cardStagger = 0.05;

const SAVED_KEY = "odyssey-saved-tours";

export interface SavedWalkSummary {
  sessionId: string;
  name: string;
  theme: string;
  poiCount: number;
  estimatedMinutes: number;
  savedAt: number;
}

function getSavedWalks(): SavedWalkSummary[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(SAVED_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return (arr as Array<{ sessionId: string; tourPlan?: { theme?: string; estimatedMinutes?: number }; pois?: unknown[]; savedAt?: number }>)
      .filter((s) => s.sessionId && s.tourPlan)
      .map((s) => ({
        sessionId: s.sessionId,
        name: `${(s.tourPlan?.theme ?? "Tour").replace(/^\w/, (c) => c.toUpperCase())} Walk`,
        theme: s.tourPlan?.theme ?? "tour",
        poiCount: Array.isArray(s.pois) ? s.pois.length : 0,
        estimatedMinutes: s.tourPlan?.estimatedMinutes ?? 30,
        savedAt: s.savedAt ?? 0,
      }));
  } catch {
    return [];
  }
}

export default function ToursPage() {
  const router = useRouter();
  const [savedWalks, setSavedWalks] = useState<SavedWalkSummary[]>([]);
  const [popularTours, setPopularTours] = useState<TourSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSavedWalks(getSavedWalks());
    listTours()
      .then(setPopularTours)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  const handleStartSaved = (sessionId: string) => {
    try {
      const raw = localStorage.getItem(SAVED_KEY);
      const arr = raw ? JSON.parse(raw) : [];
      const item = (arr as Array<{ sessionId: string; tourPlan: unknown; pois: unknown[] }>).find((s) => s.sessionId === sessionId);
      if (item?.tourPlan && Array.isArray(item.pois)) {
        saveTour(item.sessionId, { sessionId: item.sessionId, tourPlan: item.tourPlan, pois: item.pois } as GeneratedTourResponse);
        router.push("/tour/active");
      }
    } catch {
      // ignore
    }
  };

  const hasAny = savedWalks.length > 0 || popularTours.length > 0;

  return (
    <div className="min-h-screen bg-app-bg">
      <header className="sticky top-0 z-20 border-b border-app-border bg-surface/95 backdrop-blur-sm px-4 py-3 safe-bottom">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <Link
            href="/"
            className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full hover:bg-app-bg text-ink-primary transition-colors"
            aria-label="Back to home"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <Link href="/" className="min-h-[44px] flex items-center shrink-0" aria-label="Odyssey Walk home">
            <OdysseyLogo size="sm" />
          </Link>
          <h1 className="text-xl font-bold tracking-tight text-ink-primary flex-1" style={{ letterSpacing: "-0.025em" }}>
            Walks
          </h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 sm:py-8">
        {loading && (
          <div className="grid gap-4 sm:grid-cols-2">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="rounded-card border border-app-border bg-surface overflow-hidden shadow-sm"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <div className="aspect-[16/10] bg-surface-muted animate-pulse" />
                <div className="p-4 space-y-2">
                  <div className="h-4 w-3/4 rounded bg-surface-muted animate-pulse" />
                  <div className="h-3 w-1/2 rounded bg-surface-muted animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        )}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-card border border-red-200/80 bg-red-50/90 p-5 text-red-800 shadow-sm"
          >
            <p className="text-body font-medium">{error}</p>
            <Link
              href="/demo"
              className="inline-flex items-center gap-1.5 mt-3 text-sm text-brand-primary font-semibold hover:underline"
            >
              Try demo instead
            </Link>
          </motion.div>
        )}

        {!loading && (
          <>
            <motion.section className="space-y-4" {...sectionMotion}>
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-1 rounded-full bg-brand-primary" aria-hidden />
                <h2 className="text-heading-sm text-ink-primary">Your saved walks</h2>
              </div>
              {savedWalks.length === 0 ? (
                <div className="rounded-card border border-app-border bg-surface-muted/60 p-8 text-center">
                  <Bookmark className="w-10 h-10 mx-auto text-ink-tertiary mb-3" strokeWidth={1.25} />
                  <p className="text-body text-ink-secondary max-w-sm mx-auto">
                    No saved walks yet. Complete a tour and tap “Save Tour” on the completion screen.
                  </p>
                  {hasAny && (
                    <Link
                      href="/create"
                      className="inline-block mt-4 text-brand-primary font-semibold hover:underline focus:outline-none focus:ring-2 focus:ring-brand-primary/30 rounded-button px-2 py-1"
                    >
                      Create a tour
                    </Link>
                  )}
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {savedWalks.map((s, i) => (
                    <motion.div
                      key={s.sessionId}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: i * cardStagger }}
                      className="rounded-card border border-app-border bg-surface p-4 flex flex-col gap-3 shadow-sm hover:shadow-md hover:border-brand-primary/20 transition-all duration-200"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-primary/10 text-brand-primary">
                          <Bookmark className="w-4 h-4" strokeWidth={2} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="font-semibold text-ink-primary truncate">{s.name}</h3>
                          <p className="text-caption text-ink-secondary flex items-center gap-2 mt-0.5">
                            <Clock className="w-3.5 h-3.5 shrink-0" />
                            {s.estimatedMinutes} min · {s.poiCount} stops
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleStartSaved(s.sessionId)}
                        className="mt-auto flex items-center justify-center gap-2 py-2.5 rounded-button bg-brand-primary text-white font-medium hover:bg-brand-primaryHover min-h-[44px] transition-colors active:scale-[0.98]"
                      >
                        <Play className="w-4 h-4" fill="currentColor" />
                        Start again
                      </button>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.section>

            <motion.section
              className="mt-12 sm:mt-14 space-y-4"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.08 }}
            >
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-1 rounded-full bg-brand-primary" aria-hidden />
                <div>
                  <h2 className="text-heading-sm text-ink-primary">Popular walks</h2>
                  <p className="text-caption text-ink-secondary mt-0.5">Premade walks in popular areas.</p>
                </div>
              </div>
              {popularTours.length === 0 ? (
                <div className="rounded-card border border-app-border bg-surface-muted/60 p-8 text-center">
                  <MapPin className="w-10 h-10 mx-auto text-ink-tertiary mb-3" strokeWidth={1.25} />
                  <p className="text-body text-ink-secondary max-w-sm mx-auto">
                    {hasAny
                      ? "No premade tours loaded. You can still create your own or try the demo."
                      : "No premade walks available."}
                  </p>
                  {hasAny && (
                    <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
                      <Link href="/create" className="text-brand-primary font-semibold hover:underline">
                        Create a tour
                      </Link>
                      <span className="text-ink-tertiary">·</span>
                      <Link href="/demo" className="text-brand-primary font-semibold hover:underline">
                        Try demo
                      </Link>
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid gap-5 sm:grid-cols-2">
                  {popularTours.map((tour, i) => (
                    <TourCard key={tour.tourId} tour={tour} index={i} />
                  ))}
                </div>
              )}
            </motion.section>

            {!hasAny && !loading && !error && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.1 }}
                className="mt-12 sm:mt-14 rounded-card border border-app-border bg-gradient-to-b from-surface to-surface-muted/50 p-10 text-center shadow-sm"
              >
                <p className="text-body text-ink-secondary max-w-sm mx-auto mb-6">
                  No saved or popular walks yet. Create a tour or try a premade one.
                </p>
                <Link
                  href="/create"
                  className="inline-flex items-center justify-center gap-2 py-3.5 px-8 rounded-full bg-brand-primary text-white text-base font-semibold hover:bg-brand-primaryHover min-h-[48px] transition-colors shadow-md shadow-brand-primary/20 active:scale-[0.98]"
                >
                  <Sparkles className="w-5 h-5" />
                  Create your first tour
                </Link>
                <p className="text-caption text-ink-tertiary mt-4">
                  Or{" "}
                  <Link href="/demo" className="text-brand-primary font-semibold hover:underline">
                    try the demo
                  </Link>{" "}
                  first.
                </p>
              </motion.div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
