const MAX_RECORD_MS = 8000;
const MIME = "audio/webm;codecs=opus";

export interface STTRecorderCallbacks {
  onStart?: () => void;
  onStop?: () => void;
  onTranscript?: (transcript: string) => void;
  onError?: (err: string) => void;
}

export class STTRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private stream: MediaStream | null = null;
  private timeoutId: ReturnType<typeof setTimeout> | null = null;
  private callbacks: STTRecorderCallbacks = {};

  setCallbacks(cb: STTRecorderCallbacks): void {
    this.callbacks = cb;
  }

  async start(): Promise<void> {
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
      this.callbacks.onError?.(e instanceof Error ? e.message : "Mic access denied");
    }
  }

  stop(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
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
        throw new Error(err.error || res.statusText);
      }
      const data = await res.json();
      this.callbacks.onTranscript?.(data.transcript ?? "");
    } catch (e) {
      this.callbacks.onError?.(e instanceof Error ? e.message : "STT failed");
    }
  }
}
