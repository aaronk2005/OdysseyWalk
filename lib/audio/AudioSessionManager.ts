import { AudioState } from "@/lib/types";
import type { POI, Lang, VoiceStyle } from "@/lib/types";

export type AudioStateListener = (state: AudioState) => void;

const PLACEHOLDER_AUDIO = "/audio/placeholder.mp3";

function simpleHash(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return "a" + Math.abs(h).toString(36);
}

/**
 * Browser-native TTS fallback using SpeechSynthesis API.
 * Used when the server TTS endpoint is unavailable.
 */
function browserTtsAvailable(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

function speakWithBrowserTts(text: string, lang: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!browserTtsAvailable()) {
      reject(new Error("Browser TTS not available"));
      return;
    }
    // Cancel any in-progress speech
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    // Map language codes to browser TTS language codes
    const langMap: Record<string, string> = {
      en: "en-US",
      fr: "fr-FR",
      es: "es-ES",
      de: "de-DE",
      it: "it-IT",
      ja: "ja-JP",
      pt: "pt-BR",
      zh: "zh-CN",
    };
    utterance.lang = langMap[lang] || "en-US";
    utterance.rate = 0.95;
    utterance.pitch = 1;
    utterance.onend = () => resolve();
    utterance.onerror = (e) => {
      if (e.error === "canceled" || e.error === "interrupted") {
        resolve(); // Not an error — we stopped it
      } else {
        reject(new Error("Browser TTS error: " + e.error));
      }
    };
    window.speechSynthesis.speak(utterance);
  });
}

function cancelBrowserTts(): void {
  if (browserTtsAvailable()) {
    window.speechSynthesis.cancel();
  }
}

class AudioSessionManagerImpl {
  private state: AudioState = AudioState.IDLE;
  private stateBeforePause: AudioState = AudioState.IDLE;
  private listeners = new Set<AudioStateListener>();
  private currentAudio: HTMLAudioElement | null = null;
  private cache = new Map<string, string>();
  private lang: Lang = "en";
  private voiceStyle: VoiceStyle = "friendly";
  /** Incremented on each stop() or start of a new play; used to cancel in-flight TTS. */
  private playId = 0;
  /** Play id for the currently "active" play; in-flight playTts checks this before playing. */
  private currentPlayId = 0;
  /** AbortController for the current in-flight fetch; aborted when starting a new play or stop(). */
  private fetchAbortController: AbortController | null = null;

  setOptions(opts: { lang?: Lang; voiceStyle?: VoiceStyle }): void {
    if (opts.lang) this.lang = opts.lang;
    if (opts.voiceStyle) this.voiceStyle = opts.voiceStyle;
  }

  getState(): AudioState {
    return this.state;
  }

