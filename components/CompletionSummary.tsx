"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { CheckCircle2, Save, Sparkles } from "lucide-react";
import type { SessionState } from "@/lib/types";
import { cn } from "@/lib/utils/cn";

interface CompletionSummaryProps {
  session: SessionState | null;
  onSaveTour?: () => void;
  onGenerateAnother?: () => void;
}

export function CompletionSummary({
  session,
  onSaveTour,
  onGenerateAnother,
}: CompletionSummaryProps) {
  if (!session) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-white/60">
        No tour data. Start a tour from Create.
      </div>
    );
  }

  const { tourPlan, pois, visitedPoiIds, startedAt, endedAt } = session;
  const durationMs = endedAt && startedAt ? endedAt - startedAt : 0;
  const durationMin = Math.round(durationMs / 60000);
  const visited = pois.filter((p) => visitedPoiIds.includes(p.poiId));

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-6 md:p-8"
    >
      <div className="flex items-center gap-3 mb-6">
        <CheckCircle2 className="w-10 h-10 text-emerald-400 shrink-0" />
        <div>
          <h1 className="text-xl font-semibold text-white">Tour completed</h1>
          <p className="text-white/60 text-sm">
            {tourPlan.theme} walk · {visited.length} of {pois.length} stops
          </p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="rounded-xl bg-white/5 p-4">
          <p className="text-xs text-white/50 uppercase tracking-wider">Stops visited</p>
          <p className="text-2xl font-semibold text-white">{visited.length}</p>
        </div>
        <div className="rounded-xl bg-white/5 p-4">
          <p className="text-xs text-white/50 uppercase tracking-wider">Approx. time</p>
          <p className="text-2xl font-semibold text-white">
            {durationMin > 0 ? `${durationMin} min` : "—"}
          </p>
        </div>
        {tourPlan.distanceMeters != null && tourPlan.distanceMeters > 0 && (
          <div className="rounded-xl bg-white/5 p-4 col-span-2">
            <p className="text-xs text-white/50 uppercase tracking-wider">Distance</p>
            <p className="text-xl font-semibold text-white">
              {(tourPlan.distanceMeters / 1000).toFixed(1)} km
            </p>
          </div>
        )}
      </div>
      <div className="mb-6">
        <p className="text-sm font-medium text-white/80 mb-2">Visited stops</p>
        <ul className="space-y-1.5">
          {visited.map((poi) => (
            <li key={poi.poiId} className="flex items-center gap-2 text-sm text-white/80">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              {poi.name}
            </li>
          ))}
        </ul>
      </div>
      <div className="flex flex-col sm:flex-row gap-3">
        {onSaveTour && (
          <button
            type="button"
            onClick={onSaveTour}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-white/10 border border-white/20 text-white font-medium hover:bg-white/15"
          >
            <Save className="w-4 h-4" />
            Save Tour
          </button>
        )}
        {onGenerateAnother && (
          <Link
            href="/create"
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-medium",
              "bg-gradient-to-r from-accent-blue to-accent-purple text-white"
            )}
          >
            <Sparkles className="w-4 h-4" />
            Generate Another
          </Link>
        )}
        {!onGenerateAnother && (
          <Link
            href="/create"
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-accent-blue to-accent-purple text-white font-medium"
          >
            Generate Another
          </Link>
        )}
      </div>
    </motion.div>
  );
}
