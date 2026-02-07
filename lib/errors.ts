/**
 * Typed errors and user-facing message helpers.
 * Use for external calls (maps, geo, STT, TTS, LLM, data).
 */

export class MapsError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = "MapsError";
  }
}

export class GeoError extends Error {
  constructor(
    message: string,
    public readonly code?: "permission_denied" | "unavailable" | "timeout",
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = "GeoError";
  }
}

export class STTError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = "STTError";
  }
}

export class TTSError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = "TTSError";
  }
}

export class LLMError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = "LLMError";
  }
}

export class DataError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = "DataError";
  }
}

export type AppError =
  | MapsError
  | GeoError
  | STTError
  | TTSError
  | LLMError
  | DataError;

/** User-facing short message; safe to show in UI. */
export function toUserMessage(err: unknown): string {
  if (err instanceof GeoError) {
    if (err.code === "permission_denied")
      return "Location access denied. Demo mode is on so you can still try the tour.";
    if (err.code === "unavailable") return "Location unavailable. Using demo mode.";
  }
  if (err instanceof STTError) return "Voice input didn't work. Try typing your question.";
  if (err instanceof TTSError) return "Audio couldn't be played. You can read the text or try again.";
  if (err instanceof LLMError) return "Answer from tour facts (AI temporarily unavailable).";
  if (err instanceof DataError) return "Couldn't load that tour. Try another or the demo.";
  if (err instanceof MapsError) return "Map couldn't load. You can still use the tour list and audio.";
  if (err instanceof Error) return err.message || "Something went wrong.";
  return "Something went wrong.";
}

/** Debug details; only show in debug panel or logs. */
export function toDebugDetails(err: unknown): string {
  if (err instanceof Error) {
    const parts = [err.name, err.message];
    if (err.cause) parts.push(String(err.cause));
    return parts.join(" | ");
  }
  return String(err);
}
