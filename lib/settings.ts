import type { VoiceStyle, Lang } from "@/lib/types";

const KEY = "odyssey-settings";

export interface PersistedSettings {
  demoMode: boolean;
  voiceStyle: VoiceStyle;
  lang: Lang;
  followCamera: boolean;
}

const defaults: PersistedSettings = {
  demoMode: true,
  voiceStyle: "friendly",
  lang: "en",
  followCamera: true,
};

export function loadSettings(): PersistedSettings {
  if (typeof window === "undefined") return defaults;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as Partial<PersistedSettings>;
    return {
      demoMode: typeof parsed.demoMode === "boolean" ? parsed.demoMode : defaults.demoMode,
      voiceStyle: parsed.voiceStyle ?? defaults.voiceStyle,
      lang: parsed.lang ?? defaults.lang,
      followCamera: typeof parsed.followCamera === "boolean" ? parsed.followCamera : defaults.followCamera,
    };
  } catch {
    return defaults;
  }
}

export function saveSettings(s: Partial<PersistedSettings>): void {
  if (typeof window === "undefined") return;
  try {
    const current = loadSettings();
    const next = { ...current, ...s };
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
}
