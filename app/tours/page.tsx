"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Sparkles } from "lucide-react";
import { TourCard } from "@/components/TourCard";
import { OdysseyLogo } from "@/components/OdysseyLogo";
import { listTours } from "@/lib/data/TourRepository";
import type { TourSummary } from "@/lib/types";

export default function ToursPage() {
  const [tours, setTours] = useState<TourSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listTours()
      .then(setTours)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-app-bg">
      <header className="sticky top-0 z-20 border-b border-app-border bg-surface shadow-sm px-4 py-4 safe-bottom">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <Link
            href="/"
            className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-button hover:bg-app-bg text-ink-primary"
            aria-label="Back to home"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <Link href="/" className="min-h-[44px] flex items-center shrink-0" aria-label="Odyssey Walk home">
            <OdysseyLogo size="sm" />
          </Link>
          <h1 className="text-heading-sm flex-1">Tours</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {loading && (
          <div className="grid gap-4 sm:grid-cols-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-48 rounded-card bg-surface-muted animate-pulse border border-app-border"
              />
            ))}
          </div>
        )}
        {error && (
          <div className="rounded-card border border-red-200 bg-red-50 p-4 text-red-800">
            <p>{error}</p>
            <Link href="/demo" className="text-sm text-brand-primary font-medium mt-2 inline-block hover:underline">
              Try Demo instead
            </Link>
          </div>
        )}
        {!loading && !error && tours.length === 0 && (
          <div className="rounded-card border border-app-border bg-surface p-8 text-center space-y-4">
            <p className="text-body text-ink-secondary">No saved tours yet. Create a tour and save it from the completion screen to see it here.</p>
            <Link
              href="/create"
              className="inline-flex items-center justify-center gap-2 py-3 px-6 rounded-button bg-brand-primary text-white font-medium hover:bg-brand-primaryHover min-h-[44px]"
            >
              <Sparkles className="w-5 h-5" />
              Create your first tour
            </Link>
            <p className="text-caption text-ink-tertiary">
              Or <Link href="/demo" className="text-brand-primary font-medium hover:underline">try the demo</Link> first.
            </p>
          </div>
        )}
        {!loading && !error && tours.length > 0 && (
          <div className="grid gap-6 sm:grid-cols-2">
            {tours.map((tour, i) => (
              <TourCard key={tour.tourId} tour={tour} index={i} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
