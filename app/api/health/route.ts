import { NextResponse } from "next/server";
import { getServerConfig } from "@/lib/config";

export async function GET() {
  const config = getServerConfig();
  const ok =
    config.mapsKeyPresent ||
    config.openRouterConfigured ||
    config.gradiumConfigured;

  // Validate API key formats and add warnings
  const warnings: string[] = [];
  const gradiumKey = process.env.GRADIUM_API_KEY;
  const openRouterKey = process.env.OPENROUTER_API_KEY;

  // Check if Gradium key has wrong format (looks like OpenRouter key)
  if (gradiumKey && gradiumKey.startsWith("sk-or-v1-")) {
    warnings.push("GRADIUM_API_KEY appears to be an OpenRouter key (starts with sk-or-v1-). Gradium keys should start with gd_. Browser TTS/STT fallbacks will be used.");
  }

  // Check if OpenRouter key looks valid
  if (openRouterKey && !openRouterKey.startsWith("sk-or-v1-")) {
    warnings.push("OPENROUTER_API_KEY format looks unusual (should start with sk-or-v1-)");
  }

  // Check if Gradium TTS URL is set when key is present
  // Note: STT is WebSocket-only, so GRADIUM_STT_URL is not required
  if (gradiumKey && !process.env.GRADIUM_TTS_URL) {
    warnings.push("GRADIUM_API_KEY is set but GRADIUM_TTS_URL is missing");
  }

  return NextResponse.json({
    ok: true,
    mapsKeyPresent: config.mapsKeyPresent,
    openRouterConfigured: config.openRouterConfigured,
    gradiumConfigured: config.gradiumConfigured,
    warnings: warnings.length > 0 ? warnings : undefined,
    fallbacks: {
      tts: "Browser SpeechSynthesis API",
      stt: "Browser SpeechRecognition API (Chrome, Edge, Safari)",
    },
  });
}
