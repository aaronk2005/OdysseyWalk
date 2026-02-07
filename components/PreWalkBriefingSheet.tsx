"use client";

import { motion } from "framer-motion";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

/**
 * Pre-Walk Briefing: anchored bottom sheet (not floating card).
 * Single primary CTA = Start Walk. No settings; focus only on START.
 */
export interface PreWalkBriefingSheetProps {
  tourTitle: string;
  durationMin: number;
  stopCount: number;
  distanceKm?: number;
  /** First POI name for anticipation */
  firstStopName?: string | null;
  introLine: string;
  onStartWalk: () => void;
}

export function PreWalkBriefingSheet({
  tourTitle,
  durationMin,
  stopCount,
  distanceKm,
  firstStopName,
  introLine,
  onStartWalk,
}: PreWalkBriefingSheetProps) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const meta = [
    durationMin > 0 && `${durationMin} min`,
    `${stopCount} stop${stopCount !== 1 ? "s" : ""}`,
    distanceKm != null && distanceKm > 0 && `${distanceKm.toFixed(1)} km`,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <motion.div
      initial={prefersReducedMotion ? { opacity: 0 } : { y: "100%" }}
      animate={prefersReducedMotion ? { opacity: 1 } : { y: 0 }}
      transition={prefersReducedMotion ? { duration: 0.2 } : { type: "spring", damping: 28, stiffness: 200 }}
      className="absolute bottom-0 left-0 right-0 z-30 min-h-[40vh] rounded-t-3xl bg-surface shadow-[0_-12px_40px_rgba(0,0,0,0.12)] safe-bottom flex flex-col justify-end"
    >
      {/* Drag handle (visual + slight affordance) */}
      <div className="flex justify-center pt-3 pb-1">
        <span className="w-10 h-1 rounded-full bg-ink-tertiary/30" aria-hidden />
      </div>

      <div className="px-6 pb-8 pt-2 max-w-lg mx-auto">
        <h2 className="text-xl font-bold text-ink-primary text-center tracking-tight">
          {tourTitle}
        </h2>
        <p className="text-center text-caption text-ink-secondary mt-1.5">{meta}</p>

        <p className="text-body text-ink-secondary text-center mt-4 px-2">{introLine}</p>
        {firstStopName && (
          <p className="text-caption text-brand-primary font-medium text-center mt-2">
            First stop: {firstStopName}
          </p>
        )}

        <button
          type="button"
          onClick={onStartWalk}
          className="w-full mt-6 py-4 rounded-2xl bg-brand-primary hover:bg-brand-primaryHover active:scale-[0.99] text-white font-bold text-base shadow-lg shadow-brand-primary/25 transition-colors min-h-[52px]"
          aria-label="Start Walk"
        >
          Start Walk
        </button>

        <p className="text-center text-[12px] text-ink-tertiary mt-3">
          Audio will play automatically at each stop.
        </p>
      </div>
    </motion.div>
  );
}
