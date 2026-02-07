import { NextResponse } from "next/server";
import { getServerConfig } from "@/lib/config";
import { rateLimit, getRateLimitHeaders } from "@/lib/rateLimit";
import { getClientIp } from "@/lib/api/getClientIp";

/**
 * Gradium STT is WebSocket-only (wss://eu.api.gradium.ai/api/speech/asr)
 * There is NO REST POST endpoint for STT.
 * See: https://gradium.ai/api_docs.html
 * 
 * This endpoint will return 503 to indicate browser fallback should be used.
 * The browser SpeechRecognition API works excellently for this use case.
 */

function parseTranscript(data: unknown): string {
  if (data == null) return "";
  if (typeof data === "string") return data;
  if (typeof data !== "object") return "";
  const o = data as Record<string, unknown>;
  const text =
    o.text ?? o.transcript ?? o.transcription ?? o.result ?? o.text_value;
  return typeof text === "string" ? text : "";
}

export async function POST(req: Request) {
  const ip = getClientIp(req);
  const rl = rateLimit(ip, "/api/stt");
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many requests", transcript: "" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } }
    );
  }

  // Gradium STT is WebSocket-only (no REST POST endpoint)
  // Return 503 to indicate browser fallback should be used
  // The browser SpeechRecognition API works excellently for this use case
  return NextResponse.json(
    {
      error: "Gradium STT is WebSocket-only. Use browser SpeechRecognition API fallback.",
      transcript: "",
      fallback: "browser",
    },
    {
      status: 503,
      headers: {
        ...getRateLimitHeaders(ip, "/api/stt"),
        "X-STT-Fallback": "browser",
      },
    }
  );
}
