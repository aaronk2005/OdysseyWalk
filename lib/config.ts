/**
 * Runtime config validation. Client-safe values only in getClientConfig.
 * Server-only keys are validated in getServerConfig (call from API routes only).
 */

export interface ClientConfig {
  mapsKeyPresent: boolean;
}

export interface ServerConfig {
  openRouterConfigured: boolean;
  /** Gradium TTS: key + (GRADIUM_TTS_WS_URL or GRADIUM_TTS_URL) */
  gradiumConfigured: boolean;
  /** "websocket" when GRADIUM_TTS_WS_URL is set, else "post" when GRADIUM_TTS_URL is set, else null */
  gradiumTtsMethod: "websocket" | "post" | null;
  /** Gradium STT: key + GRADIUM_STT_URL (optional; when set, POST /api/stt forwards to Gradium) */
  gradiumSttConfigured: boolean;
  mapsKeyPresent: boolean;
}

export function getClientConfig(): ClientConfig {
  if (typeof window !== "undefined") {
    const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    return { mapsKeyPresent: Boolean(key && key.trim()) };
  }
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  return { mapsKeyPresent: Boolean(key && key.trim()) };
}

export function getServerConfig(): ServerConfig {
  const openRouter = process.env.OPENROUTER_API_KEY;
  const gradiumKey = process.env.GRADIUM_API_KEY;
  const gradiumTts = process.env.GRADIUM_TTS_URL;
  const gradiumTtsWs = process.env.GRADIUM_TTS_WS_URL;
  const gradiumStt = process.env.GRADIUM_STT_URL;
  const mapsKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const hasTts = Boolean(gradiumTts?.trim() || gradiumTtsWs?.trim());
  const ttsMethod = gradiumKey?.trim()
    ? gradiumTtsWs?.trim()
      ? "websocket"
      : gradiumTts?.trim()
        ? "post"
        : null
    : null;
  return {
    openRouterConfigured: Boolean(openRouter && openRouter.trim()),
    gradiumConfigured: Boolean(gradiumKey?.trim() && hasTts),
    gradiumTtsMethod: ttsMethod,
    gradiumSttConfigured: Boolean(gradiumKey?.trim() && gradiumStt?.trim()),
    mapsKeyPresent: Boolean(mapsKey && mapsKey.trim()),
  };
}
