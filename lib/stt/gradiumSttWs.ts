/**
 * Gradium STT via WebSocket (wss://eu.api.gradium.ai/api/speech/asr or us).
 * See: https://gradium.ai/api_docs.html — getSTT WebSocket Stream.
 *
 * Flow: connect → setup → ready → send audio (base64 PCM) → end_of_stream
 *       → receive text / end_text / end_of_stream → return concatenated transcript.
 *
 * Protocol matches rust-gradium (SttSetupMessage, SttAudioMessage, EosMessage;
 * server sends ready, text, end_text, step, error, end_of_stream).
 */

import WebSocket from "ws";

const DEFAULT_TIMEOUT_MS = 20000;
const CHUNK_SIZE = 4096; // send PCM in chunks to avoid huge frames

type SttWsMessage =
  | { type: "ready"; request_id?: string; sample_rate?: number; frame_size?: number; delay_in_frames?: number }
  | { type: "text"; text?: string; start_s?: number }
  | { type: "end_text"; stop_s?: number }
  | { type: "step"; step_idx?: number; step_duration_s?: number; total_duration_s?: number }
  | { type: "error"; message: string; code?: number }
  | { type: "end_of_stream" };

/**
 * Run STT over Gradium WebSocket. Sends PCM audio (s16le mono at sample_rate from server),
 * collects all "text" messages until "end_of_stream", returns concatenated transcript.
 */
export function gradiumSttOverWebSocket(
  wsUrl: string,
  apiKey: string,
  pcmBuffer: Buffer,
  options?: { language?: string; timeoutMs?: number }
): Promise<string> {
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const language = (options?.language || "en").trim().slice(0, 8);
  const key = (apiKey || "").trim();
  if (!key) {
    return Promise.reject(new Error("GRADIUM_API_KEY is empty"));
  }

  return new Promise((resolve, reject) => {
    const textParts: string[] = [];
    let settled = false;
    const finish = (err?: Error, transcript?: string) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      try {
        ws.removeAllListeners();
        ws.terminate();
      } catch (_) {}
      if (err) reject(err);
      else resolve(transcript ?? (textParts.join(" ").trim() || ""));
    };

    const ws = new WebSocket(wsUrl, {
      headers: { "x-api-key": key },
      perMessageDeflate: false,
    });

    const timeout = setTimeout(() => {
      if (settled) return;
      finish(new Error("Gradium STT WebSocket timeout"));
    }, timeoutMs);

    ws.on("error", (err) => {
      if (settled) return;
      const message = err instanceof Error ? err.message : String(err);
      const hint =
        message.includes("ECONNREFUSED") || message.includes("ENOTFOUND")
          ? " Check GRADIUM_STT_WS_URL (e.g. wss://us.api.gradium.ai/api/speech/asr) and network."
          : "";
      finish(new Error(message + hint));
    });

    ws.on("close", (code, reason) => {
      if (settled) return;
      if (code !== 1000 && code !== 1005) {
        const reasonStr = reason.toString();
        let hint = "";
        if (code === 4401) hint = " Unauthorized — check GRADIUM_API_KEY.";
        else if (code === 1008) hint = " Policy violation — check API key and STT permissions.";
        finish(new Error(`Gradium STT WebSocket closed (${code}): ${reasonStr}${hint}`));
        return;
      }
      finish(undefined, textParts.join(" ").trim() || "");
    });

    ws.on("message", (data: Buffer | string) => {
      if (settled) return;
      let raw: string;
      try {
        raw = typeof data === "string" ? data : data.toString("utf8");
      } catch {
        return;
      }
      let msg: SttWsMessage;
      try {
        msg = JSON.parse(raw) as SttWsMessage;
      } catch {
        return;
      }
      const t = (msg as { type?: string }).type;
      switch (t) {
        case "ready":
          // Server ready; send PCM in chunks then EOS
          try {
            const base64 = pcmBuffer.toString("base64");
            for (let i = 0; i < base64.length; i += CHUNK_SIZE) {
              const chunk = base64.slice(i, i + CHUNK_SIZE);
              ws.send(JSON.stringify({ type: "audio", audio: chunk }));
            }
            ws.send(JSON.stringify({ type: "end_of_stream" }));
          } catch (e) {
            finish(e instanceof Error ? e : new Error(String(e)));
          }
          break;
        case "text":
          if (typeof (msg as SttWsMessage & { text?: string }).text === "string") {
            textParts.push((msg as SttWsMessage & { text: string }).text);
          }
          break;
        case "end_text":
          // optional: could add space between phrases
          break;
        case "end_of_stream":
          finish(undefined, textParts.join(" ").trim() || "");
          break;
        case "error": {
          const errMsg = (msg as SttWsMessage & { message: string; code?: number });
          const m = errMsg.message || "Gradium STT error";
          const c = errMsg.code != null ? ` (code: ${errMsg.code})` : "";
          ws.terminate();
          finish(new Error(m + c));
          break;
        }
        default:
          // step, etc. — ignore
          break;
      }
    });

    ws.on("open", () => {
      if (settled) return;
      const setup = {
        type: "setup",
        model_name: "default",
        input_format: "pcm",
        json_config: { language },
      };
      ws.send(JSON.stringify(setup));
    });
  });
}
