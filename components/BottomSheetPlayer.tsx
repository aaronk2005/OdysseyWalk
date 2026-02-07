"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronUp, Play, Pause, SkipForward, RotateCcw, Mic } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { POI } from "@/lib/types";
import { AudioState } from "@/lib/types";

interface BottomSheetPlayerProps {
  tourName: string;
  currentPoi: POI | null;
  nextPoiName: string | null;
  visitedCount: number;
  totalCount: number;
  audioState: AudioState;
  isDemoMode: boolean;
  onPlay: () => void;
  onPause: () => void;
  onResume: () => void;
  onSkipNext: () => void;
  onReplay: () => void;
  onAskStart: () => void;
  onAskStop: () => void;
  isAsking: boolean;
  askState: "idle" | "listening" | "thinking" | "speaking";
  narrationTextFallback?: string | null;
  onTryAudioAgain?: () => void;
  onFitBounds?: () => void;
}

export function BottomSheetPlayer({
  tourName,
  currentPoi,
  nextPoiName,
  visitedCount,
  totalCount,
  audioState,
  isDemoMode,
  onPlay,
  onPause,
  onResume,
  onSkipNext,
  onReplay,
  onAskStart,
  onAskStop,
  isAsking,
  askState,
  narrationTextFallback,
  onTryAudioAgain,
  onFitBounds,
}: BottomSheetPlayerProps) {
  const [expanded, setExpanded] = useState(false);
  const isPlaying =
    audioState === AudioState.NARRATING ||
    audioState === AudioState.ANSWERING ||
    audioState === AudioState.PLAYING_INTRO ||
    audioState === AudioState.PLAYING_OUTRO;
  const isPaused = audioState === AudioState.PAUSED;
  const showTextFallback = Boolean(narrationTextFallback);

  return (
    <motion.div
      className="fixed bottom-0 left-0 right-0 z-40 safe-bottom"
      initial={false}
      animate={{ y: 0 }}
    >
      <div
        className={cn(
          "rounded-t-3xl border-t border-app-border shadow-2xl",
          "bg-surface"
        )}
      >
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="w-full py-3 min-h-[44px] flex justify-center items-center touch-manipulation"
          aria-label={expanded ? "Collapse" : "Expand"}
        >
          <ChevronUp
            className={cn("w-6 h-6 text-ink-tertiary transition-transform", expanded && "rotate-180")}
          />
        </button>

        <div className="px-4 pb-6 safe-bottom">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-heading-sm truncate">{tourName}</h2>
            {isDemoMode && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-brand-secondary/15 text-brand-secondary font-medium">
                Demo
              </span>
            )}
          </div>
          <p className="text-body text-ink-secondary">
            {currentPoi ? currentPoi.name : "Select a stop or walk to start"}
          </p>
          {nextPoiName && (
            <p className="text-hint text-ink-tertiary mt-1">Next: {nextPoiName}</p>
          )}
          {showTextFallback && narrationTextFallback && (
            <div className="mt-2 p-3 rounded-card bg-surface-muted border border-app-border">
              <p className="text-caption text-ink-secondary line-clamp-2">{narrationTextFallback}</p>
              {onTryAudioAgain && (
                <button
                  type="button"
                  onClick={onTryAudioAgain}
                  className="mt-1.5 text-xs text-brand-primary font-medium hover:underline"
                >
                  Try audio again
                </button>
              )}
            </div>
          )}
          <div className="h-1.5 rounded-full bg-app-border mt-2 overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-brand-primary"
              initial={false}
              animate={{ width: `${totalCount ? (visitedCount / totalCount) * 100 : 0}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
          <p className="text-hint text-ink-tertiary mt-1">
            {visitedCount} / {totalCount} stops
          </p>

          <div className="flex items-center gap-3 mt-4">
            <button
              type="button"
              onClick={isPaused ? onResume : isPlaying ? onPause : onPlay}
              className="flex-1 flex items-center justify-center gap-2 py-3 min-h-[44px] rounded-button bg-brand-primary hover:bg-brand-primaryHover text-white font-medium border border-brand-primary transition-colors"
              aria-label={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
              <span>{isPlaying ? "Pause" : "Play"}</span>
            </button>
            <button
              type="button"
              onClick={onSkipNext}
              className="p-3 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-button bg-surface-muted hover:bg-app-bg text-ink-primary border border-app-border transition-colors"
              aria-label="Skip to next stop"
            >
              <SkipForward className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={onReplay}
              className="p-3 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-button bg-surface-muted hover:bg-app-bg text-ink-primary border border-app-border transition-colors"
              aria-label="Replay current stop"
            >
              <RotateCcw className="w-5 h-5" />
            </button>
          </div>

          <div className="mt-4 flex justify-center">
            <button
              type="button"
              onMouseDown={onAskStart}
              onMouseLeave={onAskStop}
              onMouseUp={onAskStop}
              onTouchStart={onAskStart}
              onTouchEnd={onAskStop}
              onTouchCancel={onAskStop}
              className={cn(
                "relative w-14 h-14 min-w-[56px] min-h-[56px] rounded-full flex items-center justify-center transition-all",
                askState === "listening" && "animate-ring-listening bg-brand-primary/30",
                askState === "thinking" && "bg-amber-200",
                askState === "speaking" && "bg-emerald-200",
                (askState === "idle" || !isAsking) && "bg-brand-primary hover:bg-brand-primaryHover text-white"
              )}
              aria-label="Hold to ask"
            >
              <Mic className="w-6 h-6" />
            </button>
          </div>
          <AnimatePresence>
            {isAsking && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center text-caption text-ink-secondary mt-2"
              >
                {askState === "listening" && "Listening…"}
                {askState === "thinking" && "Thinking…"}
                {askState === "speaking" && "Speaking…"}
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="overflow-hidden border-t border-app-border pt-4"
            >
              {onFitBounds && (
                <div className="px-4 pb-2">
                  <button
                    type="button"
                    onClick={onFitBounds}
                    className="text-xs text-brand-primary font-medium hover:underline"
                  >
                    Fit route bounds
                  </button>
                </div>
              )}
              {currentPoi && (
                <div className="px-4 pb-6 text-body text-ink-secondary">
                  <p className="font-semibold text-ink-primary mb-1">{currentPoi.name}</p>
                  <p>
                    {"script" in currentPoi && typeof currentPoi.script === "string"
                      ? currentPoi.script
                      : (currentPoi as { scripts?: Record<string, string> }).scripts?.friendly ||
                        (currentPoi as { scripts?: Record<string, string> }).scripts?.historian ||
                        "No script for this stop."}
                  </p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
