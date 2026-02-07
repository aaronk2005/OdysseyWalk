"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, CheckCircle2, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface ApiHealth {
  ok: boolean;
  mapsKeyPresent: boolean;
  openRouterConfigured: boolean;
  gradiumConfigured: boolean;
  warnings?: string[];
  fallbacks?: {
    tts: string;
    stt: string;
  };
}

interface ApiStatusBannerProps {
  className?: string;
}

export function ApiStatusBanner({ className }: ApiStatusBannerProps) {
  const [health, setHealth] = useState<ApiHealth | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    fetch("/api/health")
      .then((r) => r.json())
      .then(setHealth)
      .catch(() => {});
  }, []);

  if (!health || !health.warnings || health.warnings.length === 0 || dismissed) {
    return null;
  }

  const hasGradiumWarning = health.warnings.some(w => w.includes("GRADIUM"));

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        className={cn(
          "px-4 py-3 rounded-card border text-caption",
          hasGradiumWarning
            ? "bg-blue-50 border-blue-200 text-blue-900"
            : "bg-amber-50 border-amber-200 text-amber-900",
          className
        )}
        role="alert"
      >
        <div className="flex items-start gap-3">
          <div className="shrink-0 mt-0.5">
            {hasGradiumWarning ? (
              <CheckCircle2 className="w-5 h-5 text-blue-600" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold mb-1">
              {hasGradiumWarning ? "Info: Using browser voice fallbacks" : "Configuration notice"}
            </p>
            {health.warnings.map((warning, i) => (
              <p key={i} className="text-xs mb-1">{warning}</p>
            ))}
            {hasGradiumWarning && health.fallbacks && (
              <p className="text-xs mt-2 opacity-75">
                ✓ TTS: {health.fallbacks.tts}<br />
                ✓ STT: {health.fallbacks.stt}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="shrink-0 p-1 rounded-full hover:bg-black/10 transition-colors"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
