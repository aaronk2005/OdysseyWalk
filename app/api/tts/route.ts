import { NextResponse } from "next/server";
import type { VoiceStyle, Lang } from "@/lib/types";
import { getServerConfig } from "@/lib/config";
import { rateLimit, getRateLimitHeaders } from "@/lib/rateLimit";
import { getClientIp } from "@/lib/api/getClientIp";
import { fetchWithTimeout } from "@/lib/net/fetchWithTimeout";
import { gradiumTtsOverWebSocket } from "@/lib/tts/gradiumTtsWs";

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
  es: {
    friendly: "B36pbz5_UoWn4BDl", // Valentina (es-mx)
    historian: "xu7iJ_fn2ElcWp2s", // Sergio (es)
    funny: "B36pbz5_UoWn4BDl",
  },
  de: {
    friendly: "-uP9MuGtBqAvEyxI", // Mia (de)
    historian: "0y1VZjPabOBU3rWy", // Maximilian (de)
    funny: "-uP9MuGtBqAvEyxI",
  },
  it: {
    friendly: "YTpq7expH9539ERJ", // Use English voice as fallback
    historian: "KWJiFWu2O9nMPYcR",
    funny: "LFZvm12tW_z0xfGo",
  },
  ja: {
    friendly: "YTpq7expH9539ERJ", // Use English voice as fallback
    historian: "KWJiFWu2O9nMPYcR",
    funny: "LFZvm12tW_z0xfGo",
  },
  pt: {
    friendly: "pYcGZz9VOo4n2ynh", // Alice (pt-br)
    historian: "M-FvVo9c-jGR4PgP", // Davi (pt-br)
    funny: "pYcGZz9VOo4n2ynh",
  },
  zh: {
    friendly: "YTpq7expH9539ERJ", // Use English voice as fallback
    historian: "KWJiFWu2O9nMPYcR",
    funny: "LFZvm12tW_z0xfGo",
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
  const apiKey = process.env.GRADIUM_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json(
      { error: "GRADIUM_API_KEY is not set. Add it to .env.local and restart the dev server." },
      { status: 503, headers: getRateLimitHeaders(ip, "/api/tts") }
    );
  }
  try {
    let body;
    try {
      body = await req.json();
    } catch (e) {
      return NextResponse.json({ error: "Invalid JSON in request body" }, { status: 400 });
    }
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

    // Map request lang to a Gradium voice (we have en, fr, es, de, it, ja, pt, zh)
    const langKey: Lang = GRADIUM_VOICE_IDS[lang as Lang] ? (lang as Lang) : "en";
    const voiceId = getGradiumVoiceId(langKey, voiceStyle);

    // Prefer WebSocket TTS when GRADIUM_TTS_WS_URL is set (wss://eu.api.gradium.ai/api/speech/tts)
    const ttsWsUrl = process.env.GRADIUM_TTS_WS_URL?.trim();
    if (ttsWsUrl) {
      try {
        // Gradium json_config: rewrite_rules (en|fr|de|es|pt), padding_bonus (positive = slower, negative = faster)
        const jsonConfig: Record<string, unknown> = {
          padding_bonus: 0.3, // Slightly slower for clarity
        };
        if (langKey !== "en") {
          jsonConfig.rewrite_rules = langKey;
        }
        const bytes = await gradiumTtsOverWebSocket(ttsWsUrl, apiKey, voiceId, text.slice(0, 5000), {
          timeoutMs: 20000,
          jsonConfig: Object.keys(jsonConfig).length > 0 ? jsonConfig : undefined,
        });
        if (bytes.length === 0) {
          return NextResponse.json(
            { error: "TTS WebSocket returned no audio" },
            { status: 502, headers: getRateLimitHeaders(ip, "/api/tts") }
          );
        }
        if (returnBase64) {
          const base64 = Buffer.from(bytes).toString("base64");
          return NextResponse.json(
            { audioBase64: base64, mimeType: "audio/wav" },
            { headers: { "X-TTS-Method": "websocket", ...getRateLimitHeaders(ip, "/api/tts") } }
          );
        }
        return new NextResponse(Buffer.from(bytes), {
          headers: {
            "Content-Type": "audio/wav",
            "Cache-Control": "public, max-age=86400",
            "X-TTS-Method": "websocket",
            ...getRateLimitHeaders(ip, "/api/tts"),
          },
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : "TTS WebSocket failed";
        console.error("[TTS] WebSocket failed:", msg, e instanceof Error ? e.stack : "");
        return NextResponse.json(
          { error: msg },
          { status: 502, headers: getRateLimitHeaders(ip, "/api/tts") }
        );
      }
    }

    // Gradium API POST (only when GRADIUM_TTS_URL is set). Per docs: https://eu.api.gradium.ai/api/post/speech/tts
    const ttsUrl = process.env.GRADIUM_TTS_URL?.trim();
    if (!ttsUrl) {
      return NextResponse.json(
        {
          error:
            "TTS WebSocket URL not set. Add GRADIUM_TTS_WS_URL=wss://eu.api.gradium.ai/api/speech/tts to .env.local (or set GRADIUM_TTS_URL for POST). Restart the dev server after changing env.",
        },
        { status: 503, headers: getRateLimitHeaders(ip, "/api/tts") }
      );
    }

    // Gradium API POST per https://gradium.ai/api_docs.html — auth: x-api-key only
    // Request body: { text, voice_id, output_format, only_audio?, json_config? }
    const gradiumBody: {
      text: string;
      voice_id: string;
      output_format: string;
      only_audio: boolean;
      json_config?: string;
    } = {
      text: text.slice(0, 5000),
      voice_id: voiceId,
      output_format: "wav",
      only_audio: !returnBase64, // When only_audio=true, get raw bytes; when false, get JSON stream
      // Add language-specific config for non-English languages
      ...(langKey !== "en" ? { json_config: JSON.stringify({ rewrite_rules: langKey }) } : {}),
    };

    const gradiumRes = await fetchWithTimeout(
      ttsUrl,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey, // Gradium docs: "Include your API key in the request header: x-api-key"
        },
        body: JSON.stringify(gradiumBody),
      },
      { timeoutMs: 15000, retries: 1 }
    );

    if (!gradiumRes.ok) {
      const errText = await gradiumRes.text();
      let hint = "";
      if (gradiumRes.status === 401) {
        hint = " Check GRADIUM_API_KEY: use a key from https://gradium.ai (gd_ or gsk_...).";
      } else if (gradiumRes.status === 404) {
        hint = " Endpoint not found. Check GRADIUM_TTS_URL - competition keys may use different endpoints. See docs/GRADIUM_COMPETITION_SETUP.md";
      }
      return NextResponse.json(
        { error: "TTS provider error: " + errText + hint },
        { status: 502, headers: getRateLimitHeaders(ip, "/api/tts") }
      );
    }

    const contentType = gradiumRes.headers.get("content-type") ?? "";
    let bytes: Uint8Array;

    // Gradium API: when only_audio=true, returns raw audio bytes (audio/wav)
    // When only_audio=false, returns JSON stream (application/json)
    if (contentType.includes("application/json")) {
      // JSON stream format (when only_audio=false)
      // This is a streaming response with multiple JSON messages
      // For simplicity, we'll read the entire stream and extract audio
      const text = await gradiumRes.text();
      // Try to parse as JSON - might be a single message or stream
      try {
        const lines = text.trim().split("\n").filter((l) => l.trim());
        let audioData = "";
        for (const line of lines) {
          const msg = JSON.parse(line);
          if (msg.type === "audio" && msg.audio) {
            audioData += msg.audio; // Base64 audio chunks
          } else if (msg.type === "error") {
            return NextResponse.json(
              { error: "TTS provider error: " + (msg.message || JSON.stringify(msg)) },
              { status: 502, headers: getRateLimitHeaders(ip, "/api/tts") }
            );
          }
        }
        if (!audioData) {
          return NextResponse.json(
            { error: "TTS provider returned no audio in JSON stream" },
            { status: 502, headers: getRateLimitHeaders(ip, "/api/tts") }
          );
        }
        bytes = new Uint8Array(Buffer.from(audioData, "base64"));
      } catch (e) {
        // Fallback: try parsing as single JSON object
        const data = JSON.parse(text) as {
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
      }
    } else {
      // Raw audio bytes (when only_audio=true)
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
        { headers: { "X-TTS-Method": "post", ...getRateLimitHeaders(ip, "/api/tts") } }
      );
    }

    return new NextResponse(Buffer.from(bytes), {
      headers: {
        "Content-Type": "audio/wav",
        "Cache-Control": "public, max-age=86400",
        "X-TTS-Method": "post",
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
