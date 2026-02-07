"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { MapPin, Clock } from "lucide-react";
import type { TourSummary } from "@/lib/types";
import { cn } from "@/lib/utils/cn";

interface TourCardProps {
  tour: TourSummary;
  index?: number;
}

export function TourCard({ tour, index = 0 }: TourCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.06 }}
    >
      <Link href={`/tour/${tour.tourId}`}>
        <div
          className={cn(
            "group relative overflow-hidden rounded-2xl border border-white/10",
            "bg-white/5 backdrop-blur-md hover:bg-white/10 hover:border-accent-blue/30",
            "transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-accent-blue/5"
          )}
        >
          <div className="aspect-[16/10] relative bg-navy-800">
            <img
              src={tour.thumbnailUrl}
              alt=""
              className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-navy-950/90 to-transparent" />
            <div className="absolute bottom-3 left-3 right-3 flex items-center gap-2 text-sm text-white/90">
              <MapPin className="w-4 h-4 shrink-0" />
              <span>{tour.city}</span>
              <Clock className="w-4 h-4 shrink-0 ml-2" />
              <span>{tour.estimatedMinutes} min</span>
            </div>
          </div>
          <div className="p-4">
            <h3 className="font-semibold text-lg text-white group-hover:text-accent-blue transition-colors">
              {tour.name}
            </h3>
            <p className="text-sm text-white/60 mt-1">
              {tour.poiCount} stops
              {tour.tags.length ? ` · ${tour.tags.slice(0, 2).join(", ")}` : ""}
            </p>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
