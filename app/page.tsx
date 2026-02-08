"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Sparkles, Search } from "lucide-react";
import { OdysseyLogo } from "@/components/OdysseyLogo";
import { ResumeWalkBanner } from "@/components/ResumeWalkBanner";
import { TourCard } from "@/components/TourCard";
import { loadTour } from "@/lib/data/SessionStore";
import { cn } from "@/lib/utils/cn";
import type { SessionState, TourSummary } from "@/lib/types";

export default function LandingPage() {
  const [tours, setTours] = useState<TourSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [resumableSession, setResumableSession] = useState<SessionState | null>(null);

  useEffect(() => {
    const s = loadTour();
    if (s && s.startedAt > 0 && !s.endedAt) setResumableSession(s);
    else setResumableSession(null);
  }, []);

  useEffect(() => {
    fetch("/api/tours")
      .then((res) => res.json())
      .then((data) => {
        setTours(data.tours || []);
        setLoading(false);
      })
      .catch(() => {
        setTours([]);
        setLoading(false);
      });
  }, []);

  // Get unique cities from tours
  const cities = Array.from(new Set(tours.map((t) => t.city))).sort();

  // Filter tours by search and city
  const filteredTours = tours.filter((tour) => {
    const tags = Array.isArray(tour.tags) ? tour.tags : [];
    const matchesSearch =
      !searchQuery ||
      (tour.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (tour.city || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      tags.some((tag) => String(tag).toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCity = !selectedCity || tour.city === selectedCity;
    return matchesSearch && matchesCity;
  });

  return (
    <div className="min-h-screen bg-app-bg">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-app-border bg-surface/95 backdrop-blur-sm px-4 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="min-h-[44px] flex items-center" aria-label="Odyssey Walk home">
            <OdysseyLogo size="lg" />
          </Link>
          <Link
            href="/create"
            className="text-[15px] font-semibold px-5 py-2.5 rounded-full bg-brand-primary text-white hover:bg-brand-primaryHover transition-opacity min-h-[44px] flex items-center"
            aria-label="Create Custom Tour"
          >
            Create Custom Tour
          </Link>
        </div>
      </header>

      {/* Hero Section — static, no entrance animation */}
      <section className="px-4 py-12 sm:py-16 max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-ink-primary mb-4" style={{ letterSpacing: "-0.03em", lineHeight: 1.1 }}>
            Discover Walking Tours
            <span className="text-brand-primary"> Worldwide</span>
          </h1>
          <p className="text-lg sm:text-xl text-ink-secondary mb-8 max-w-lg mx-auto font-medium" style={{ letterSpacing: "-0.01em" }}>
            Generate and navigate pre-planned walking tours in major cities. Narrated stories, guided routes, and immersive experiences.
          </p>
        </div>
      </section>

      {/* Resume in-progress walk */}
      {resumableSession && (
        <section className="px-4 pb-4 max-w-7xl mx-auto">
          <ResumeWalkBanner session={resumableSession} />
        </section>
      )}

      {/* Search and Filters — static */}
      <section className="px-4 pb-8 max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row gap-4 items-stretch">
          {/* Search Bar */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-tertiary" />
            <input
              type="text"
              placeholder="Search tours by name, city, or theme..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-button border border-app-border bg-surface text-ink-primary placeholder:text-ink-tertiary focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary"
            />
          </div>

          {/* City Filter */}
          {cities.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0">
              <button
                onClick={() => setSelectedCity(null)}
                className={cn(
                  "px-4 py-2 rounded-button whitespace-nowrap font-medium transition-colors min-h-[44px]",
                  !selectedCity
                    ? "bg-brand-primary text-white"
                    : "bg-surface border border-app-border text-ink-primary hover:bg-surface-muted"
                )}
              >
                All Cities
              </button>
              {cities.map((city) => (
                <button
                  key={city}
                  onClick={() => setSelectedCity(city)}
                  className={cn(
                    "px-4 py-2 rounded-button whitespace-nowrap font-medium transition-colors min-h-[44px]",
                    selectedCity === city
                      ? "bg-brand-primary text-white"
                      : "bg-surface border border-app-border text-ink-primary hover:bg-surface-muted"
                  )}
                >
                  {city}
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Tours Grid */}
      <main className="px-4 pb-16 max-w-7xl mx-auto">
        {loading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
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
        ) : filteredTours.length === 0 ? (
          <div className="rounded-card border border-app-border bg-surface-muted/60 p-12 text-center">
            <Sparkles className="w-12 h-12 mx-auto text-ink-tertiary mb-4" strokeWidth={1.25} />
            <p className="text-body text-ink-secondary max-w-sm mx-auto mb-6">
              {searchQuery || selectedCity
                ? "No tours match your search. Try different filters."
                : "No tours available yet. Check back soon!"}
            </p>
            {(searchQuery || selectedCity) && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setSelectedCity(null);
                }}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-brand-primary text-white font-semibold hover:bg-brand-primaryHover transition-colors min-h-[44px]"
              >
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="mb-6">
              <p className="text-body text-ink-secondary">
                {filteredTours.length} {filteredTours.length === 1 ? "tour" : "tours"} found
              </p>
            </div>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {filteredTours.map((tour, i) => (
                <TourCard key={tour.tourId} tour={tour} index={i} />
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
