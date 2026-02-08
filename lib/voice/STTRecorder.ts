const MAX_RECORD_MS = 8000;
const MIME = "audio/webm;codecs=opus";

/**
 * Map getUserMedia / microphone errors to a clear message for the user.
 */
function getMicErrorMessage(e: unknown): string {
  if (e instanceof Error && "name" in e) {
    const name = (e as Error & { name?: string }).name;
    if (name === "NotAllowedError" || name === "PermissionDeniedError")
      return "Microphone access denied. Allow the mic in your browser or device settings and try again.";
    if (name === "NotFoundError")
      return "No microphone found. Connect a mic and try again.";
    if (name === "NotReadableError")
      return "Microphone is in use by another app. Close other apps using the mic and try again.";
    if (name === "OverconstrainedError")
      return "Microphone doesn't support required settings. Try another mic.";
    if (e.message) return e.message;
  }
  return typeof e === "string" ? e : "Microphone access failed. Check that a mic is connected and allowed.";
}

/**
 * Check that the microphone is available and the user has granted permission.
 * Requests the mic briefly then releases it. Call before starting recording to surface errors early.
 */
export function checkMic(): Promise<{ ok: true } | { ok: false; error: string }> {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
    return Promise.resolve({
      ok: false,
      error: "Microphone not supported in this browser. Use Chrome, Edge, or Safari.",
    });
  }
  return navigator.mediaDevices
    .getUserMedia({ audio: true })
    .then((stream) => {
      stream.getTracks().forEach((t) => t.stop());
      return { ok: true as const };
    })
    .catch((e) => ({
      ok: false as const,
      error: getMicErrorMessage(e),
    }));
}

export interface STTRecorderCallbacks {
  onStart?: () => void;
  onStop?: () => void;
  onTranscript?: (transcript: string) => void;
  onError?: (err: string) => void;
  /** Called when server STT (upload) failed so UI can prefer browser STT next time */
  onServerSttFailed?: () => void;
}

/**
 * Check if the browser supports SpeechRecognition (Chrome, Edge, Safari).
 * Used as fallback when the server STT endpoint is unavailable.
 */
function getBrowserSpeechRecognition(): (new () => SpeechRecognition) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognition;
    webkitSpeechRecognition?: new () => SpeechRecognition;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

interface SpeechRecognition extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
}

interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionErrorEvent {
  error: string;
  message: string;
}

export interface STTRecorderStartOptions {
  /** When false, use browser SpeechRecognition only (hold-to-talk). When true, record and upload to /api/stt. */
  useServerStt?: boolean;
}

