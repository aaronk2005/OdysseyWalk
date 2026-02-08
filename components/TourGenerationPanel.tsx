"use client";

import type { Theme, Lang, VoiceStyle } from "@/lib/types";
import { cn } from "@/lib/utils/cn";

const THEMES: { value: Theme; label: string }[] = [
  { value: "history", label: "History" },
  { value: "food", label: "Food" },
];

const LANGS: { value: Lang; label: string }[] = [
  { value: "en", label: "English" },
  { value: "fr", label: "Français" },
  { value: "es", label: "Español" },
  { value: "de", label: "Deutsch" },
  { value: "it", label: "Italiano" },
  { value: "ja", label: "日本語" },
  { value: "pt", label: "Português" },
  { value: "zh", label: "中文" },
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
    <div className="rounded-card border border-app-border bg-surface p-6 shadow-sm space-y-6">
      <h2 className="text-heading-sm">
        Preferences
      </h2>
      <div>
        <p className="text-caption font-medium text-ink-secondary mb-2">Theme</p>
        <div className="flex flex-wrap gap-2">
          {THEMES.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => onPreferencesChange({ ...preferences, theme: t.value })}
              className={cn(
                "px-3 py-2 rounded-button text-sm font-medium transition-all min-h-[44px] flex items-center",
                theme === t.value
                  ? "bg-brand-primary text-white border border-brand-primary"
                  : "bg-surface-muted text-ink-secondary border border-app-border hover:bg-app-bg"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className="text-caption font-medium text-ink-secondary mb-2">Duration: {durationMin} min</p>
        <div className="flex flex-wrap gap-2 mb-3">
          {[30, 45, 60, 90].map((mins) => (
            <button
              key={mins}
              type="button"
              onClick={() => onPreferencesChange({ ...preferences, durationMin: mins })}
              className={cn(
                "px-3 py-1.5 rounded-button text-sm font-medium min-h-[36px] flex items-center transition-all",
                durationMin === mins
                  ? "bg-brand-primary text-white border border-brand-primary"
                  : "bg-surface-muted text-ink-secondary border border-app-border hover:bg-app-bg"
              )}
            >
              {mins} min
            </button>
          ))}
        </div>
        <input
          type="range"
          min={30}
          max={90}
          step={5}
          value={durationMin}
          onChange={(e) =>
            onPreferencesChange({ ...preferences, durationMin: Number(e.target.value) })
          }
          className="w-full h-2.5 rounded-full bg-app-border accent-brand-primary focus:outline-none"
        />
      </div>
      <div>
        <p className="text-caption font-medium text-ink-secondary mb-2">Language</p>
        <div className="flex flex-wrap gap-2">
          {LANGS.map((l) => (
            <button
              key={l.value}
              type="button"
              onClick={() => onPreferencesChange({ ...preferences, lang: l.value })}
              className={cn(
                "px-3 py-2 rounded-button text-sm font-medium min-h-[44px] flex items-center transition-all",
                lang === l.value ? "bg-brand-primary text-white border border-brand-primary" : "bg-surface-muted text-ink-secondary border border-app-border hover:bg-app-bg"
              )}
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className="text-caption font-medium text-ink-secondary mb-2">Voice style</p>
        <div className="flex flex-wrap gap-2">
          {VOICES.map((v) => (
            <button
              key={v.value}
              type="button"
              onClick={() => onPreferencesChange({ ...preferences, voiceStyle: v.value })}
              className={cn(
                "px-3 py-2 rounded-button text-sm font-medium min-h-[44px] flex items-center transition-all",
                voiceStyle === v.value ? "bg-brand-primary text-white border border-brand-primary" : "bg-surface-muted text-ink-secondary border border-app-border hover:bg-app-bg"
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
          "w-full flex items-center justify-center gap-2 py-3.5 rounded-button font-semibold min-h-[48px]",
          "bg-brand-primary text-white shadow-md hover:bg-brand-primaryHover",
          "active:scale-[0.99] transition-transform",
          "disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
        )}
      >
        {generating ? (
          <>
            <span className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
            Generating…
          </>
        ) : (
          "Generate My Tour"
        )}
      </button>
    </div>
  );
}
