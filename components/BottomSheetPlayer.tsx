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
  const isPlaying = audioState === AudioState.NARRATING || audioState === AudioState.ANSWERING;
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
          "rounded-t-3xl border-t border-white/10 backdrop-blur-xl",
          "bg-navy-900/95 shadow-2xl"
        )}
      >
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="w-full py-2 flex justify-center touch-manipulation"
          aria-label={expanded ? "Collapse" : "Expand"}
        >
          <ChevronUp
            className={cn("w-6 h-6 text-white/60 transition-transform", expanded && "rotate-180")}
          />
        </button>

        <div className="px-4 pb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-white truncate">{tourName}</h2>
            {isDemoMode && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-accent-purple/20 text-accent-purple">
                Demo
              </span>
            )}
          </div>
          <p className="text-sm text-white/70">
            {currentPoi ? currentPoi.name : "Select a stop or walk to start"}
          </p>
          {nextPoiName && (
            <p className="text-xs text-white/50 mt-1">Next: {nextPoiName}</p>
          )}
          {showTextFallback && narrationTextFallback && (
            <div className="mt-2 p-2 rounded-lg bg-white/5 border border-white/10">
              <p className="text-xs text-white/80 line-clamp-2">{narrationTextFallback}</p>
              {onTryAudioAgain && (
                <button
                  type="button"
                  onClick={onTryAudioAgain}
                  className="mt-1.5 text-xs text-accent-blue hover:underline"
                >
                  Try audio again
                </button>
              )}
            </div>
          )}
          <div className="h-1.5 rounded-full bg-white/10 mt-2 overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-accent-blue to-accent-purple"
              initial={false}
              animate={{ width: `${totalCount ? (visitedCount / totalCount) * 100 : 0}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
          <p className="text-xs text-white/50 mt-1">
            {visitedCount} / {totalCount} stops
          </p>

          <div className="flex items-center gap-3 mt-4">
            <button
              type="button"
              onClick={isPaused ? onResume : isPlaying ? onPause : onPlay}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-accent-blue/20 hover:bg-accent-blue/30 text-white border border-accent-blue/30 transition-colors"
              aria-label={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
              <span>{isPlaying ? "Pause" : "Play"}</span>
            </button>
            <button
              type="button"
              onClick={onSkipNext}
              className="p-3 rounded-xl bg-white/10 hover:bg-white/15 text-white transition-colors"
              aria-label="Skip to next"
            >
              <SkipForward className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={onReplay}
              className="p-3 rounded-xl bg-white/10 hover:bg-white/15 text-white transition-colors"
              aria-label="Replay"
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
                "relative w-14 h-14 rounded-full flex items-center justify-center transition-all",
                askState === "listening" && "animate-ring-listening bg-accent-blue/30",
                askState === "thinking" && "bg-amber-500/20",
                askState === "speaking" && "bg-emerald-500/20",
                (askState === "idle" || !isAsking) && "bg-white/10 hover:bg-white/20"
              )}
              aria-label="Hold to ask"
            >
              <Mic className="w-6 h-6 text-white" />
            </button>
          </div>
          <AnimatePresence>
            {isAsking && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center text-sm text-white/80 mt-2"
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
              className="overflow-hidden border-t border-white/10 pt-4"
            >
              {onFitBounds && (
                <div className="px-4 pb-2">
                  <button
                    type="button"
                    onClick={onFitBounds}
                    className="text-xs text-accent-blue hover:underline"
                  >
                    Fit route bounds
                  </button>
                </div>
              )}
              {currentPoi && (
                <div className="px-4 pb-6 text-sm text-white/80">
                  <p className="font-medium text-white mb-1">{currentPoi.name}</p>
                  <p>
                    {currentPoi.scripts?.friendly ||
                      currentPoi.scripts?.historian ||
                      currentPoi.scripts?.funny ||
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
