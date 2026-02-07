"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Mic, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils/cn";

/**
 * Zone 3: Voice Bar with Q&A mic + optional "say next" button.
 * Large circular mic = hero. Hold to ask; states: Listening… / Thinking… / Speaking…
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
        {/* Primary: Q&A mic button */}
        <div className="flex items-center gap-4">
          {/* Voice Next: say "next" to skip */}
          {onVoiceNextStart && onVoiceNextStop && (
            <motion.button
              type="button"
              onMouseDown={onVoiceNextStart}
              onMouseLeave={onVoiceNextStop}
              onMouseUp={onVoiceNextStop}
              onTouchStart={(e) => { e.preventDefault(); onVoiceNextStart(); }}
              onTouchEnd={(e) => { e.preventDefault(); onVoiceNextStop(); }}
              onTouchCancel={onVoiceNextStop}
              whileTap={{ scale: 0.92 }}
              className={cn(
                "w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 select-none touch-manipulation border-2",
                isVoiceNextRecording
                  ? "bg-brand-primary/20 border-brand-primary text-brand-primary animate-pulse"
                  : "bg-surface border-app-border text-ink-secondary hover:border-brand-primary/50 hover:text-ink-primary"
              )}
              aria-label='Hold and say "next" to skip'
            >
              <ArrowRight className="w-5 h-5" />
            </motion.button>
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
            whileTap={{ scale: 0.95 }}
            className={cn(
              "relative w-16 h-16 rounded-full flex items-center justify-center transition-all duration-200 select-none touch-manipulation overflow-hidden",
              "text-white shadow-lg",
              askState === "idle" && "bg-gradient-to-br from-brand-primary to-brand-primaryHover hover:shadow-xl",
              askState === "listening" && "animate-ring-listening bg-brand-primary/90 scale-105",
              askState === "thinking" && "bg-amber-500",
              askState === "speaking" && "bg-emerald-500"
            )}
            aria-label="Hold to ask"
          >
            {/* Ripple effect on press */}
            {askState === "listening" && (
              <motion.div
                className="absolute inset-0 bg-white/30 rounded-full"
                initial={{ scale: 0, opacity: 0.6 }}
                animate={{ scale: 2, opacity: 0 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
              />
            )}
            <Mic className="w-8 h-8 relative z-10" strokeWidth={2.5} />
          </motion.button>
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
