"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bug, MapPin } from "lucide-react";
import type { POI } from "@/lib/types";
import { cn } from "@/lib/utils/cn";

export interface ApiStatus {
  mapsKeyPresent: boolean;
  openRouterConfigured: boolean;
  gradiumConfigured: boolean;
  /** "websocket" | "post" when Gradium TTS is configured */
  gradiumTtsMethod?: "websocket" | "post" | null;
  warnings?: string[];
  fallbacks?: {
    tts: string;
    stt: string;
  };
}

interface DebugPanelProps {
  pois: POI[];
  visitedPoiIds: string[];
  onJumpToPoi: (poiId: string) => void;
  onForceTriggerNext: () => void;
  onClearAudioCache?: () => void;
  userLat?: number;
  userLng?: number;
  audioState?: string;
  audioStateLog?: string[];
  apiStatus?: ApiStatus | null;
  lastError?: string | null;
}

export function DebugPanel({
  pois,
  visitedPoiIds,
  onJumpToPoi,
  onForceTriggerNext,
  onClearAudioCache,
  userLat,
  userLng,
  audioState,
  audioStateLog,
  apiStatus,
  lastError,
}: DebugPanelProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed bottom-24 left-2 z-30">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="p-2 rounded-button bg-surface hover:bg-surface-muted text-ink-secondary border border-app-border shadow-sm"
        aria-label="Debug panel"
      >
        <Bug className="w-4 h-4" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="absolute bottom-full left-0 mb-2 w-72 max-h-[80vh] overflow-auto rounded-card border border-app-border bg-surface p-3 shadow-xl"
          >
            <p className="text-hint font-medium text-ink-secondary mb-2">Debug</p>
            {apiStatus != null && (
              <>
                <div className="flex flex-wrap gap-2 mb-2">
                  <span className={cn("text-xs px-1.5 py-0.5 rounded", apiStatus.mapsKeyPresent ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800")}>Maps</span>
                  <span className={cn("text-xs px-1.5 py-0.5 rounded", apiStatus.openRouterConfigured ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800")}>OpenRouter</span>
                  <span className={cn("text-xs px-1.5 py-0.5 rounded", apiStatus.gradiumConfigured ? "bg-blue-100 text-blue-800" : "bg-red-100 text-red-800")} title={apiStatus.gradiumTtsMethod ?? undefined}>
                    Gradium{apiStatus.gradiumTtsMethod ? ` (${apiStatus.gradiumTtsMethod})` : ""}
                  </span>
                </div>
                {apiStatus.warnings && apiStatus.warnings.length > 0 && (
                  <div className="mb-2 p-2 bg-blue-50 rounded text-[10px] text-blue-800">
                    {apiStatus.warnings.map((w, i) => (
                      <div key={i}>⚠️ {w}</div>
                    ))}
                  </div>
                )}
                {apiStatus.fallbacks && (
                  <div className="mb-2 p-2 bg-emerald-50 rounded text-[10px] text-emerald-800">
                    <div>✓ Fallback TTS/STT active</div>
                  </div>
                )}
              </>
            )}
            {lastError && (
              <p className="text-xs text-red-600 mb-2 truncate max-w-full" title={lastError}>{lastError}</p>
            )}
            {userLat != null && userLng != null && (
              <p className="text-hint text-ink-tertiary mb-2">
                You: {userLat.toFixed(5)}, {userLng.toFixed(5)}
              </p>
            )}
            <button
              type="button"
              onClick={onForceTriggerNext}
              className="w-full text-left text-xs py-1.5 px-2 rounded-button bg-brand-primary/10 text-brand-primary mb-2 font-medium"
            >
              Play next POI
            </button>
            {onClearAudioCache && (
              <button
                type="button"
                onClick={onClearAudioCache}
                className="w-full text-left text-xs py-1.5 px-2 rounded-button bg-surface-muted text-ink-secondary mb-2"
              >
                Clear audio cache
              </button>
            )}
            {audioState && (
              <p className="text-hint text-ink-tertiary mb-1">Audio: {audioState}</p>
            )}
            {audioStateLog && audioStateLog.length > 0 && (
              <div className="text-hint text-ink-tertiary max-h-20 overflow-auto">
                {audioStateLog.slice(-5).map((line, i) => (
                  <div key={i}>{line}</div>
                ))}
              </div>
            )}
            <div className="space-y-1 max-h-40 overflow-auto">
              {pois.map((poi) => (
                <button
                  key={poi.poiId}
                  type="button"
                  onClick={() => onJumpToPoi(poi.poiId)}
                  className={cn(
                    "w-full flex items-center gap-2 text-left text-xs py-1.5 px-2 rounded-button",
                    visitedPoiIds.includes(poi.poiId)
                      ? "bg-surface-muted text-ink-tertiary"
                      : "bg-surface-muted text-ink-primary hover:bg-app-bg"
                  )}
                >
                  <MapPin className="w-3 h-3 shrink-0" />
                  <span className="truncate">{poi.name}</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
