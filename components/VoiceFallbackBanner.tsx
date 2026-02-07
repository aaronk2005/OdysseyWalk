"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, Volume2, Info, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";

const DISMISSED_KEY = "odyssey-voice-fallback-dismissed";

interface VoiceFallbackBannerProps {
  className?: string;
}

/**
 * Shows once when browser fallbacks are active. Explains how voice works.
 * User can dismiss it, and it won't show again.
 */
export function VoiceFallbackBanner({ className }: VoiceFallbackBannerProps) {
  const [show, setShow] = useState(false);
  const [hasWarnings, setHasWarnings] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const dismissed = localStorage.getItem(DISMISSED_KEY);
    if (dismissed) return;

    fetch("/api/health")
      .then((r) => r.json())
      .then((data) => {
        if (data.warnings && data.warnings.length > 0) {
          setHasWarnings(true);
          setShow(true);
        }
      })
      .catch(() => {});
  }, []);

  const handleDismiss = () => {
    setShow(false);
    if (typeof window !== "undefined") {
      localStorage.setItem(DISMISSED_KEY, "true");
    }
  };

  return (
    <AnimatePresence>
      {show && hasWarnings && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          className={cn(
            "px-4 py-3 rounded-card border bg-blue-50 border-blue-200 text-blue-900",
            className
          )}
        >
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 shrink-0 mt-0.5 text-blue-600" />
            <div className="flex-1 min-w-0 text-caption">
              <p className="font-semibold mb-1">Using browser voice features</p>
              <div className="flex items-center gap-3 text-xs">
                <div className="flex items-center gap-1.5">
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>Built-in TTS</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Mic className="w-3.5 h-3.5" />
                  <span>Built-in STT</span>
                </div>
              </div>
              <p className="text-xs mt-1.5 opacity-75">
                Voice Q&A works great with your browser's native speech features. No additional setup needed.
              </p>
            </div>
            <button
              type="button"
              onClick={handleDismiss}
              className="shrink-0 p-1 rounded-full hover:bg-blue-100 transition-colors"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
