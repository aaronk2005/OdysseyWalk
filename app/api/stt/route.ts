import { NextResponse } from "next/server";
import { getServerConfig } from "@/lib/config";
import { rateLimit, getRateLimitHeaders } from "@/lib/rateLimit";
import { getClientIp } from "@/lib/api/getClientIp";
import { fetchWithTimeout } from "@/lib/net/fetchWithTimeout";

/**
 * When GRADIUM_STT_URL is set, forwards audio to the configured STT endpoint.
 * Note: Gradium STT is WebSocket-only per docs (wss://eu.api.gradium.ai/api/speech/asr).
 * There is no documented Gradium POST STT endpoint; if you get 404/405, use browser fallback
 * (leave GRADIUM_STT_URL unset) or implement a Gradium STT WebSocket client.
 * See: https://gradium.ai/api_docs.html
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
  const config = getServerConfig();
  const ip = getClientIp(req);
  const rl = rateLimit(ip, "/api/stt");
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many requests", transcript: "" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } }
    );
  }

  if (!config.gradiumSttConfigured) {
    return NextResponse.json(
      {
        error: "STT not configured. Set GRADIUM_API_KEY and GRADIUM_STT_URL, or use browser fallback.",
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
  const sttUrl = process.env.GRADIUM_STT_URL!;
  try {
    const formData = await req.formData();
    const audio = formData.get("audio") as File | null;
    const lang = (formData.get("lang") as string) || "en";
    if (!audio || !(audio instanceof Blob)) {
      return NextResponse.json({ error: "Missing audio file", transcript: "" }, { status: 400 });
    }

    const body = new FormData();
    body.append("file", audio, audio.name || "audio.webm");

    const gradiumRes = await fetchWithTimeout(
      sttUrl,
      {
        method: "POST",
        headers: {
          "x-api-key": apiKey, // Gradium uses x-api-key when a REST STT endpoint exists
        },
        body,
      },
      { timeoutMs: 15000, retries: 1 }
    );

    if (!gradiumRes.ok) {
      const errText = await gradiumRes.text();
      const hint =
        gradiumRes.status === 401
          ? " Check GRADIUM_API_KEY: use a key from https://gradium.ai (gd_ or gsk_...)."
          : gradiumRes.status === 404 || gradiumRes.status === 405
            ? " If Gradium STT is WebSocket-only, leave GRADIUM_STT_URL unset to use browser fallback."
            : "";
      return NextResponse.json(
        { error: "STT provider error: " + errText + hint, transcript: "" },
        { status: 502, headers: getRateLimitHeaders(ip, "/api/stt") }
      );
    }

    const contentType = gradiumRes.headers.get("content-type") ?? "";
    let transcript = "";
    if (contentType.includes("application/json")) {
      const data = (await gradiumRes.json()) as unknown;
      transcript = parseTranscript(data);
    } else {
      const text = await gradiumRes.text();
      transcript = text.trim();
    }

    return NextResponse.json(
      { transcript },
      { headers: getRateLimitHeaders(ip, "/api/stt") }
    );
  } catch (e) {
    return NextResponse.json(
      { transcript: "", error: e instanceof Error ? e.message : "STT failed" },
      { status: 500, headers: getRateLimitHeaders(ip, "/api/stt") }
    );
  }
}
