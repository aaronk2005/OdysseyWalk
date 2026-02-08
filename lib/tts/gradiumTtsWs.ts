/**
 * Gradium TTS via WebSocket (wss://eu.api.gradium.ai/api/speech/tts).
 * See: https://gradium.ai/api_docs.html#tag/TTS/paths/~1api~1speech~1tts/get
 *
 * Flow: setup → ready → text → audio chunks → end_of_stream → return combined WAV bytes.
 *
 * Gradium allows only 2 concurrent TTS sessions per API key. We limit concurrency
 * so requests are queued instead of failing with "Concurrency limit exceeded".
 */

import WebSocket from "ws";

const DEFAULT_TIMEOUT_MS = 20000;
const MAX_CONCURRENT_SESSIONS = 2;

let activeSessions = 0;
const waitQueue: Array<() => void> = [];

function acquireSession(): Promise<void> {
  if (activeSessions < MAX_CONCURRENT_SESSIONS) {
    activeSessions += 1;
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    waitQueue.push(() => {
      activeSessions += 1;
      resolve();
    });
  });
}

function releaseSession(): void {
  activeSessions -= 1;
  if (waitQueue.length > 0 && activeSessions < MAX_CONCURRENT_SESSIONS) {
    const next = waitQueue.shift();
    if (next) next();
  }
}

type GradiumWsMessage =
  | { type: "ready"; request_id?: string }
  | { type: "audio"; audio: string }
  | { type: "text"; text?: string; start_s?: number; stop_s?: number }
  | { type: "end_of_stream" }
  | { type: "error"; message: string; code?: number };

/**
 * Request TTS audio from Gradium over WebSocket. Returns raw WAV bytes.
 * Concurrency is limited to Gradium's allowed sessions (2); extra requests wait in queue.
 */
export function gradiumTtsOverWebSocket(
  wsUrl: string,
  apiKey: string,
  voiceId: string,
  text: string,
  options?: { timeoutMs?: number; jsonConfig?: Record<string, unknown> }
): Promise<Uint8Array> {
  return acquireSession().then(() => {
    return runOneSession(wsUrl, apiKey, voiceId, text, options).finally(releaseSession);
  });
}

function runOneSession(
  wsUrl: string,
  apiKey: string,
  voiceId: string,
  text: string,
  options?: { timeoutMs?: number; jsonConfig?: Record<string, unknown> }
): Promise<Uint8Array> {
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const textToSend = text.slice(0, 5000);
  const key = (apiKey || "").trim();
  if (!key) {
    return Promise.reject(new Error("GRADIUM_API_KEY is empty"));
  }

  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let settled = false;
    const finish = (err?: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      if (err) reject(err);
      else try { resolve(new Uint8Array(Buffer.concat(chunks))); } catch (e) { reject(e); }
    };

    const ws = new WebSocket(wsUrl, {
      headers: {
        "x-api-key": key,
      },
      perMessageDeflate: false,
    });

    const timeout = setTimeout(() => {
      if (settled) return;
      ws.terminate();
      finish(new Error("Gradium TTS WebSocket timeout"));
    }, timeoutMs);

    ws.on("error", (err) => {
      if (settled) return;
      const message =
        err instanceof Error
          ? err.message
          : String(err);
      const hint =
        message.includes("ECONNREFUSED") || message.includes("ENOTFOUND")
          ? " Check GRADIUM_TTS_WS_URL (e.g. wss://eu.api.gradium.ai/api/speech/tts or wss://us.api.gradium.ai/api/speech/tts) and network."
          : message.includes("certificate") || message.includes("TLS")
            ? " TLS/SSL error — check GRADIUM_TTS_WS_URL uses wss:// (not ws://)."
            : "";
      finish(new Error(message + hint));
    });

    ws.on("close", (code, reason) => {
      if (settled) return;
      const reasonStr = reason.toString();
      if (chunks.length === 0 && code !== 1000) {
        let hint = "";
        if (code === 1002) {
          hint = " Protocol error - check voice_id is valid for your API key.";
        } else if (code === 1008) {
          hint = " Policy violation - check API key is valid and has TTS permissions.";
        } else if (code === 1011) {
          hint = " Server error - Gradium service might be unavailable.";
        } else if (code === 4401) {
          hint = " Unauthorized - check GRADIUM_API_KEY is correct (should start with gd_ or gsk_).";
        }
        finish(new Error(`Gradium TTS WebSocket closed (${code}): ${reasonStr}${hint}`));
        return;
      }
      finish();
    });

    ws.on("message", (data: Buffer | string) => {
      if (settled) return;
      let msg: GradiumWsMessage;
      try {
        const raw = typeof data === "string" ? data : data.toString("utf8");
        msg = JSON.parse(raw) as GradiumWsMessage;
      } catch (e) {
        console.warn("[GradiumWS] Failed to parse message:", e);
        return;
      }

      switch (msg.type) {
        case "ready":
          // Server is ready, send text and signal end
          ws.send(JSON.stringify({ type: "text", text: textToSend }));
          ws.send(JSON.stringify({ type: "end_of_stream" }));
          break;
        case "audio":
          if (msg.audio) {
            try {
              chunks.push(Buffer.from(msg.audio, "base64"));
            } catch (e) {
              console.warn("[GradiumWS] Failed to decode audio chunk:", e);
            }
          }
          break;
        case "end_of_stream":
          // All audio received, close connection
          ws.close(1000);
          finish();
          break;
        case "error":
          // Server reported an error
          const errorMsg = msg.message || "Gradium TTS error";
          const errorCode = msg.code ? ` (code: ${msg.code})` : "";
          let hint = "";
          if (errorMsg.includes("voice_id")) {
            hint = " Check that the voice_id is valid for your region/language.";
          } else if (errorMsg.includes("api_key") || errorMsg.includes("authentication")) {
            hint = " Verify GRADIUM_API_KEY is correct.";
          } else if (errorMsg.includes("rate limit")) {
            hint = " Too many requests - wait a moment and try again.";
          }
          ws.terminate();
          finish(new Error(errorMsg + errorCode + hint));
          break;
        default:
          // Ignore unknown message types (might be status updates, etc.)
          break;
      }
    });

    ws.on("open", () => {
      if (settled) return;
      const setup: Record<string, unknown> = {
        type: "setup",
        model_name: "default",
        voice_id: voiceId,
        output_format: "wav",
        sample_rate: 24000,
      };
      // Include json_config if provided (for language-specific settings)
      if (options?.jsonConfig && Object.keys(options.jsonConfig).length > 0) {
        setup.json_config = options.jsonConfig;
      }
      ws.send(JSON.stringify(setup));
    });
  });
}
