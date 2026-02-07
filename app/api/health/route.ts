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

  // Gradium keys are gd_ or gsk_ (from gradium.ai). OpenRouter keys are sk-or-v1-
  if (gradiumKey && gradiumKey.startsWith("sk-or-v1-")) {
    warnings.push("GRADIUM_API_KEY appears to be an OpenRouter key (sk-or-v1-). Use a Gradium key from gradium.ai (gd_ or gsk_...).");
  }

  // Check if OpenRouter key looks valid
  if (openRouterKey && !openRouterKey.startsWith("sk-or-v1-")) {
    warnings.push("OPENROUTER_API_KEY format looks unusual (should start with sk-or-v1-)");
  }

  if (gradiumKey && !process.env.GRADIUM_TTS_URL && !process.env.GRADIUM_TTS_WS_URL) {
    warnings.push("GRADIUM_API_KEY is set but neither GRADIUM_TTS_WS_URL nor GRADIUM_TTS_URL is set. Add GRADIUM_TTS_WS_URL=wss://eu.api.gradium.ai/api/speech/tts for Gradium voices.");
  }
  if (gradiumKey && process.env.GRADIUM_TTS_URL && !process.env.GRADIUM_TTS_WS_URL) {
    warnings.push("Using TTS via POST. For WebSocket (recommended), add GRADIUM_TTS_WS_URL=wss://eu.api.gradium.ai/api/speech/tts to .env.local and restart.");
  }

  return NextResponse.json({
    ok: true,
    mapsKeyPresent: config.mapsKeyPresent,
    openRouterConfigured: config.openRouterConfigured,
    gradiumConfigured: config.gradiumConfigured,
    gradiumTtsMethod: config.gradiumTtsMethod,
    gradiumSttConfigured: config.gradiumSttConfigured,
    warnings: warnings.length > 0 ? warnings : undefined,
    fallbacks: {
      tts: config.gradiumConfigured ? "Gradium" : "Browser SpeechSynthesis API",
      stt: config.gradiumSttConfigured ? "Gradium" : "Browser SpeechRecognition API (Chrome, Edge, Safari)",
    },
  });
}
