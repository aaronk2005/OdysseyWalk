"use client";

import { motion } from "framer-motion";
import { Play, Pause, SkipForward, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { AudioState } from "@/lib/types";
import { PlayingIndicator } from "./PlayingIndicator";

/**
 * Zone 2: Spotify-like audio control + context.
 * Soft elevated card, progress (Stop 2 of 6), large Play/Pause, small Skip.
 */
export interface ActiveWalkAudioPanelProps {
  currentStopName: string;
  stopIndex: number;
  totalStops: number;
  audioState: AudioState;
  isAnswerPlaying: boolean;
  onPlayPause: () => void;
  onSkip: () => void;
  onReplay: () => void;
  isDemoMode?: boolean;
  /** If true, show "Resume" instead of "Play" after answer finishes */
  showResumeHint?: boolean;
}

export function ActiveWalkAudioPanel({
  currentStopName,
  stopIndex,
  totalStops,
  audioState,
  isAnswerPlaying,
  onPlayPause,
  onSkip,
  onReplay,
  isDemoMode,
  showResumeHint = false,
}: ActiveWalkAudioPanelProps) {
  const isPlaying =
    audioState === AudioState.NARRATING ||
    audioState === AudioState.PLAYING_INTRO ||
    audioState === AudioState.PLAYING_OUTRO ||
    audioState === AudioState.ANSWERING;
  const isPaused = audioState === AudioState.PAUSED;
  const progressPct = totalStops ? (stopIndex / totalStops) * 100 : 0;
  
  const playButtonLabel = showResumeHint ? "Resume" : isPlaying ? "Pause" : "Play";

  return (
    <motion.div
      layout
      className={cn(
        "mx-4 rounded-2xl shadow-lg overflow-hidden",
        "bg-gradient-to-b from-surface to-surface-muted/80",
        "border border-app-border/80",
        (isPlaying || isAnswerPlaying) && "ring-2 ring-brand-primary/30"
      )}
    >
      <div className="px-4 py-4">
        <div className="flex items-center gap-2 mb-1">
          <p className="text-sm font-semibold text-ink-primary truncate flex-1">
            {currentStopName || "Select a stop"}
          </p>
          {isPlaying && <PlayingIndicator />}
          {isDemoMode && (
            <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-ink-tertiary/15 text-ink-tertiary font-medium shrink-0">
              Demo
            </span>
          )}
        </div>
        <p className="text-xs text-ink-tertiary">
          Stop {Math.min(stopIndex, totalStops)} of {totalStops}
          {isAnswerPlaying && " · Answering…"}
        </p>

        {/* Progress bar */}
        <div className="h-1.5 rounded-full bg-app-border mt-3 overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-brand-primary"
            initial={false}
            animate={{ width: `${progressPct}%` }}
            transition={{ duration: 0.35, ease: "easeOut" }}
          />
        </div>

        {/* Controls: one primary Play/Pause (56px), Replay + Skip secondary */}
        <div className="flex items-center justify-center gap-4 mt-4">
          <button
            type="button"
            onClick={onReplay}
            className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full text-ink-tertiary hover:text-ink-primary hover:bg-app-bg transition-colors shrink-0"
            aria-label="Replay current stop"
          >
            <RotateCcw className="w-5 h-5" />
          </button>

          <button
            type="button"
            onClick={onPlayPause}
            className={cn(
              "flex items-center justify-center gap-2 min-w-[56px] min-h-[56px] w-14 h-14 rounded-full font-semibold transition-all shrink-0",
              "bg-brand-primary hover:bg-brand-primaryHover text-white shadow-lg shadow-brand-primary/25",
              "active:scale-[0.97]"
            )}
            aria-label={playButtonLabel}
          >
            {isPlaying ? (
              <Pause className="w-7 h-7" />
            ) : (
              <Play className="w-7 h-7 ml-0.5" />
            )}
          </button>

          <button
            type="button"
            onClick={onSkip}
            className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full text-ink-tertiary hover:text-ink-primary hover:bg-app-bg transition-colors shrink-0"
            aria-label="Skip to next stop"
          >
            <SkipForward className="w-5 h-5" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
