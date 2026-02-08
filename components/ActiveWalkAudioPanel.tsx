"use client";

import { motion } from "framer-motion";
import { Play, Pause, SkipForward, RotateCcw, Mic, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { AudioState } from "@/lib/types";
import { PlayingIndicator } from "./PlayingIndicator";

export type VoiceBarAskState = "idle" | "listening" | "thinking" | "speaking";

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
  showResumeHint?: boolean;
  /** Optional: link to place website for current stop */
  currentStopWebsite?: string | null;
  /** Mic (ask): hold to ask about this place */
  askState?: VoiceBarAskState;
  onAskStart?: () => void;
  onAskStop?: () => void;
  /** Voice next: hold to say "next" */
  onVoiceNextStart?: () => void;
  onVoiceNextStop?: () => void;
  isVoiceNextRecording?: boolean;
  voiceNextError?: string | null;
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
  currentStopWebsite,
  askState = "idle",
  onAskStart,
  onAskStop,
  onVoiceNextStart,
  onVoiceNextStop,
  isVoiceNextRecording = false,
  voiceNextError,
}: ActiveWalkAudioPanelProps) {
  const isPlaying =
    audioState === AudioState.NARRATING ||
    audioState === AudioState.PLAYING_INTRO ||
    audioState === AudioState.PLAYING_OUTRO ||
    audioState === AudioState.ANSWERING;
  const progressPct = totalStops ? (stopIndex / totalStops) * 100 : 0;
  const playButtonLabel = showResumeHint ? "Resume" : isPlaying ? "Pause" : "Play";
  const hasMic = Boolean(onAskStart && onAskStop);

  return (
    <motion.div
      layout
      className={cn(
        "mx-3 rounded-xl overflow-hidden border border-app-border/80 bg-surface/95 backdrop-blur-sm",
        (isPlaying || isAnswerPlaying) && "ring-2 ring-brand-primary/30"
      )}
    >
      {/* Thin progress bar at top */}
      <div className="h-1 rounded-full bg-app-border overflow-hidden">
        <motion.div
          className="h-full rounded-full bg-brand-primary"
          initial={false}
          animate={{ width: `${progressPct}%` }}
          transition={{ duration: 0.35, ease: "easeOut" }}
        />
      </div>

      <div className="px-3 py-2 flex items-center gap-2 min-h-[52px]">
        {/* Left: stop name + optional website */}
        <div className="flex-1 min-w-0 flex items-center gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-ink-primary truncate">
              {currentStopName || "Select a stop"}
            </p>
            <p className="text-[11px] text-ink-tertiary">
              Stop {Math.min(stopIndex, totalStops)} of {totalStops}
              {isAnswerPlaying && " · Answering…"}
            </p>
          </div>
          {currentStopWebsite && typeof currentStopWebsite === "string" && currentStopWebsite.trim() !== "" && (
            <a
              href={currentStopWebsite.startsWith("http") ? currentStopWebsite : `https://${currentStopWebsite}`}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 p-1.5 rounded-full text-ink-tertiary hover:text-brand-primary hover:bg-app-bg transition-colors"
              aria-label="Open place website"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          )}
          {isPlaying && <PlayingIndicator />}
          {isDemoMode && (
            <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-ink-tertiary/15 text-ink-tertiary font-medium shrink-0">
              Demo
            </span>
          )}
        </div>

        {/* Right: Replay | Play/Pause | Skip | Mic */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={onReplay}
            className="p-2 min-w-[40px] min-h-[40px] flex items-center justify-center rounded-full text-ink-tertiary hover:text-ink-primary hover:bg-app-bg transition-colors"
            aria-label="Replay current stop"
          >
            <RotateCcw className="w-5 h-5" />
          </button>

          <button
            type="button"
            onClick={onPlayPause}
            className={cn(
              "flex items-center justify-center min-w-[44px] min-h-[44px] w-11 h-11 rounded-full font-semibold transition-all shrink-0",
              "bg-brand-primary hover:bg-brand-primaryHover text-white shadow-md",
              "active:scale-[0.97]"
            )}
            aria-label={playButtonLabel}
          >
            {isPlaying ? (
              <Pause className="w-5 h-5" />
            ) : (
              <Play className="w-5 h-5 ml-0.5" />
            )}
          </button>

          <button
            type="button"
            onClick={onSkip}
            className="p-2 min-w-[40px] min-h-[40px] flex items-center justify-center rounded-full text-ink-tertiary hover:text-ink-primary hover:bg-app-bg transition-colors"
            aria-label="Skip to next stop"
          >
            <SkipForward className="w-5 h-5" />
          </button>

          {hasMic && (
            <button
              type="button"
              onMouseDown={onAskStart}
              onMouseLeave={onAskStop}
              onMouseUp={onAskStop}
              onTouchStart={(e) => {
                e.preventDefault();
                onAskStart?.();
              }}
              onTouchEnd={(e) => {
                e.preventDefault();
                onAskStop?.();
              }}
              onTouchCancel={onAskStop}
              className={cn(
                "p-2 min-w-[40px] min-h-[40px] flex items-center justify-center rounded-full transition-colors shrink-0",
                askState === "idle" &&
                  "text-ink-tertiary hover:text-brand-primary hover:bg-app-bg",
                askState === "listening" && "bg-brand-primary/20 text-brand-primary",
                askState === "thinking" && "bg-amber-500/20 text-amber-600",
                askState === "speaking" && "bg-emerald-500/20 text-emerald-600"
              )}
              aria-label="Hold to ask about this place"
            >
              <Mic className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

    </motion.div>
  );
}
