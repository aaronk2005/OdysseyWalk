import { NextResponse } from "next/server";
import type { GeneratedTourResponse, TourPlan, POI, LatLng, Theme, VoiceStyle, Lang } from "@/lib/types";
import { getServerConfig } from "@/lib/config";
import { rateLimit } from "@/lib/rateLimit";
import { getClientIp } from "@/lib/api/getClientIp";
import { fetchWithTimeout } from "@/lib/net/fetchWithTimeout";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

function parseJson(raw: string): Record<string, unknown> {
  let s = raw.trim().replace(/^```json?\s*|\s*```$/g, "").trim();
  return JSON.parse(s) as Record<string, unknown>;
}

export async function POST(req: Request) {
  const config = getServerConfig();
  if (!config.openRouterConfigured) {
    return NextResponse.json({ error: "OpenRouter not configured" }, { status: 503 });
  }
  const ip = getClientIp(req);
  const rl = rateLimit(ip, "/api/tour/generate");
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } }
    );
  }
  try {
    const body = await req.json();
    const {
      start,
      theme = "history",
      durationMin = 30,
      lang = "en",
      voiceStyle = "friendly",
    } = body as {
      start: { lat: number; lng: number; label: string };
      theme?: Theme;
      durationMin?: number;
      lang?: Lang;
      voiceStyle?: VoiceStyle;
    };

    if (!start?.lat || !start?.lng) {
      return NextResponse.json({ error: "start with lat, lng, label required" }, { status: 400 });
    }

    const systemPrompt = `You are a tour plan generator. Output ONLY valid JSON (no markdown, no code fence). Structure:
{
  "intro": "30-60 word welcome script in ${lang === "fr" ? "French" : "English"}, ${voiceStyle} tone",
  "outro": "20-40 word closing script",
  "pois": [
    {
      "name": "Place name",
      "lat": number (offset from start ~0.001-0.003),
      "lng": number,
      "script": "90-140 word narration",
      "facts": ["fact1", "fact2", "fact3", "fact4", "fact5"]
    }
  ]
}
Generate exactly 5-8 POIs in a walking loop from start. Safe, plausible content only.`;

    const userPrompt = `Start: ${start.label || "Location"} at ${start.lat}, ${start.lng}. Theme: ${theme}. Duration: ${durationMin} min. Language: ${lang}. Generate the JSON.`;

    const key = process.env.OPENROUTER_API_KEY!;
    let raw = "{}";
    for (let attempt = 0; attempt < 2; attempt++) {
      const res = await fetchWithTimeout(
        OPENROUTER_URL,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${key}`,
            "HTTP-Referer": process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000",
          },
          body: JSON.stringify({
            model: "openai/gpt-4o-mini",
            messages: [
              { role: "system", content: systemPrompt + (attempt === 1 ? " ONLY OUTPUT JSON." : "") },
              { role: "user", content: userPrompt },
            ],
            max_tokens: 2500,
          }),
        },
        { timeoutMs: 20000, retries: 1 }
      );
      if (!res.ok) {
        const err = await res.text();
        return NextResponse.json({ error: "LLM error: " + err }, { status: 502 });
      }
      const data = await res.json();
      raw = data.choices?.[0]?.message?.content?.trim() || "{}";
      try {
        parseJson(raw);
        break;
      } catch {
        if (attempt === 1) return NextResponse.json({ error: "Invalid JSON from model" }, { status: 502 });
      }
    }

    const parsed = parseJson(raw) as {
      intro?: string;
      outro?: string;
      pois?: Array<{ name?: string; lat?: number; lng?: number; script?: string; facts?: string[] }>;
    };
    const items = Array.isArray(parsed.pois) ? parsed.pois : [];
    const sessionId = "session-" + Date.now();
    const isOffset = (v: number) => Math.abs(v) < 0.1 && Math.abs(v) > 0;
    const pois: POI[] = items.slice(0, 8).map((p, i) => {
      const rawLat = Number(p.lat);
      const rawLng = Number(p.lng);
      const lat = Number.isFinite(rawLat)
        ? (isOffset(rawLat) ? start.lat + rawLat : rawLat)
        : start.lat + (i + 1) * 0.002;
      const lng = Number.isFinite(rawLng)
        ? (isOffset(rawLng) ? start.lng + rawLng : rawLng)
        : start.lng + (i + 1) * 0.002;
      return {
        poiId: `poi-${i + 1}`,
        name: String(p.name || `Stop ${i + 1}`),
        lat,
        lng,
        radiusM: 35,
        script: String(p.script || ""),
        facts: Array.isArray(p.facts) ? p.facts.map(String) : [],
        orderIndex: i,
      };
    });

    const routePoints: LatLng[] = [
      { lat: start.lat, lng: start.lng },
      ...pois.map((p) => ({ lat: p.lat, lng: p.lng })),
      { lat: start.lat, lng: start.lng },
    ];
    const tourPlan: TourPlan = {
      intro: String(parsed.intro || "Welcome to your tour."),
      outro: String(parsed.outro || "Thanks for walking with us."),
      theme: String(theme),
      estimatedMinutes: durationMin,
      routePoints,
    };

    const response: GeneratedTourResponse = { sessionId, tourPlan, pois };
    return NextResponse.json(response);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Generate failed" },
      { status: 500 }
    );
  }
}
