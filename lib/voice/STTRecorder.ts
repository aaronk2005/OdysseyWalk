const MAX_RECORD_MS = 8000;
const MIME = "audio/webm;codecs=opus";

export interface STTRecorderCallbacks {
  onStart?: () => void;
  onStop?: () => void;
  onTranscript?: (transcript: string) => void;
  onError?: (err: string) => void;
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

export class STTRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private stream: MediaStream | null = null;
  private timeoutId: ReturnType<typeof setTimeout> | null = null;
  private callbacks: STTRecorderCallbacks = {};
  private browserRecognition: SpeechRecognition | null = null;
  private useBrowserFallback = false;

  setCallbacks(cb: STTRecorderCallbacks): void {
    this.callbacks = cb;
  }

  async start(): Promise<void> {
    this.useBrowserFallback = false;
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
      // If mic access fails, try browser speech recognition as fallback
      const SpeechRec = getBrowserSpeechRecognition();
      if (SpeechRec) {
        this.startBrowserRecognition(SpeechRec);
      } else {
        this.callbacks.onError?.(e instanceof Error ? e.message : "Mic access denied");
      }
    }
  }

  private startBrowserRecognition(SpeechRec: new () => SpeechRecognition): void {
    this.useBrowserFallback = true;
    const recognition = new SpeechRec();
    this.browserRecognition = recognition;
    recognition.lang = "en-US";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0]?.[0]?.transcript ?? "";
      this.callbacks.onTranscript?.(transcript);
    };
    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      this.callbacks.onError?.("Speech recognition: " + event.error);
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
      // If server STT failed, try browser speech recognition as fallback
      const SpeechRec = getBrowserSpeechRecognition();
      if (SpeechRec && !this.useBrowserFallback) {
        this.startBrowserRecognition(SpeechRec);
      } else {
        this.callbacks.onError?.(e instanceof Error ? e.message : "STT failed");
      }
    }
  }
}
