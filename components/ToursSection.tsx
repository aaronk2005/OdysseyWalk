"use client";

import { useState } from "react";
import { Sparkles, Search } from "lucide-react";
import { TourCard } from "@/components/TourCard";
import { cn } from "@/lib/utils/cn";
import type { TourSummary } from "@/lib/types";

interface ToursSectionProps {
  initialTours: TourSummary[];
}

export function ToursSection({ initialTours }: ToursSectionProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCity, setSelectedCity] = useState<string | null>(null);

  const cities = Array.from(new Set(initialTours.map((t) => t.city))).sort();

  const filteredTours = initialTours.filter((tour) => {
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
    <>
      {/* Search and Filters */}
      <section className="px-4 pb-8 max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row gap-4 items-stretch">
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

      {/* Tours Grid — no loading state, no skeleton */}
      <main className="px-4 pb-16 max-w-7xl mx-auto">
        {filteredTours.length === 0 ? (
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
    </>
  );
}
