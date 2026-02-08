import { NextResponse } from "next/server";
import { getServerConfig } from "@/lib/config";
import { rateLimit, getRateLimitHeaders } from "@/lib/rateLimit";
import { getClientIp } from "@/lib/api/getClientIp";
import { gradiumSttOverWebSocket } from "@/lib/stt/gradiumSttWs";
import { webmToPcm } from "@/lib/stt/webmToPcm";

/**
 * When Gradium STT is configured (GRADIUM_STT_WS_URL or wss GRADIUM_STT_URL + GRADIUM_API_KEY),
 * accepts multipart audio (e.g. webm/opus from browser), converts to PCM, and runs STT via
 * Gradium's WebSocket API (getSTT stream). Returns { transcript }.
 * Gradium STT is WebSocket-only; see https://gradium.ai/api_docs.html
 */

export async function POST(req: Request) {
  const config = getServerConfig();
  const ip = getClientIp(req);
  const rl = rateLimit(ip, "/api/stt");
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many requests", transcript: "" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } }
    );
  }

  if (!config.gradiumSttConfigured || !config.gradiumSttWsUrl) {
    return NextResponse.json(
      {
        error: "STT not configured. Set GRADIUM_API_KEY and GRADIUM_STT_WS_URL (e.g. wss://us.api.gradium.ai/api/speech/asr), or leave unset to use browser SpeechRecognition.",
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

  const apiKey = process.env.GRADIUM_API_KEY!;
  const wsUrl = config.gradiumSttWsUrl;

  try {
    const formData = await req.formData();
    const audio = formData.get("audio") as File | null;
    const lang = (formData.get("lang") as string) || "en";
    if (!audio || !(audio instanceof Blob)) {
      return NextResponse.json({ error: "Missing audio file", transcript: "" }, { status: 400 });
    }

    const arrayBuffer = await audio.arrayBuffer();
    const audioBuffer = Buffer.from(arrayBuffer);
    if (audioBuffer.length === 0) {
      return NextResponse.json({ error: "Empty audio", transcript: "" }, { status: 400 });
    }

    const { pcm } = await webmToPcm(audioBuffer);
    const transcript = await gradiumSttOverWebSocket(wsUrl, apiKey, pcm, {
      language: lang,
      timeoutMs: 15000,
    });

    return NextResponse.json(
      { transcript },
      { headers: getRateLimitHeaders(ip, "/api/stt") }
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : "STT failed";
    const hint = message.includes("ffmpeg")
      ? " Install ffmpeg on the server to convert browser audio to PCM for Gradium STT."
      : " Leave GRADIUM_STT_WS_URL unset in .env.local to use browser speech recognition instead.";
    console.error("[STT] POST /api/stt error:", message, e instanceof Error ? e.stack : e);
    return NextResponse.json(
      {
        transcript: "",
        error: message + hint,
      },
      { status: 500, headers: getRateLimitHeaders(ip, "/api/stt") }
    );
  }
}
