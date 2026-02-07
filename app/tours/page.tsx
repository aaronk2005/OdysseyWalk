"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { TourCard } from "@/components/TourCard";
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
    <div className="min-h-screen bg-navy-950">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-navy-950/90 backdrop-blur px-4 py-4">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <Link
            href="/"
            className="p-2 rounded-lg hover:bg-white/10 text-white"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="font-semibold text-xl text-white">Tours</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {loading && (
          <div className="grid gap-4 sm:grid-cols-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-48 rounded-2xl bg-white/5 animate-pulse"
              />
            ))}
          </div>
        )}
        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-200">
            <p>{error}</p>
            <Link href="/demo" className="text-sm underline mt-2 inline-block">
              Try Demo instead
            </Link>
          </div>
        )}
        {!loading && !error && tours.length === 0 && (
          <p className="text-white/60">No tours yet. Try the sample tour or create one.</p>
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
