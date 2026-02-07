import { NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import type { GeneratedTourResponse, TourPlan, POI, LatLng, Theme, VoiceStyle, Lang } from "@/lib/types";
import { getServerConfig } from "@/lib/config";
import { rateLimit } from "@/lib/rateLimit";
import { getClientIp } from "@/lib/api/getClientIp";
import { fetchWithTimeout } from "@/lib/net/fetchWithTimeout";
import { distanceMeters } from "@/lib/maps/haversine";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

/** ~80 m/min walking speed for time-to-get-there estimate */
const WALKING_M_PER_MIN = 80;

/** Derive target number of stops from duration (~5–8 min per stop) */
function numStopsFromDuration(durationMin: number): number {
  if (durationMin <= 15) return 2;
  if (durationMin <= 25) return 3;
  if (durationMin <= 35) return 5;
  if (durationMin <= 50) return 6;
  return 7;
}

function parseJson(raw: string): Record<string, unknown> {
  let s = raw.trim().replace(/^```json?\s*|\s*```$/g, "").trim();
  return JSON.parse(s) as Record<string, unknown>;
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40) || "location";
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
    let body;
    try {
      body = await req.json();
    } catch (e) {
      return NextResponse.json({ error: "Invalid JSON in request body" }, { status: 400 });
    }
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

    if (!start?.lat || !start?.lng || !start?.label) {
      return NextResponse.json({ error: "start with lat, lng, label required" }, { status: 400 });
    }

    // Validate coordinate ranges
    const lat = Number(start.lat);
    const lng = Number(start.lng);
    if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
      return NextResponse.json({ error: "Invalid latitude: must be between -90 and 90" }, { status: 400 });
    }
    if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
      return NextResponse.json({ error: "Invalid longitude: must be between -180 and 180" }, { status: 400 });
    }

    // Validate duration
    const validatedDuration = Number(durationMin);
    if (!Number.isFinite(validatedDuration) || validatedDuration < 15 || validatedDuration > 90) {
      return NextResponse.json({ error: "Invalid duration: must be between 15 and 90 minutes" }, { status: 400 });
    }

    // Use validated coordinates
    const validatedStart = { lat, lng, label: String(start.label) };

    const numStops = numStopsFromDuration(validatedDuration);
    const startLabel = validatedStart.label || "Location";

    const systemPrompt = `You are a tour plan generator. Output ONLY valid JSON (no markdown, no code fence).

You receive the start (lat, lng, label) in the request—do NOT create or invent the start location; use it as the center for the tour. Use the start and theme to pick popular tourist-appropriate POIs (real landmarks, attractions, notable spots) within a reasonable walking radius (1–2 km). Generate exactly ${numStops} POIs. Walking loop from start, back to start. Safe, plausible content only. Scripts in the requested language and voice style.

Structure:
{
  "intro": "30-60 word welcome script in ${lang === "fr" ? "French" : "English"}, ${voiceStyle} tone",
  "outro": "20-40 word closing script",
  "pois": [
    {
      "name": "Place name (location label)",
      "description": "Short 1-2 sentence description of this place.",
      "lat": number (offset from start ~0.001-0.003, or absolute),
      "lng": number,
      "script": "90-140 word narration",
      "facts": ["fact1", "fact2", "fact3", "fact4", "fact5"],
      "timeSpentMin": number (minutes at this stop),
      "price": "Free" | "$5" | null
    }
  ]
}`;

    const userPrompt = `Start: ${startLabel} at ${lat}, ${lng}. Theme: ${theme}. Duration: ${validatedDuration} min. Target stops: ${numStops}. Language: ${lang}. Voice style: ${voiceStyle}. Generate exactly ${numStops} real, popular tourist POIs in this area. Output the JSON.`;

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
            model: "openai/gpt-4.1-mini",
            messages: [
              { role: "system", content: systemPrompt + (attempt === 1 ? " ONLY OUTPUT JSON." : "") },
              { role: "user", content: userPrompt },
            ],
            max_tokens: 3500,
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

    type RawPOI = {
      name?: string;
      description?: string;
      lat?: number;
      lng?: number;
      script?: string;
      facts?: string[];
      timeSpentMin?: number;
      price?: string | null;
    };

    const parsed = parseJson(raw) as {
      intro?: string;
      outro?: string;
      pois?: RawPOI[];
    };
    const items = Array.isArray(parsed.pois) ? parsed.pois : [];
    const sessionId = "session-" + Date.now();
    const tourDate = new Date().toISOString().slice(0, 10);

    const isOffset = (v: number) => Math.abs(v) < 0.1 && Math.abs(v) > 0;
    const cappedItems = items.slice(0, numStops + 2);

    const pois: POI[] = cappedItems.map((p, i) => {
      const rawLat = Number(p.lat);
      const rawLng = Number(p.lng);
      const poiLat = Number.isFinite(rawLat)
        ? isOffset(rawLat)
          ? validatedStart.lat + rawLat
          : rawLat
        : validatedStart.lat + (i + 1) * 0.002;
      const poiLng = Number.isFinite(rawLng)
        ? isOffset(rawLng)
          ? validatedStart.lng + rawLng
          : rawLng
        : validatedStart.lng + (i + 1) * 0.002;
      return {
        poiId: `poi-${i + 1}`,
        name: String(p.name || `Stop ${i + 1}`),
        lat: poiLat,
        lng: poiLng,
        radiusM: 35,
        script: String(p.script || ""),
        facts: Array.isArray(p.facts) ? p.facts.map(String) : [],
        orderIndex: i,
        description: p.description ? String(p.description) : undefined,
        timeSpentMin: typeof p.timeSpentMin === "number" ? p.timeSpentMin : 3,
        price: p.price != null ? String(p.price) : null,
        theme: String(theme),
      };
    });

    // Compute time to get there (walking from previous stop or start)
    const prevPoints: LatLng[] = [{ lat: validatedStart.lat, lng: validatedStart.lng }, ...pois.map((poi) => ({ lat: poi.lat, lng: poi.lng }))];
    pois.forEach((poi, i) => {
      const from = prevPoints[i];
      const to = { lat: poi.lat, lng: poi.lng };
      const distM = distanceMeters(from, to);
      poi.timeToGetThereMin = Math.max(1, Math.round(distM / WALKING_M_PER_MIN));
    });

    const routePoints: LatLng[] = [
      { lat: validatedStart.lat, lng: validatedStart.lng },
      ...pois.map((p) => ({ lat: p.lat, lng: p.lng })),
      { lat: validatedStart.lat, lng: validatedStart.lng },
    ];

    // Calculate total route distance in meters
    let totalDistanceMeters = 0;
    for (let i = 1; i < routePoints.length; i++) {
      totalDistanceMeters += distanceMeters(routePoints[i - 1], routePoints[i]);
    }

    const tourPlan: TourPlan = {
      intro: String(parsed.intro || "Welcome to your tour."),
      outro: String(parsed.outro || "Thanks for walking with us."),
      theme: String(theme),
      estimatedMinutes: validatedDuration,
      distanceMeters: Math.round(totalDistanceMeters),
      routePoints,
      tourDate,
    };

    const response: GeneratedTourResponse = { sessionId, tourPlan, pois };

    // Write tour to text file (best-effort; may fail on serverless e.g. Vercel)
    try {
      const dir = path.join(process.cwd(), "generated-tours");
      await mkdir(dir, { recursive: true });
      const filename = `tour-${theme}-${slugify(startLabel)}-${Date.now()}.txt`;
      const filepath = path.join(dir, filename);

      const lines: string[] = [
        "ODYSSEY WALK — GENERATED TOUR",
        "==============================",
        "",
        `Theme: ${theme}`,
        `Duration: ~${validatedDuration} min`,
        `Date: ${tourDate}`,
        `Start: ${startLabel} (${lat}, ${lng})`,
        "",
        "--- INTRO ---",
        tourPlan.intro,
        "",
        "--- STOPS ---",
      ];

      pois.forEach((poi, idx) => {
        const id = (poi.orderIndex ?? idx) + 1;
        lines.push("");
        lines.push(`Stop ${id} — ${poi.name}`);
        if (poi.description) lines.push(`  Description: ${poi.description}`);
        lines.push(`  Time to get there: ${poi.timeToGetThereMin ?? "—"} min`);
        lines.push(`  Date: ${tourDate}`);
        lines.push(`  Time spent: ${poi.timeSpentMin ?? "—"} min`);
        if (poi.price != null && poi.price !== "") lines.push(`  Price: ${poi.price}`);
        lines.push(`  Theme: ${poi.theme ?? theme}`);
        lines.push(`  Id: ${id}`);
        lines.push(`  Coordinates: ${poi.lat}, ${poi.lng}`);
        if (poi.script) lines.push(`  Script: ${poi.script.slice(0, 100)}...`);
      });

      lines.push("");
      lines.push("--- OUTRO ---");
      lines.push(tourPlan.outro);

      await writeFile(filepath, lines.join("\n"), "utf-8");
    } catch {
      // Ignore write failures (e.g. read-only fs on Vercel)
    }

    return NextResponse.json(response);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Generate failed" },
      { status: 500 }
    );
  }
}
