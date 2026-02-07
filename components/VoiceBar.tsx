"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Mic, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils/cn";

/**
 * Voice Bar: mic is the hero. One large centered Ask button; Voice Next is secondary.
 * Hold to ask; states: Idle / Listening / Thinking / Speaking.
 */
export type VoiceBarAskState = "idle" | "listening" | "thinking" | "speaking";

export interface VoiceBarProps {
  askState: VoiceBarAskState;
  onAskStart: () => void;
  onAskStop: () => void;
  /** Voice next: hold to say "next" or "continue" to advance */
  onVoiceNextStart?: () => void;
  onVoiceNextStop?: () => void;
  isVoiceNextRecording?: boolean;
  voiceNextError?: string | null;
}

export function VoiceBar({
  askState,
  onAskStart,
  onAskStop,
  onVoiceNextStart,
  onVoiceNextStop,
  isVoiceNextRecording = false,
  voiceNextError,
}: VoiceBarProps) {
  const isActive = askState !== "idle";
  const label =
    askState === "listening"
      ? "Listening…"
      : askState === "thinking"
        ? "Thinking…"
        : askState === "speaking"
          ? "Speaking…"
          : "Hold to ask about this place";

  return (
    <div className="px-4 py-4 safe-bottom">
      <div className="flex flex-col items-center gap-3 max-w-lg mx-auto">
        {/* Primary: single large centered mic (80px) + optional progress ring when listening */}
        <div className="flex flex-col items-center gap-3 relative">
          {/* Progress ring: visible when listening */}
          {askState === "listening" && (
            <span
              className="absolute inset-0 w-20 h-20 min-w-[80px] min-h-[80px] rounded-full border-2 border-brand-primary/60 pointer-events-none animate-ring-pulse-outer"
              aria-hidden
            />
          )}
          <motion.button
            type="button"
            onMouseDown={onAskStart}
            onMouseLeave={onAskStop}
            onMouseUp={onAskStop}
            onTouchStart={(e) => {
              e.preventDefault();
              onAskStart();
            }}
            onTouchEnd={(e) => {
              e.preventDefault();
              onAskStop();
            }}
            onTouchCancel={onAskStop}
            whileTap={{ scale: 0.96 }}
            className={cn(
              "relative w-20 h-20 min-w-[80px] min-h-[80px] rounded-full flex items-center justify-center transition-all duration-200 select-none touch-manipulation overflow-hidden shadow-xl",
              "text-white",
              askState === "idle" &&
                "bg-gradient-to-br from-brand-primary to-brand-primaryHover hover:shadow-2xl hover:scale-[1.02]",
              askState === "listening" && "animate-ring-listening bg-brand-primary/90 scale-105",
              askState === "thinking" && "bg-amber-500",
              askState === "speaking" && "bg-emerald-500"
            )}
            aria-label="Hold to ask"
          >
            {askState === "listening" && (
              <motion.div
                className="absolute inset-0 bg-white/30 rounded-full"
                initial={{ scale: 0, opacity: 0.6 }}
                animate={{ scale: 2, opacity: 0 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
              />
            )}
            <Mic className="w-10 h-10 relative z-10" strokeWidth={2.5} />
          </motion.button>

          {/* Voice Next: secondary — small text link or compact control */}
          {onVoiceNextStart && onVoiceNextStop && (
            <div className="flex items-center gap-2">
              <motion.button
                type="button"
                onMouseDown={onVoiceNextStart}
                onMouseLeave={onVoiceNextStop}
                onMouseUp={onVoiceNextStop}
                onTouchStart={(e) => {
                  e.preventDefault();
                  onVoiceNextStart();
                }}
                onTouchEnd={(e) => {
                  e.preventDefault();
                  onVoiceNextStop();
                }}
                onTouchCancel={onVoiceNextStop}
                whileTap={{ scale: 0.95 }}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium transition-colors select-none touch-manipulation",
                  isVoiceNextRecording
                    ? "bg-brand-primary/20 text-brand-primary"
                    : "text-ink-secondary hover:text-ink-primary hover:bg-surface-muted"
                )}
                aria-label='Hold and say "next" to skip'
              >
                <ArrowRight className="w-3.5 h-3.5" />
                <span>Say &quot;next&quot;</span>
              </motion.button>
            </div>
          )}
        </div>

        {/* Status label */}
        <AnimatePresence mode="wait">
          <motion.p
            key={isVoiceNextRecording ? "vnext" : askState}
            initial={{ opacity: 0, y: 2 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -2 }}
            transition={{ duration: 0.15 }}
            className="text-sm font-medium min-h-[20px] text-center"
          >
            <span
              className={
                isActive || isVoiceNextRecording ? "text-brand-primary" : "text-ink-secondary"
              }
            >
              {isVoiceNextRecording ? 'Say "next" or "continue"' : label}
            </span>
          </motion.p>
        </AnimatePresence>

        {voiceNextError && (
          <p className="text-xs text-red-500 text-center">{voiceNextError}</p>
        )}
      </div>
    </div>
  );
}
