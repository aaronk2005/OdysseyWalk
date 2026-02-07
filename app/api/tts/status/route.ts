import { NextResponse } from "next/server";
import { getServerConfig } from "@/lib/config";

/**
 * GET /api/tts/status — Check TTS config without making a Gradium call.
 * Open in browser or curl to verify .env.local is loaded and which method will be used.
 */
export async function GET() {
  const config = getServerConfig();
  const hasKey = Boolean(process.env.GRADIUM_API_KEY?.trim());
  const hasWsUrl = Boolean(process.env.GRADIUM_TTS_WS_URL?.trim());
  const hasPostUrl = Boolean(process.env.GRADIUM_TTS_URL?.trim());
  return NextResponse.json({
    gradiumConfigured: config.gradiumConfigured,
    gradiumTtsMethod: config.gradiumTtsMethod,
    env: {
      hasKey,
      hasWsUrl,
      hasPostUrl,
    },
    message: !hasKey
      ? "Add GRADIUM_API_KEY to .env.local and restart the dev server."
      : !hasWsUrl && !hasPostUrl
        ? "Add GRADIUM_TTS_WS_URL or GRADIUM_TTS_URL to .env.local and restart."
        : config.gradiumTtsMethod === "websocket"
          ? "TTS will use Gradium WebSocket. If you still hear browser voice, check the terminal (server) and browser Console (client) for errors."
          : "TTS will use Gradium POST. If you still hear browser voice, check the terminal and browser Console for errors.",
  });
}
