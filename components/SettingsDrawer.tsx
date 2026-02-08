"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import type { VoiceStyle, Lang } from "@/lib/types";
import { cn } from "@/lib/utils/cn";

interface SettingsDrawerProps {
  open: boolean;
  onClose: () => void;
  demoMode: boolean;
  onDemoModeChange: (v: boolean) => void;
  voiceStyle: VoiceStyle;
  onVoiceStyleChange: (v: VoiceStyle) => void;
  lang: Lang;
  onLangChange: (v: Lang) => void;
  followCamera?: boolean;
  onFollowCameraChange?: (v: boolean) => void;
}

const VOICE_OPTIONS: { value: VoiceStyle; label: string }[] = [
  { value: "friendly", label: "Friendly" },
  { value: "historian", label: "Historian" },
  { value: "funny", label: "Funny" },
];

const LANG_OPTIONS: { value: Lang; label: string }[] = [
  { value: "en", label: "English" },
  { value: "fr", label: "Français" },
  { value: "es", label: "Español" },
  { value: "de", label: "Deutsch" },
  { value: "it", label: "Italiano" },
  { value: "ja", label: "日本語" },
  { value: "pt", label: "Português" },
  { value: "zh", label: "中文" },
];

export function SettingsDrawer({
  open,
  onClose,
  demoMode,
  onDemoModeChange,
  voiceStyle,
  onVoiceStyleChange,
  lang,
  onLangChange,
  followCamera = true,
  onFollowCameraChange,
}: SettingsDrawerProps) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden
          />
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "tween", duration: 0.25 }}
            className="fixed top-0 right-0 bottom-0 w-full max-w-sm z-50 rounded-l-2xl border-l border-app-border bg-surface shadow-2xl"
          >
            <div className="p-4 flex items-center justify-between border-b border-app-border">
              <h2 className="text-heading-sm">Settings</h2>
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-button hover:bg-app-bg text-ink-primary"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-6">
              {onFollowCameraChange != null && (
                <div>
                  <p className="text-caption font-medium text-ink-secondary mb-2">Follow camera</p>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={followCamera}
                    onClick={() => onFollowCameraChange(!followCamera)}
                    className={cn(
                      "relative w-12 h-7 rounded-full transition-colors",
                      followCamera ? "bg-brand-primary" : "bg-app-border"
                    )}
                  >
                    <span
                      className={cn(
                        "absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200",
                        followCamera ? "translate-x-5" : "translate-x-0.5"
                      )}
                    />
                  </button>
                  <span className="ml-2 text-caption text-ink-secondary">{followCamera ? "On" : "Off"}</span>
                </div>
              )}
              <div>
                <p className="text-caption font-medium text-ink-secondary mb-2">Voice style</p>
                <div className="flex flex-wrap gap-2">
                  {VOICE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => onVoiceStyleChange(opt.value)}
                      className={cn(
                        "px-3 py-1.5 rounded-button text-sm transition-colors",
                        voiceStyle === opt.value
                          ? "bg-brand-primary text-white border border-brand-primary"
                          : "bg-surface-muted text-ink-secondary border border-app-border hover:bg-app-bg"
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-caption font-medium text-ink-secondary mb-2">Language</p>
                <div className="flex flex-wrap gap-2">
                  {LANG_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => onLangChange(opt.value)}
                      className={cn(
                        "px-3 py-1.5 rounded-button text-sm transition-colors",
                        lang === opt.value
                          ? "bg-brand-primary text-white border border-brand-primary"
                          : "bg-surface-muted text-ink-secondary border border-app-border hover:bg-app-bg"
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
