"use client";

import { motion, AnimatePresence } from "framer-motion";
import { AudioState } from "@/lib/types";

/**
 * Single status line in the gap between audio panel and voice bar.
 * Answers "what's happening now?" and "what's next?" — no dead space.
 */
export interface WalkStatusLineProps {
  /** Next POI name (if any) */
  nextStopName: string | null;
  /** Distance in meters to next stop */
  nextStopDistanceM: number | null;
  /** Current stop index (0 = intro, 1 = first stop, etc.) */
  stopIndex: number;
  totalStops: number;
  audioState: AudioState;
}

export function WalkStatusLine({
  nextStopName,
  nextStopDistanceM,
  stopIndex,
  totalStops,
  audioState,
}: WalkStatusLineProps) {
  const isPlayingIntro = audioState === AudioState.PLAYING_INTRO;
  const isPlayingOutro = audioState === AudioState.PLAYING_OUTRO;
  const currentStopNum = Math.min(stopIndex, totalStops);
  const isHalfway = totalStops > 0 && currentStopNum >= Math.ceil(totalStops / 2) && currentStopNum < totalStops;

  let text: string;
  if (isPlayingIntro) {
    text = "Listening to intro";
  } else if (isPlayingOutro) {
    text = "Walk complete";
  } else if (nextStopName && nextStopDistanceM != null) {
    const dist =
      nextStopDistanceM < 1000 ? `${nextStopDistanceM}m` : `${(nextStopDistanceM / 1000).toFixed(1)} km`;
    text = `Next: ${nextStopName} · ${dist}`;
  } else if (nextStopName) {
    text = `Next: ${nextStopName}`;
  } else if (isHalfway) {
    text = "You're halfway through this walk";
  } else {
    text = `Stop ${currentStopNum} of ${totalStops}`;
  }

  return (
    <AnimatePresence mode="wait">
      <motion.p
        key={text}
        initial={{ opacity: 0, y: 2 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -2 }}
        transition={{ duration: 0.2 }}
        className="text-sm font-medium text-ink-secondary text-center px-4 py-2 min-h-[40px] flex items-center justify-center"
      >
        {text}
      </motion.p>
    </AnimatePresence>
  );
}
