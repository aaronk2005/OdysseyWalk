"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, SkipForward, RotateCcw, Mic, ChevronDown } from "lucide-react";
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
      <div className="rounded-t-2xl border-t border-app-border bg-surface shadow-[0_-8px_30px_rgba(0,0,0,0.08)]">
        {/* Drag handle */}
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="w-full py-2.5 flex flex-col justify-center items-center gap-1 touch-manipulation"
          aria-label={expanded ? "Collapse" : "Expand"}
        >
          <span className="w-10 h-1 rounded-full bg-ink-tertiary/40" />
          <ChevronDown className={cn("w-4 h-4 text-ink-tertiary transition-transform", expanded && "rotate-180")} />
        </button>

        <div className="px-4 pb-4 pt-0 safe-bottom max-w-lg mx-auto">
          {/* Tour name + demo */}
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-sm font-semibold text-ink-primary truncate flex-1">{tourName}</h2>
            {isDemoMode && (
              <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-ink-tertiary/15 text-ink-tertiary font-medium shrink-0">
                Demo
              </span>
            )}
          </div>

          {/* Current stop + next/progress */}
          <p className="text-base font-medium text-ink-primary truncate">
            {currentPoi ? currentPoi.name : "Select a stop or tap Play to start"}
          </p>
          <p className="text-xs text-ink-tertiary mt-0.5">
            {nextPoiName ? <>Next: {nextPoiName} · </> : null}
            {visitedCount}/{totalCount} stops
          </p>

          {/* Progress bar */}
          <div className="h-1 rounded-full bg-app-border mt-2 overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-brand-primary"
              initial={false}
              animate={{ width: `${totalCount ? (visitedCount / totalCount) * 100 : 0}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>

          {showTextFallback && narrationTextFallback && (
            <div className="mt-2 p-3 rounded-xl bg-surface-muted border border-app-border">
              <p className="text-caption text-ink-secondary line-clamp-2">{narrationTextFallback}</p>
              {onTryAudioAgain && (
                <button type="button" onClick={onTryAudioAgain} className="mt-1.5 text-xs text-brand-primary font-medium hover:underline">
                  Try audio again
                </button>
              )}
            </div>
          )}

          {/* Single control row: Play + Replay + Skip + Mic — centered as a group */}
          <div className="flex items-center justify-center gap-2 mt-4">
            <button
              type="button"
              onClick={isPaused ? onResume : isPlaying ? onPause : onPlay}
              className="flex-1 min-w-0 flex items-center justify-center gap-2 py-3 min-h-[44px] rounded-xl bg-brand-primary hover:bg-brand-primaryHover text-white font-semibold text-sm transition-colors active:scale-[0.98]"
              aria-label={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? <Pause className="w-5 h-5 shrink-0" /> : <Play className="w-5 h-5 shrink-0" />}
              <span className="truncate">{isPlaying ? "Pause" : "Play"}</span>
            </button>
            <button
              type="button"
              onClick={onReplay}
              className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl bg-surface-muted hover:bg-app-bg text-ink-secondary transition-colors shrink-0"
              aria-label="Replay current stop"
            >
              <RotateCcw className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={onSkipNext}
              className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl bg-surface-muted hover:bg-app-bg text-ink-secondary transition-colors shrink-0"
              aria-label="Skip to next stop"
            >
              <SkipForward className="w-5 h-5" />
            </button>
            <button
              type="button"
              onMouseDown={onAskStart}
              onMouseLeave={onAskStop}
              onMouseUp={onAskStop}
              onTouchStart={onAskStart}
              onTouchEnd={onAskStop}
              onTouchCancel={onAskStop}
              className={cn(
                "p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full transition-all shrink-0",
                askState === "listening" && "animate-ring-listening bg-brand-primary/30 text-white",
                askState === "thinking" && "bg-amber-100 text-amber-800",
                askState === "speaking" && "bg-emerald-100 text-emerald-800",
                (askState === "idle" || !isAsking) && "bg-brand-primary hover:bg-brand-primaryHover text-white"
              )}
              aria-label="Hold to ask"
            >
              <Mic className="w-5 h-5" />
            </button>
          </div>

          {/* Single hint line — centered under the control row */}
          <p className="text-center text-[11px] text-ink-tertiary mt-2 min-h-[14px]">
            <AnimatePresence mode="wait">
              {isAsking ? (
                <motion.span key="state" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  {askState === "listening" && "Listening…"}
                  {askState === "thinking" && "Thinking…"}
                  {askState === "speaking" && "Speaking…"}
                </motion.span>
              ) : (
                <motion.span key="hint" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  Hold mic to ask
                </motion.span>
              )}
            </AnimatePresence>
          </p>
        </div>

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="overflow-hidden border-t border-app-border"
            >
              <div className="px-4 pt-3 pb-5 max-w-lg mx-auto">
                {onFitBounds && (
                  <button
                    type="button"
                    onClick={onFitBounds}
                    className="text-xs text-brand-primary font-medium hover:underline mb-3"
                  >
                    Fit route on map
                  </button>
                )}
                {currentPoi && (
                  <div className="text-body text-ink-secondary">
                    <p className="font-semibold text-ink-primary mb-1">{currentPoi.name}</p>
                    <p className="text-sm leading-relaxed">
                      {"script" in currentPoi && typeof currentPoi.script === "string"
                        ? currentPoi.script
                        : (currentPoi as { scripts?: Record<string, string> }).scripts?.friendly ||
                          (currentPoi as { scripts?: Record<string, string> }).scripts?.historian ||
                          "No script for this stop."}
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
