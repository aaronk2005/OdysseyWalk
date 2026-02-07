import { AudioState } from "@/lib/types";
import { TTSError } from "@/lib/errors";

export type AudioStateListener = (state: AudioState) => void;
export type AudioStateTransitionLog = (from: AudioState, to: AudioState) => void;

const FADE_MS = 200;
const DUCK_VOLUME = 0.1;

function noop(): void {}

class AudioSessionManagerImpl {
  private state: AudioState = AudioState.IDLE;
  private listeners = new Set<AudioStateListener>();
  private transitionLog: AudioStateTransitionLog = noop;
  private currentAudio: HTMLAudioElement | null = null;
  private placeholderAudio = "/audio/placeholder.mp3";
  private audioCache = new Map<string, string>();

  getState(): AudioState {
    return this.state;
  }

  subscribe(listener: AudioStateListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  setTransitionLog(log: AudioStateTransitionLog | null): void {
    this.transitionLog = log ?? noop;
  }

  private setState(next: AudioState): void {
    if (next === this.state) return;
    const from = this.state;
    this.state = next;
    this.transitionLog(from, next);
    this.listeners.forEach((l) => l(next));
  }

  getCachedAudioUrl(key: string): string | null {
    return this.audioCache.get(key) ?? null;
  }

  clearAudioCache(): void {
    this.audioCache.forEach((url) => {
      try {
        if (url.startsWith("blob:")) URL.revokeObjectURL(url);
      } catch {
        // ignore
      }
    });
    this.audioCache.clear();
  }

  private cacheKey(poiId: string, voiceStyle: string, lang: string, scriptVersion: number): string {
    return `${poiId}:${voiceStyle}:${lang}:v${scriptVersion}`;
  }

  async playNarration(
    poiId: string,
    text: string,
    opts?: { voiceStyle?: string; lang?: string; scriptVersion?: number }
  ): Promise<{ played: boolean; textFallback?: string }> {
    this.stop();
    this.setState(AudioState.NAVIGATING);
    const voiceStyle = opts?.voiceStyle ?? "friendly";
    const lang = opts?.lang ?? "en";
    const scriptVersion = opts?.scriptVersion ?? 1;
    const key = this.cacheKey(poiId, voiceStyle, lang, scriptVersion);
    const cached = this.audioCache.get(key);
    try {
      if (cached) {
        await this.playUrl(cached);
        return { played: true };
      }
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, voiceStyle, lang, format: "mp3" }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new TTSError(err.error ?? "TTS failed");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      this.audioCache.set(key, url);
      await this.playUrl(url);
      return { played: true };
    } catch {
      try {
        await this.playUrl(this.placeholderAudio);
        return { played: true };
      } catch {
        // no audio at all
      }
      if (this.state === AudioState.NAVIGATING || this.state === AudioState.NARRATING) {
        this.setState(AudioState.IDLE);
      }
      return { played: false, textFallback: text };
    } finally {
      if (this.state === AudioState.NARRATING) this.setState(AudioState.IDLE);
    }
  }

  async playAnswerStream(answerText: string): Promise<{ played: boolean; textFallback?: string }> {
    this.setState(AudioState.ANSWERING);
    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: answerText,
          voiceStyle: "friendly",
          lang: "en",
          format: "mp3",
        }),
      });
      if (!res.ok) throw new TTSError("TTS failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      await this.playUrl(url);
      URL.revokeObjectURL(url);
      return { played: true };
    } catch {
      if (this.state === AudioState.ANSWERING) this.setState(AudioState.IDLE);
      return { played: false, textFallback: answerText };
    } finally {
      if (this.state === AudioState.ANSWERING) this.setState(AudioState.IDLE);
    }
  }

  private playUrl(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const audio = new Audio(url);
      this.currentAudio = audio;
      audio.onended = () => {
        this.currentAudio = null;
        if (
          this.state === AudioState.NARRATING ||
          this.state === AudioState.ANSWERING
        ) {
          this.setState(AudioState.IDLE);
        }
        resolve();
      };
      audio.onerror = () => {
        this.currentAudio = null;
        this.setState(AudioState.IDLE);
        reject(new Error("Playback failed"));
      };
      this.setState(AudioState.NARRATING);
      audio.play().catch(reject);
    });
  }

  async interruptForListening(): Promise<void> {
    const audio = this.currentAudio;
    if (audio) {
      const start = performance.now();
      const self = this;
      const fadeOut = () => {
        const elapsed = performance.now() - start;
        const t = Math.min(1, elapsed / FADE_MS);
        audio.volume = 1 - t * (1 - DUCK_VOLUME);
        if (t < 1) requestAnimationFrame(fadeOut);
        else {
          audio.pause();
          audio.currentTime = 0;
          self.clearCurrentAudio();
          self.setState(AudioState.LISTENING);
        }
      };
      requestAnimationFrame(fadeOut);
    } else {
      this.setState(AudioState.LISTENING);
    }
  }

  private clearCurrentAudio(): void {
    this.currentAudio = null;
  }

  pause(): void {
    if (this.currentAudio) this.currentAudio.pause();
    this.setState(AudioState.PAUSED);
  }

  resume(): void {
    if (this.currentAudio) {
      this.currentAudio.volume = 1;
      this.currentAudio.play();
      this.setState(AudioState.NARRATING);
    } else if (this.state === AudioState.PAUSED) {
      this.setState(AudioState.IDLE);
    }
  }

  stop(): void {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      this.clearCurrentAudio();
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
