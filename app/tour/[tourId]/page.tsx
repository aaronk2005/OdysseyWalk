"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { loadTour, savePreplannedTour } from "@/lib/data/SessionStore";
import type { Tour, POI } from "@/lib/types";

export default function TourIdPage() {
  const params = useParams();
  const router = useRouter();
  const tourId = typeof params.tourId === "string" ? params.tourId : null;
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tourId) {
      router.replace("/");
      return;
    }
    const existing = loadTour();
    if (existing && existing.sessionId === tourId) {
      router.replace("/tour/active");
      return;
    }
    fetch(`/api/tours/${encodeURIComponent(tourId)}`)
      .then((res) => {
        if (!res.ok) throw new Error(res.status === 404 ? "Tour not found" : "Failed to load tour");
        return res.json();
      })
      .then((data: { tour: Tour; pois: POI[] }) => {
        const { tour, pois } = data;
        if (!tour?.tourId || !Array.isArray(pois)) throw new Error("Invalid tour data");
        savePreplannedTour(tour.tourId, tour, pois);
        router.replace("/tour/active");
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Something went wrong");
      });
  }, [tourId, router]);

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-app-bg p-4">
        <p className="text-body text-ink-secondary text-center mb-4">{error}</p>
        <button
          type="button"
          onClick={() => router.push("/")}
          className="px-6 py-3 rounded-full bg-brand-primary text-white font-semibold hover:bg-brand-primaryHover"
        >
          Back to tours
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-app-bg">
      <div className="w-10 h-10 rounded-full border-2 border-brand-primary border-t-transparent animate-spin" />
    </div>
  );
}
