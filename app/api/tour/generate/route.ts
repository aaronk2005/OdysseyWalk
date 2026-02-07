import { NextResponse } from "next/server";
import type { Tour, POI, LatLng, VoiceStyle, Lang } from "@/lib/types";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

export async function POST(req: Request) {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) {
    return NextResponse.json({ error: "OpenRouter not configured" }, { status: 503 });
  }
  try {
    const body = await req.json();
    const {
      startPlace,
      theme,
      durationMin,
      pace = "normal",
      lang = "en",
      voiceStyle = "friendly",
    } = body as {
      startPlace: { name: string; lat: number; lng: number };
      theme: string;
      durationMin: number;
      pace?: string;
      lang?: Lang;
      voiceStyle?: VoiceStyle;
    };

    if (!startPlace?.lat || !startPlace?.lng) {
      return NextResponse.json({ error: "startPlace with lat/lng required" }, { status: 400 });
    }

    const systemPrompt = `You are a tour plan generator. Given a starting location and theme, output a JSON object only (no markdown, no code block wrapper) with this exact structure:
{
  "pois": [
    {
      "name": "Place name",
      "lat": number (small offset from start, e.g. ±0.002),
      "lng": number (small offset from start),
      "script": "90-140 word narration in ${lang === "fr" ? "French" : "English"}, ${voiceStyle} tone",
      "facts": ["fact1", "fact2", "fact3"]
    }
  ]
}
Generate exactly 5-7 POIs. Keep lat/lng within walking distance (each step ~0.001-0.003 degrees). Do not browse the internet. Generate plausible, safe content. No dangerous or inappropriate instructions.`;

    const userPrompt = `Start: ${startPlace.name} at ${startPlace.lat}, ${startPlace.lng}. Theme: ${theme}. Duration: ${durationMin} min. Pace: ${pace}. Generate the tour JSON.`;

    const res = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
        "HTTP-Referer": process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000",
      },
      body: JSON.stringify({
        model: "openai/gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 2000,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ error: "LLM error: " + err }, { status: 502 });
    }

    const data = await res.json();
    let raw = data.choices?.[0]?.message?.content?.trim() || "{}";
    raw = raw.replace(/^```json?\s*|\s*```$/g, "").trim();
    const parsed = JSON.parse(raw);
    const items = Array.isArray(parsed.pois) ? parsed.pois : [];

    const tourId = "gen-" + Date.now();
    const pois: POI[] = items.slice(0, 7).map((p: Record<string, unknown>, i: number) => ({
      poiId: `poi-${i + 1}`,
      tourId,
      name: String(p.name || `Stop ${i + 1}`),
      lat: Number(p.lat) || startPlace.lat + (i * 0.001),
      lng: Number(p.lng) || startPlace.lng + (i * 0.001),
      radiusM: 35,
      scripts: { [voiceStyle]: String(p.script || "") },
      facts: Array.isArray(p.facts) ? p.facts.map(String) : [],
      scriptVersion: 1,
    }));

    const routePoints: LatLng[] = [{ lat: startPlace.lat, lng: startPlace.lng }, ...pois.map((p) => ({ lat: p.lat, lng: p.lng }))];
    const tour: Tour = {
      tourId,
      name: `${theme} Walk`,
      city: startPlace.name,
      routePoints,
      poiIds: pois.map((p) => p.poiId),
      defaultVoiceStyle: voiceStyle,
      defaultLang: lang,
      estimatedMinutes: durationMin,
      tags: [theme],
    };

    return NextResponse.json({ tour, pois });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Generate failed" },
      { status: 500 }
    );
  }
}