  subscribe(listener: AudioStateListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private setState(s: AudioState): void {
    this.state = s;
    this.listeners.forEach((l) => l(s));
  }

  private cacheKey(text: string, purpose: string): string {
    return simpleHash(text + this.lang + this.voiceStyle + purpose);
  }

  /** Returns true if the given text for the purpose is already in the cache (for instant playback). */
  isCached(text: string, purpose: string): boolean {
    return this.cache.has(this.cacheKey(text, purpose));
  }

  clearCache(): void {
    this.cache.forEach((url) => {
      try {
        if (url.startsWith("blob:")) URL.revokeObjectURL(url);
      } catch {
        // ignore
      }
    });
    this.cache.clear();
  }

  /** Abort in-flight TTS fetch so completed responses are not played. */
  private abortInFlightFetch(): void {
    if (this.fetchAbortController) {
      this.fetchAbortController.abort();
      this.fetchAbortController = null;
    }
  }

  async playIntro(text: string): Promise<{ played: boolean }> {
    this.stop();
    this.abortInFlightFetch();
    this.fetchAbortController = new AbortController();
    this.currentPlayId = ++this.playId;
    this.setState(AudioState.PLAYING_INTRO);
    return this.playTts(text, "intro", this.fetchAbortController.signal).then((r) => {
      if (this.state === AudioState.PLAYING_INTRO) this.setState(AudioState.NAVIGATING);
      return r;
    });
  }

  async playPoiScript(poi: POI): Promise<{ played: boolean }> {
    this.stop();
    this.abortInFlightFetch();
    this.fetchAbortController = new AbortController();
    this.currentPlayId = ++this.playId;
    this.setState(AudioState.NAVIGATING);
    const text = poi.script ?? poi.scripts?.friendly ?? poi.scripts?.historian ?? poi.scripts?.funny ?? "";
    if (!text) return Promise.resolve({ played: false });
    this.setState(AudioState.NARRATING);
    return this.playTts(text, "poi", this.fetchAbortController!.signal).then((r) => {
      if (this.state === AudioState.NARRATING) this.setState(AudioState.NAVIGATING);
      return r;
    });
  }

  async playAnswer(text: string): Promise<{ played: boolean }> {
    this.stop();
    this.abortInFlightFetch();
    this.fetchAbortController = new AbortController();
    this.currentPlayId = ++this.playId;
    this.setState(AudioState.ANSWERING);
    return this.playTts(text, "answer", this.fetchAbortController.signal).then((r) => {
      if (this.state === AudioState.ANSWERING) this.setState(AudioState.NAVIGATING);
      return r;
    });
  }

  async playOutro(text: string): Promise<{ played: boolean }> {
    this.stop();
    this.abortInFlightFetch();
    this.fetchAbortController = new AbortController();
    this.currentPlayId = ++this.playId;
    this.setState(AudioState.PLAYING_OUTRO);
    return this.playTts(text, "outro", this.fetchAbortController.signal).then((r) => {
      if (this.state === AudioState.PLAYING_OUTRO) this.setState(AudioState.IDLE);
      return r;
    });
  }

  /** Prewarm cache for intro and first POI so first playback is instant. */
  async prewarm(introText: string, firstPoiScript?: string): Promise<void> {
    const tasks: Promise<unknown>[] = [
      this.fetchAndCacheTts(introText, "intro"),
    ];
    if (firstPoiScript) tasks.push(this.fetchAndCacheTts(firstPoiScript, "poi"));
    await Promise.all(tasks).catch(() => {});
  }

  /** Prewarm cache for multiple POI scripts in the background. */
  async prewarmPois(scripts: string[]): Promise<void> {
    const tasks = scripts
      .filter(s => s && s.trim().length > 0)
      .map(script => this.fetchAndCacheTts(script, "poi"));
    await Promise.all(tasks).catch(() => {});
  }

  /** Prewarm cache for outro so playback on the complete page starts with no latency. */
  async prewarmOutro(text: string): Promise<void> {
    if (!text?.trim()) return;
    await this.fetchAndCacheTts(text, "outro").catch(() => {});
  }

  private async fetchAndCacheTts(text: string, purpose: string, signal?: AbortSignal): Promise<void> {
    const key = this.cacheKey(text, purpose);
    if (this.cache.has(key)) return;
    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          lang: this.lang,
          voiceStyle: this.voiceStyle,
          purpose,
          returnBase64: false,
        }),
        signal,
      });
      if (!res.ok) {
        const errBody = await res.text();
        try {
          const err = JSON.parse(errBody) as { error?: string };
          console.warn("[TTS] Server returned", res.status, err?.error ?? errBody.slice(0, 200));
        } catch {
          console.warn("[TTS] Server returned", res.status, errBody.slice(0, 200));
        }
        return;
      }
      const blob = await res.blob();
      this.cache.set(key, URL.createObjectURL(blob));
    } catch {
      // ignore
    }
  }

  private usingBrowserTts = false;

  private async playTts(text: string, purpose: string, signal?: AbortSignal): Promise<{ played: boolean }> {
    this.usingBrowserTts = false;
    const myPlayId = this.currentPlayId;
    const key = this.cacheKey(text, purpose);
    const cached = this.cache.get(key);
    if (cached) {
      if (this.currentPlayId !== myPlayId) return { played: false };
      try {
        await this.playUrl(cached);
        return { played: true };
      } catch {
        this.cache.delete(key);
      }
    }
    try {
      await this.fetchAndCacheTts(text, purpose, signal);
      if (this.currentPlayId !== myPlayId) return { played: false };
      const url = this.cache.get(key);
      if (url) {
        await this.playUrl(url);
        return { played: true };
      }
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") return { played: false };
      // fall through to browser TTS
    }
    if (this.currentPlayId !== myPlayId) return { played: false };
    // Fallback: use browser's built-in SpeechSynthesis API
    if (browserTtsAvailable()) {
      try {
        this.usingBrowserTts = true;
        await speakWithBrowserTts(text, this.lang);
        this.usingBrowserTts = false;
        return { played: true };
      } catch {
        this.usingBrowserTts = false;
        // fall through to placeholder
      }
    }
    if (this.currentPlayId !== myPlayId) return { played: false };
    try {
      await this.playUrl(PLACEHOLDER_AUDIO);
      return { played: true };
    } catch {
      // no audio at all
    }
    if (
      this.state === AudioState.PLAYING_INTRO ||
      this.state === AudioState.NARRATING ||
      this.state === AudioState.ANSWERING ||
      this.state === AudioState.PLAYING_OUTRO
    ) {
      this.setState(AudioState.NAVIGATING);
    }
    return { played: false };
  }

  private playUrl(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.currentAudio) {
        this.currentAudio.pause();
        this.currentAudio.currentTime = 0;
        this.currentAudio = null;
      }
      const audio = new Audio(url);
      this.currentAudio = audio;
      audio.onended = () => {
        this.currentAudio = null;
        resolve();
      };
      audio.onerror = () => {
        this.currentAudio = null;
        reject(new Error("Playback failed"));
      };
      audio.play().catch(reject);
    });
  }

  pauseForMic(): void {
    cancelBrowserTts();
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio = null;
    }
    this.setState(AudioState.LISTENING);
  }

  pause(): void {
    cancelBrowserTts();
    if (this.currentAudio && !this.currentAudio.paused) {
      this.currentAudio.pause();
    }
    // Remember what we were doing so resume() can restore the correct state
    if (this.state !== AudioState.PAUSED && this.state !== AudioState.IDLE) {
      this.stateBeforePause = this.state;
    }
    this.setState(AudioState.PAUSED);
  }

  resume(): void {
    if (this.currentAudio && this.currentAudio.paused) {
      this.currentAudio.play().catch((e) => {
        console.warn("[AudioSessionManager] Resume failed:", e);
        this.setState(AudioState.NAVIGATING);
      });
      // Restore the state we were in before pause (NARRATING, ANSWERING, etc.)
      const restoreTo = this.stateBeforePause !== AudioState.IDLE && this.stateBeforePause !== AudioState.PAUSED
        ? this.stateBeforePause
        : AudioState.NAVIGATING;
      this.setState(restoreTo);
    } else {
      // No audio to resume or already playing — just go to NAVIGATING
      this.setState(AudioState.NAVIGATING);
    }
  }

  stop(): void {
    this.currentPlayId = 0;
    this.abortInFlightFetch();
    cancelBrowserTts();
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      this.currentAudio = null;
    }
    if (
      this.state !== AudioState.LISTENING &&
      this.state !== AudioState.ANSWERING
    ) {
      this.setState(AudioState.IDLE);
    }
  }
}

export const AudioSessionManager = new AudioSessionManagerImpl();
