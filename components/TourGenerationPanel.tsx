"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import type { Theme, Lang, VoiceStyle } from "@/lib/types";
import { cn } from "@/lib/utils/cn";

const THEMES: { value: Theme; label: string }[] = [
  { value: "history", label: "History" },
  { value: "food", label: "Food" },
  { value: "campus", label: "Campus" },
  { value: "spooky", label: "Spooky" },
  { value: "art", label: "Art" },
];

const LANGS: { value: Lang; label: string }[] = [
  { value: "en", label: "English" },
  { value: "fr", label: "Français" },
];

const VOICES: { value: VoiceStyle; label: string }[] = [
  { value: "friendly", label: "Friendly" },
  { value: "historian", label: "Historian" },
  { value: "funny", label: "Funny" },
];

export interface TourPreferences {
  theme: Theme;
  durationMin: number;
  lang: Lang;
  voiceStyle: VoiceStyle;
}

interface TourGenerationPanelProps {
  preferences: TourPreferences;
  onPreferencesChange: (p: TourPreferences) => void;
  onGenerate: () => void;
  generating: boolean;
  disabled?: boolean;
}

export function TourGenerationPanel({
  preferences,
  onPreferencesChange,
  onGenerate,
  generating,
  disabled,
}: TourGenerationPanelProps) {
  const { theme, durationMin, lang, voiceStyle } = preferences;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-6 space-y-6"
    >
      <h2 className="font-medium text-white flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-accent-purple" />
        Preferences
      </h2>
      <div>
        <p className="text-sm text-white/70 mb-2">Theme</p>
        <div className="flex flex-wrap gap-2">
          {THEMES.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => onPreferencesChange({ ...preferences, theme: t.value })}
              className={cn(
                "px-3 py-1.5 rounded-lg text-sm transition-colors",
                theme === t.value
                  ? "bg-accent-purple/30 text-white border border-accent-purple/50"
                  : "bg-white/10 text-white/80 hover:bg-white/15"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className="text-sm text-white/70 mb-2">Duration: {durationMin} min</p>
        <input
          type="range"
          min={15}
          max={60}
          step={5}
          value={durationMin}
          onChange={(e) =>
            onPreferencesChange({ ...preferences, durationMin: Number(e.target.value) })
          }
          className="w-full h-2 rounded-full bg-white/10 accent-accent-blue"
        />
      </div>
      <div>
        <p className="text-sm text-white/70 mb-2">Language</p>
        <div className="flex flex-wrap gap-2">
          {LANGS.map((l) => (
            <button
              key={l.value}
              type="button"
              onClick={() => onPreferencesChange({ ...preferences, lang: l.value })}
              className={cn(
                "px-3 py-1.5 rounded-lg text-sm",
                lang === l.value ? "bg-accent-blue/30 text-white" : "bg-white/10 text-white/80"
              )}
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className="text-sm text-white/70 mb-2">Voice style</p>
        <div className="flex flex-wrap gap-2">
          {VOICES.map((v) => (
            <button
              key={v.value}
              type="button"
              onClick={() => onPreferencesChange({ ...preferences, voiceStyle: v.value })}
              className={cn(
                "px-3 py-1.5 rounded-lg text-sm",
                voiceStyle === v.value ? "bg-accent-blue/30 text-white" : "bg-white/10 text-white/80"
              )}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>
      <button
        type="button"
        onClick={onGenerate}
        disabled={disabled || generating}
        className={cn(
          "w-full flex items-center justify-center gap-2 py-3 rounded-xl font-medium",
          "bg-gradient-to-r from-accent-blue to-accent-purple text-white",
          "disabled:opacity-50 disabled:cursor-not-allowed"
        )}
      >
        {generating ? (
          <>
            <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
            Generating…
          </>
        ) : (
          "Generate My Tour"
        )}
      </button>
    </motion.div>
  );
}
