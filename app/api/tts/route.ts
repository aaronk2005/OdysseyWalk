import { NextResponse } from "next/server";
import type { VoiceStyle, Lang } from "@/lib/types";
import { getServerConfig } from "@/lib/config";
import { rateLimit, getRateLimitHeaders } from "@/lib/rateLimit";
import { getClientIp } from "@/lib/api/getClientIp";
import { fetchWithTimeout } from "@/lib/net/fetchWithTimeout";

export async function POST(req: Request) {
  const config = getServerConfig();
  if (!config.gradiumConfigured) {
    return NextResponse.json(
      { error: "TTS not configured" },
      { status: 503 }
    );
  }
  const ip = getClientIp(req);
  const rl = rateLimit(ip, "/api/tts");
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } }
    );
  }
  const apiKey = process.env.GRADIUM_API_KEY!;
  const ttsUrl = process.env.GRADIUM_TTS_URL!;
  try {
    const body = await req.json();
    const { text, voiceStyle = "friendly", lang = "en", format = "mp3" } = body as {
      text: string;
      voiceStyle?: VoiceStyle;
      lang?: Lang;
      format?: string;
    };
    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "Missing text" }, { status: 400 });
    }

    const gradiumRes = await fetchWithTimeout(
      ttsUrl,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          text: text.slice(0, 5000),
          voice: voiceStyle === "historian" ? "narrator" : "default",
          language: lang === "fr" ? "fr" : "en",
          output_format: format || "mp3",
        }),
      },
      { timeoutMs: 15000, retries: 1 }
    );

    if (!gradiumRes.ok) {
      const errText = await gradiumRes.text();
      return NextResponse.json(
        { error: "TTS provider error: " + errText },
        { status: 502, headers: getRateLimitHeaders(ip, "/api/tts") }
      );
    }

    const contentType = gradiumRes.headers.get("content-type") || "audio/mpeg";
    const arrayBuffer = await gradiumRes.arrayBuffer();
    return new NextResponse(arrayBuffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400",
        ...getRateLimitHeaders(ip, "/api/tts"),
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "TTS failed" },
      { status: 500, headers: getRateLimitHeaders(ip, "/api/tts") }
    );
  }
}
