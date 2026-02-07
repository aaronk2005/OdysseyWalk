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
        className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white/70 border border-white/10"
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
            className="absolute bottom-full left-0 mb-2 w-72 max-h-[80vh] overflow-auto rounded-xl border border-white/10 bg-navy-900/95 backdrop-blur p-3 shadow-xl"
          >
            <p className="text-xs font-medium text-white/70 mb-2">Debug</p>
            {apiStatus != null && (
              <div className="flex flex-wrap gap-2 mb-2">
                <span className={cn("text-xs px-1.5 py-0.5 rounded", apiStatus.mapsKeyPresent ? "bg-emerald-500/20 text-emerald-300" : "bg-red-500/20 text-red-300")}>Maps</span>
                <span className={cn("text-xs px-1.5 py-0.5 rounded", apiStatus.openRouterConfigured ? "bg-emerald-500/20 text-emerald-300" : "bg-red-500/20 text-red-300")}>OpenRouter</span>
                <span className={cn("text-xs px-1.5 py-0.5 rounded", apiStatus.gradiumConfigured ? "bg-emerald-500/20 text-emerald-300" : "bg-red-500/20 text-red-300")}>Gradium</span>
              </div>
            )}
            {lastError && (
              <p className="text-xs text-red-300/90 mb-2 truncate max-w-full" title={lastError}>{lastError}</p>
            )}
            {userLat != null && userLng != null && (
              <p className="text-xs text-white/50 mb-2">
                You: {userLat.toFixed(5)}, {userLng.toFixed(5)}
              </p>
            )}
            <button
              type="button"
              onClick={onForceTriggerNext}
              className="w-full text-left text-xs py-1.5 px-2 rounded bg-accent-blue/20 text-accent-blue mb-2"
            >
              Play next POI
            </button>
            {onClearAudioCache && (
              <button
                type="button"
                onClick={onClearAudioCache}
                className="w-full text-left text-xs py-1.5 px-2 rounded bg-white/10 text-white/80 mb-2"
              >
                Clear audio cache
              </button>
            )}
            {audioState && (
              <p className="text-xs text-white/50 mb-1">Audio: {audioState}</p>
            )}
            {audioStateLog && audioStateLog.length > 0 && (
              <div className="text-xs text-white/40 max-h-20 overflow-auto">
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
                    "w-full flex items-center gap-2 text-left text-xs py-1.5 px-2 rounded",
                    visitedPoiIds.includes(poi.poiId)
                      ? "bg-white/5 text-white/60"
                      : "bg-white/10 text-white/90 hover:bg-white/15"
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
