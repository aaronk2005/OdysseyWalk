"use client";

import Link from "next/link";
import { MapPin, Clock } from "lucide-react";
import type { TourSummary } from "@/lib/types";
import { cn } from "@/lib/utils/cn";

interface TourCardProps {
  tour: TourSummary;
  index?: number;
}

export function TourCard({ tour }: TourCardProps) {
  return (
    <div>
      <Link href={`/tour/${tour.tourId}`}>
        <div
          className={cn(
            "group relative overflow-hidden rounded-card border border-app-border",
            "bg-surface hover:border-brand-primary/40 hover:shadow-md",
            "transition-all duration-300 hover:-translate-y-0.5"
          )}
        >
          <div className="aspect-[16/10] relative bg-surface-muted">
            <img
              src={tour.thumbnailUrl}
              alt=""
              className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-ink-primary/80 to-transparent" />
            <div className="absolute bottom-3 left-3 right-3 flex items-center gap-2 text-sm text-white">
              <MapPin className="w-4 h-4 shrink-0" />
              <span>{tour.city}</span>
              <Clock className="w-4 h-4 shrink-0 ml-2" />
              <span>{tour.estimatedMinutes} min</span>
            </div>
          </div>
          <div className="p-4">
            <h3 className="text-heading-sm group-hover:text-brand-primary transition-colors">
              {tour.name}
            </h3>
            <p className="text-caption text-ink-secondary mt-1">
              {tour.poiCount} stops
              {Array.isArray(tour.tags) && tour.tags.length ? ` · ${tour.tags.slice(0, 2).join(", ")}` : ""}
            </p>
          </div>
        </div>
      </Link>
    </div>
  );
}
