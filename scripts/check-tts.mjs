#!/usr/bin/env node
/**
 * TTS diagnostic: why is browser/Google TTS used instead of Gradium WebSocket?
 * Run with: node scripts/check-tts.mjs
 * Requires: dev server running (npm run dev) on http://localhost:3000
 */

const BASE = process.env.BASE_URL || "http://localhost:3000";

async function main() {
  console.log("TTS diagnostic (base URL:", BASE, ")\n");

  // 1. Health
  try {
    const healthRes = await fetch(`${BASE}/api/health`);
    const raw = await healthRes.text();
    if (!raw.trimStart().startsWith("{")) {
      console.log("1. GET /api/health");
      console.log("   Server returned HTML or non-JSON (status " + healthRes.status + "). First 400 chars:");
      console.log("   " + raw.slice(0, 400).replace(/\n/g, "\n   "));
      console.log("\n   Common causes: (1) Dev server not running — start with: npm run dev");
      console.log("   (2) Wrong port — if your app runs on another port, use: BASE_URL=http://localhost:3001 node scripts/check-tts.mjs");
      return;
    }
    const health = JSON.parse(raw);
    console.log("1. GET /api/health");
    console.log("   gradiumConfigured:", health.gradiumConfigured);
    console.log("   gradiumTtsMethod:", health.gradiumTtsMethod ?? "(null)");
    if (health.warnings?.length) {
      console.log("   warnings:", health.warnings);
    }
    console.log("   fallbacks.tts:", health.fallbacks?.tts ?? "—");
    if (!health.gradiumConfigured) {
      console.log("\n   => TTS not configured. Server returns 503, so client uses browser TTS.");
      console.log("   Fix: In .env.local set GRADIUM_API_KEY=(gd_ or gsk_...) and GRADIUM_TTS_WS_URL=wss://eu.api.gradium.ai/api/speech/tts");
      console.log("   Then restart the dev server (npm run dev).");
      return;
    }
    if (health.gradiumTtsMethod !== "websocket") {
      console.log("\n   => WebSocket not used because GRADIUM_TTS_WS_URL is not set.");
      console.log("   Fix: Add GRADIUM_TTS_WS_URL=wss://eu.api.gradium.ai/api/speech/tts to .env.local and restart.");
    }
  } catch (e) {
    console.log("1. GET /api/health FAILED:", e.message);
    console.log("   Is the dev server running? Try: npm run dev");
    return;
  }

  // 2. TTS request
  console.log("\n2. POST /api/tts (short text)");
  try {
    const ttsRes = await fetch(`${BASE}/api/tts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: "Hello.",
        lang: "en",
        voiceStyle: "friendly",
        returnBase64: false,
      }),
    });
    const method = ttsRes.headers.get("X-TTS-Method") ?? "(none)";
    console.log("   status:", ttsRes.status);
    console.log("   X-TTS-Method:", method);
    if (!ttsRes.ok) {
      const err = await ttsRes.text();
      console.log("   body:", err.slice(0, 300));
      if (ttsRes.status === 503) {
        console.log("\n   => 503: Gradium TTS not configured or GRADIUM_TTS_WS_URL/GRADIUM_TTS_URL missing. Client falls back to browser TTS.");
      } else if (ttsRes.status === 502) {
        console.log("\n   => 502: Gradium API error (e.g. bad key, WebSocket failed, or POST URL wrong). Client falls back to browser TTS.");
      }
      return;
    }
    const contentType = ttsRes.headers.get("Content-Type") ?? "";
    console.log("   Content-Type:", contentType);
    if (method === "websocket") {
      console.log("\n   => TTS is using Gradium WebSocket. You should hear Gradium voices, not browser TTS.");
    } else {
      console.log("\n   => TTS is using Gradium POST. If you still hear browser TTS, check the client (cache, network).");
    }
  } catch (e) {
    console.log("   FAILED:", e.message);
  }
}

main();
