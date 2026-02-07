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
      <div className="rounded-card border border-app-border bg-surface p-8 text-center space-y-4">
        <p className="text-body text-ink-secondary">No tour data. Start a new tour to see your summary here.</p>
        <Link
          href="/create"
          className="inline-flex items-center justify-center gap-2 py-3 px-6 rounded-button bg-brand-primary text-white font-medium hover:bg-brand-primaryHover min-h-[44px]"
        >
          Start a new tour
        </Link>
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
      className="rounded-card border border-app-border bg-surface p-6 md:p-8 shadow-sm"
    >
      <div className="flex items-center gap-3 mb-6">
        <CheckCircle2 className="w-10 h-10 text-emerald-500 shrink-0" />
        <div>
          <h1 className="text-heading-sm">Tour completed</h1>
          <p className="text-caption text-ink-secondary">
            {tourPlan.theme} walk · {visited.length} of {pois.length} stops
          </p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="rounded-card bg-surface-muted p-4 border border-app-border">
          <p className="text-hint text-ink-tertiary uppercase tracking-wider">Stops visited</p>
          <p className="text-2xl font-semibold text-ink-primary">{visited.length}</p>
        </div>
        <div className="rounded-card bg-surface-muted p-4 border border-app-border">
          <p className="text-hint text-ink-tertiary uppercase tracking-wider">Approx. time</p>
          <p className="text-2xl font-semibold text-ink-primary">
            {durationMin > 0 ? `${durationMin} min` : "—"}
          </p>
        </div>
        {tourPlan.distanceMeters != null && tourPlan.distanceMeters > 0 && (
          <div className="rounded-card bg-surface-muted p-4 col-span-2 border border-app-border">
            <p className="text-hint text-ink-tertiary uppercase tracking-wider">Distance</p>
            <p className="text-xl font-semibold text-ink-primary">
              {(tourPlan.distanceMeters / 1000).toFixed(1)} km
            </p>
          </div>
        )}
      </div>
      <div className="mb-6">
        <p className="text-caption font-medium text-ink-secondary mb-2">Visited stops</p>
        <ul className="space-y-1.5">
          {visited.map((poi) => (
            <li key={poi.poiId} className="flex items-center gap-2 text-body text-ink-secondary">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
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
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-button bg-surface border border-app-border text-ink-primary font-medium hover:bg-surface-muted"
          >
            <Save className="w-4 h-4" />
            Save Tour
          </button>
        )}
        {onGenerateAnother && (
          <Link
            href="/create"
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-3 rounded-button font-medium bg-brand-primary text-white hover:bg-brand-primaryHover"
            )}
          >
            <Sparkles className="w-4 h-4" />
            Generate Another
          </Link>
        )}
        {!onGenerateAnother && (
          <Link
            href="/create"
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-button bg-brand-primary text-white font-medium hover:bg-brand-primaryHover"
          >
            Generate Another
          </Link>
        )}
      </div>
    </motion.div>
  );
}