export class STTRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private stream: MediaStream | null = null;
  private timeoutId: ReturnType<typeof setTimeout> | null = null;
  private callbacks: STTRecorderCallbacks = {};
  private browserRecognition: SpeechRecognition | null = null;
  private useBrowserFallback = false;
  private browserTranscripts: string[] = [];
  private lastInterimTranscript = "";
  private browserHoldToTalkFinished = false;

  setCallbacks(cb: STTRecorderCallbacks): void {
    this.callbacks = cb;
  }

  async start(options: STTRecorderStartOptions = {}): Promise<void> {
    const useServerStt = options.useServerStt !== false;
    this.useBrowserFallback = false;
    this.browserTranscripts = [];
    this.lastInterimTranscript = "";
    this.browserHoldToTalkFinished = false;

    if (!useServerStt) {
      const SpeechRec = getBrowserSpeechRecognition();
      if (SpeechRec) {
        this.startBrowserRecognitionHoldToTalk(SpeechRec);
        return;
      }
      this.callbacks.onError?.("Speech recognition not supported. Use Chrome, Edge, or Safari.");
      return;
    }

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const options: MediaRecorderOptions = { mimeType: MIME, audioBitsPerSecond: 128000 };
      if (!MediaRecorder.isTypeSupported(MIME)) {
        delete options.mimeType;
      }
      this.mediaRecorder = new MediaRecorder(this.stream, options);
      this.chunks = [];
      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data.size) this.chunks.push(e.data);
      };
      this.mediaRecorder.onstop = () => this.uploadAndGetTranscript();
      this.mediaRecorder.start(500);
      this.callbacks.onStart?.();
      this.timeoutId = setTimeout(() => this.stop(), MAX_RECORD_MS);
    } catch (e) {
      const SpeechRec = getBrowserSpeechRecognition();
      if (SpeechRec) {
        this.startBrowserRecognition(SpeechRec);
      } else {
        this.callbacks.onError?.(getMicErrorMessage(e));
      }
    }
  }

  private startBrowserRecognitionHoldToTalk(SpeechRec: new () => SpeechRecognition): void {
    this.useBrowserFallback = true;
    const recognition = new SpeechRec();
    this.browserRecognition = recognition;
    // Use a language the engine supports; Chrome/Safari support en-US well
    const lang = navigator.language?.startsWith("fr") ? "fr-FR" : "en-US";
    recognition.lang = lang;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        const text = result[0]?.transcript?.trim() ?? "";
        if (result.isFinal && text) {
          this.browserTranscripts.push(text);
          this.lastInterimTranscript = "";
        } else if (text) {
          this.lastInterimTranscript = text;
        }
      }
    };
    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error === "no-speech") {
        this.finishBrowserHoldToTalk();
      } else {
        this.finishBrowserHoldToTalk();
        this.callbacks.onError?.("Speech recognition: " + event.error);
      }
    };
    recognition.onend = () => {
      this.finishBrowserHoldToTalk();
      this.browserRecognition = null;
      this.releaseStream();
    };

    // Must call start() synchronously in the same turn as the user gesture (Chrome requirement)
    try {
      recognition.start();
      this.callbacks.onStart?.();
      this.timeoutId = setTimeout(() => this.stop(), MAX_RECORD_MS);
      // Acquire stream after start so we don't lose the gesture; used for mic indicator
      navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
        this.stream = stream;
      }).catch(() => {});
    } catch (e) {
      this.callbacks.onError?.(e instanceof Error ? e.message : "Speech recognition failed to start");
    }
  }

  private finishBrowserHoldToTalk(): void {
    if (this.browserHoldToTalkFinished) return;
    this.browserHoldToTalkFinished = true;
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    let transcript = this.browserTranscripts.join(" ").trim();
    if (!transcript && this.lastInterimTranscript) transcript = this.lastInterimTranscript.trim();
    this.callbacks.onTranscript?.(transcript);
    this.callbacks.onStop?.();
  }

  private startBrowserRecognition(SpeechRec: new () => SpeechRecognition): void {
    this.useBrowserFallback = true;
    const recognition = new SpeechRec();
    this.browserRecognition = recognition;
    // Set language based on browser preference or default to English
    recognition.lang = navigator.language || "en-US";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0]?.[0]?.transcript ?? "";
      if (transcript.trim()) {
        this.callbacks.onTranscript?.(transcript);
      } else {
        // Empty transcript - trigger fallback
        this.callbacks.onError?.("No speech detected");
      }
    };
    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      // Don't treat "no-speech" as a fatal error - let user try again
      if (event.error === "no-speech") {
        this.callbacks.onStop?.();
        this.callbacks.onError?.("No speech detected. Please try again.");
      } else {
        this.callbacks.onError?.("Speech recognition: " + event.error);
      }
    };
    recognition.onend = () => {
      this.callbacks.onStop?.();
      this.browserRecognition = null;
    };

    recognition.start();
    this.callbacks.onStart?.();
    this.timeoutId = setTimeout(() => this.stop(), MAX_RECORD_MS);
  }

  stop(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    if (this.browserRecognition) {
      this.browserRecognition.stop();
      this.browserRecognition = null;
      return;
    }
    if (this.mediaRecorder && this.mediaRecorder.state !== "inactive") {
      this.mediaRecorder.stop();
    }
    this.releaseStream();
    this.callbacks.onStop?.();
  }

  private releaseStream(): void {
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
  }

  private async uploadAndGetTranscript(): Promise<void> {
    const blob = new Blob(this.chunks, { type: MIME });
    this.chunks = [];
    if (blob.size < 500) {
      this.callbacks.onServerSttFailed?.();
      const SpeechRec = getBrowserSpeechRecognition();
      if (SpeechRec && !this.useBrowserFallback) {
        this.startBrowserRecognition(SpeechRec);
      } else {
        this.callbacks.onError?.("No audio recorded. Try again or use browser voice.");
      }
      return;
    }
    const form = new FormData();
    form.append("audio", blob, "recording.webm");
    try {
      const res = await fetch("/api/stt", { method: "POST", body: form });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error || res.statusText);
      }
      const data = await res.json();
      this.callbacks.onTranscript?.(data.transcript ?? "");
    } catch (e) {
      this.callbacks.onServerSttFailed?.();
      const SpeechRec = getBrowserSpeechRecognition();
      if (SpeechRec && !this.useBrowserFallback) {
        this.startBrowserRecognition(SpeechRec);
      } else {
        this.callbacks.onError?.(e instanceof Error ? e.message : "STT failed");
      }
    }
  }
}
