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

const DEFAULT_TIMEOUT_MS = 15000;
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
      finish(err instanceof Error ? err : new Error(String(err)));
    });

    ws.on("close", (code, reason) => {
      if (settled) return;
      if (chunks.length === 0 && code !== 1000) {
        finish(new Error(`Gradium TTS WebSocket closed: ${code} ${reason.toString()}`));
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
      } catch {
        return;
      }

      switch (msg.type) {
        case "ready":
          ws.send(JSON.stringify({ type: "text", text: textToSend }));
          ws.send(JSON.stringify({ type: "end_of_stream" }));
          break;
        case "audio":
          if (msg.audio) {
            chunks.push(Buffer.from(msg.audio, "base64"));
          }
          break;
        case "end_of_stream":
          ws.close();
          finish();
          break;
        case "error":
          ws.terminate();
          finish(new Error(msg.message || "Gradium TTS error"));
          break;
        default:
          break;
      }
    });

    ws.on("open", () => {
      const setup: Record<string, unknown> = {
        type: "setup",
        model_name: "default",
        voice_id: voiceId,
        output_format: "wav",
      };
      if (options?.jsonConfig && Object.keys(options.jsonConfig).length > 0) {
        setup.json_config = JSON.stringify(options.jsonConfig);
      }
      ws.send(JSON.stringify(setup));
    });
  });
}
