import { NextResponse } from "next/server";
import type { VoiceStyle, Lang } from "@/lib/types";
import { getServerConfig } from "@/lib/config";
import { rateLimit, getRateLimitHeaders } from "@/lib/rateLimit";
import { getClientIp } from "@/lib/api/getClientIp";
import { fetchWithTimeout } from "@/lib/net/fetchWithTimeout";

/** Gradium voice_id by (lang, voiceStyle). From https://gradium.ai/api_docs.html */
const GRADIUM_VOICE_IDS: Record<Lang, Partial<Record<VoiceStyle, string>>> = {
  en: {
    friendly: "YTpq7expH9539ERJ", // Emma
    historian: "KWJiFWu2O9nMPYcR", // John
    funny: "LFZvm12tW_z0xfGo", // Kent
  },
  fr: {
    friendly: "b35yykvVppLXyw_l", // Elise
    historian: "axlOaUiFyOZhy4nv", // Leo
    funny: "axlOaUiFyOZhy4nv", // Leo
  },
};

function getGradiumVoiceId(lang: Lang, voiceStyle: VoiceStyle): string {
  const byLang = GRADIUM_VOICE_IDS[lang];
  const voiceId = byLang?.[voiceStyle] ?? byLang?.friendly;
  return voiceId ?? GRADIUM_VOICE_IDS.en.friendly!;
}

export async function POST(req: Request) {
  const config = getServerConfig();
  if (!config.gradiumConfigured) {
    return NextResponse.json({ error: "TTS not configured" }, { status: 503 });
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
    const {
      text,
      lang = "en",
      voiceStyle = "friendly",
      purpose = "poi",
      returnBase64,
    } = body as {
      text: string;
      lang?: Lang;
      voiceStyle?: VoiceStyle;
      purpose?: "intro" | "poi" | "answer" | "outro";
      returnBase64?: boolean;
    };
    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "Missing text" }, { status: 400 });
    }

    const langKey = lang === "fr" ? "fr" : "en";
    const voiceId = getGradiumVoiceId(langKey, voiceStyle);
    // Gradium API: setup.model_name, setup.voice_id, setup.output_format; text. Supports wav/pcm/opus (no mp3).
    const gradiumBody = {
      setup: {
        model_name: "default",
        voice_id: voiceId,
        output_format: "wav",
        ...(langKey ? { json_config: { rewrite_rules: langKey } } : {}),
      },
      text: text.slice(0, 5000),
    };

    const gradiumRes = await fetchWithTimeout(
      ttsUrl,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(gradiumBody),
      },
      { timeoutMs: 15000, retries: 1 }
    );

    if (!gradiumRes.ok) {
      const errText = await gradiumRes.text();
      const hint =
        gradiumRes.status === 401
          ? " Check GRADIUM_API_KEY: use a key from https://gradium.ai (format gd_...)."
          : "";
      return NextResponse.json(
        { error: "TTS provider error: " + errText + hint },
        { status: 502, headers: getRateLimitHeaders(ip, "/api/tts") }
      );
    }

    const contentType = gradiumRes.headers.get("content-type") ?? "";
    let bytes: Uint8Array;

    if (contentType.includes("application/json")) {
      const data = (await gradiumRes.json()) as {
        raw_data?: string;
        audio?: string;
        error?: string;
      };
      if (data.error) {
        return NextResponse.json(
          { error: "TTS provider error: " + data.error },
          { status: 502, headers: getRateLimitHeaders(ip, "/api/tts") }
        );
      }
      const b64 = data.raw_data ?? data.audio ?? "";
      if (!b64 || typeof b64 !== "string") {
        return NextResponse.json(
          { error: "TTS provider returned no audio" },
          { status: 502, headers: getRateLimitHeaders(ip, "/api/tts") }
        );
      }
      bytes = new Uint8Array(Buffer.from(b64, "base64"));
    } else {
      const arrayBuffer = await gradiumRes.arrayBuffer();
      bytes = new Uint8Array(arrayBuffer);
    }

    if (bytes.length === 0) {
      return NextResponse.json(
        { error: "TTS provider returned empty audio" },
        { status: 502, headers: getRateLimitHeaders(ip, "/api/tts") }
      );
    }

    if (returnBase64) {
      const base64 = Buffer.from(bytes).toString("base64");
      return NextResponse.json(
        { audioBase64: base64, mimeType: "audio/wav" },
        { headers: getRateLimitHeaders(ip, "/api/tts") }
      );
    }

    return new NextResponse(bytes, {
      headers: {
        "Content-Type": "audio/wav",
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
