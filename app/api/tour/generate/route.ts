import { NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import type { GeneratedTourResponse, TourPlan, POI, LatLng, Theme, VoiceStyle, Lang } from "@/lib/types";
import { getServerConfig } from "@/lib/config";
import { rateLimit } from "@/lib/rateLimit";
import { getClientIp } from "@/lib/api/getClientIp";
import { fetchWithTimeout } from "@/lib/net/fetchWithTimeout";
import { distanceMeters } from "@/lib/maps/haversine";
import { getWalkingDirections, getWalkingDirectionsByPlaces } from "@/lib/maps/directions";

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

    const langNames: Record<Lang, string> = {
      en: "English",
      fr: "French",
      es: "Spanish",
      de: "German",
      it: "Italian",
      ja: "Japanese",
      pt: "Portuguese",
      zh: "Chinese",
    };
    const langName = langNames[lang] ?? "English";

    const systemPrompt = `You are a tour plan generator. Output ONLY valid JSON (no markdown, no code fence).

You receive the start (lat, lng, label) in the request—do NOT create or invent the start location; use it as the center for the tour. Use the start and theme to pick popular tourist-appropriate POIs (real landmarks, attractions, notable spots) within a reasonable walking radius (1–2 km). Generate exactly ${numStops} POIs. Walking loop from start, back to start. Safe, plausible content only. Scripts in ${langName} (${lang}) and ${voiceStyle} voice style.

WALKING ORDER — CRITICAL:
- Order the POIs so the walk forms an efficient loop with minimal backtracking.
- The first POI should be the one closest to the start, and each subsequent POI should be the nearest unvisited one from the previous stop (nearest-neighbor ordering).
- The route should form a roughly circular loop so the last POI is naturally close to the start.
- Do NOT randomly scatter stops — the order must make geographic sense for someone walking.

CRITICAL QUALITY REQUIREMENTS:
- Each POI MUST be a real, specific, existing landmark or attraction
- The "address" field is THE MOST IMPORTANT FIELD — it must be a real, full street address or well-known place name that Google Maps can find. Example: "Empire State Building, 350 5th Ave, New York, NY 10118" or "The Louvre Museum, Rue de Rivoli, 75001 Paris, France"
- Each script MUST be 90-140 words with specific details about the location
- Each POI MUST have 3-5 distinct, interesting facts
- DO NOT generate generic or placeholder content
- If the area lacks sufficient tourist attractions, focus on local history, architecture, or cultural significance

Structure:
{
  "intro": "50-80 word welcome script in ${langName}, ${voiceStyle} tone that introduces the tour theme and what visitors will experience",
  "outro": "30-50 word closing script that thanks visitors and summarizes the experience",
  "pois": [
    {
      "name": "Place name",
      "address": "Full street address or well-known place name that Google Maps can find and route to (REQUIRED)",
      "description": "Short 1-2 sentence description of this place.",
      "lat": approximate latitude number,
      "lng": approximate longitude number,
      "script": "90-140 word narration with specific details and interesting context",
      "facts": ["specific fact 1", "specific fact 2", "specific fact 3", "specific fact 4", "specific fact 5"],
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
      address?: string;
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

    const pois: POI[] = cappedItems
      .map((p, i) => {
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
        
        const script = String(p.script || "");
        const facts = Array.isArray(p.facts) ? p.facts.map(String).filter(f => f.trim().length > 0) : [];
        
        return {
          poiId: `poi-${i + 1}`,
          name: String(p.name || `Stop ${i + 1}`),
          lat: poiLat,
          lng: poiLng,
          radiusM: 35,
          script,
          facts,
          orderIndex: i,
          description: p.description ? String(p.description) : undefined,
          timeSpentMin: typeof p.timeSpentMin === "number" ? p.timeSpentMin : 3,
          price: p.price != null ? String(p.price) : null,
          theme: String(theme),
          _wordCount: script.split(/\s+/).filter(w => w.length > 0).length,
        };
      })
      .filter((poi) => {
        // Validate POI has sufficient content
        const wordCount = poi._wordCount || 0;
        const hasName = poi.name && poi.name !== `Stop ${poi.orderIndex + 1}`;
        const hasMinScript = wordCount >= 50; // Minimum 50 words for meaningful content
        const hasMinFacts = poi.facts.length >= 2; // At least 2 facts
        
        if (!hasName || !hasMinScript || !hasMinFacts) {
          console.warn(
            `Excluding POI ${poi.poiId} (${poi.name}): ` +
            `hasName=${hasName}, wordCount=${wordCount}, facts=${poi.facts.length}`
          );
          return false;
        }
        
        // Remove temporary validation field
        delete (poi as any)._wordCount;
        return true;
      });

    // Validate we have enough quality POIs after filtering
    if (pois.length < Math.max(2, Math.floor(numStops * 0.6))) {
      return NextResponse.json(
        {
          error: `Unable to generate sufficient quality content for this area. Only ${pois.length} of ${numStops} requested stops met quality requirements. Please try a different location with more landmarks or tourist attractions.`,
        },
        { status: 400 }
      );
    }

    // ── Get walking directions from Google Maps ──────────────────────────────
    // Strategy:
    //  1. Try address-based Directions (most accurate — Google geocodes place names)
    //  2. Fall back to coordinate-based Directions (uses LLM's approximate lat/lng)
    //  3. Fall back to Haversine straight-line estimates
    const mapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    const startLatLng: LatLng = { lat: validatedStart.lat, lng: validatedStart.lng };
    let routePoints: LatLng[] = [startLatLng, ...pois.map(p => ({ lat: p.lat, lng: p.lng })), startLatLng];
    let totalDistanceMeters = 0;
    let totalDurationSeconds = 0;
    let directionsSucceeded = false;

    if (mapsApiKey) {
      // ── 1. Try address-based directions (best quality) ──
      // Build place queries: prefer address, fall back to "name near startLabel"
      const placeQueries = pois.map(p => {
        const raw = items[p.orderIndex ?? 0];
        const addr = raw?.address ? String(raw.address).trim() : "";
        if (addr.length > 5) return addr;
        // Fall back to name + location context for Google geocoding
        return `${p.name} near ${startLabel}`;
      });

      console.log("[Tour] Trying address-based directions with queries:", placeQueries);
      const placeResult = await getWalkingDirectionsByPlaces(startLatLng, placeQueries, mapsApiKey);

      if (placeResult && placeResult.routePoints.length > 10) {
        routePoints = placeResult.routePoints;
        totalDistanceMeters = placeResult.distanceMeters;
        totalDurationSeconds = placeResult.durationSeconds;
        directionsSucceeded = true;

        // Reorder POIs according to Google's optimized walking order
        const order = placeResult.waypointOrder;
        const reorderedPois: POI[] = order.map((origIdx, newIdx) => {
          const poi = pois[origIdx];
          // Update coordinates with Google's exact location
          const loc = placeResult.waypointLocations[newIdx];
          if (loc) {
            console.log(`[Tour] POI ${poi.name}: LLM (${poi.lat.toFixed(5)}, ${poi.lng.toFixed(5)}) -> Google (${loc.lat.toFixed(5)}, ${loc.lng.toFixed(5)})`);
            poi.lat = loc.lat;
            poi.lng = loc.lng;
          }
          // Update order index to reflect new position
          poi.orderIndex = newIdx;
          poi.poiId = `poi-${newIdx + 1}`;
          return poi;
        });

        // Replace pois array with the reordered one
        pois.length = 0;
        pois.push(...reorderedPois);

        console.log(`[Tour] Address-based directions: ${routePoints.length} detailed route points, ${Math.round(totalDistanceMeters)}m`);
        console.log(`[Tour] Optimized stop order: ${pois.map(p => p.name).join(" -> ")}`);
      } else {
        console.warn("[Tour] Address-based directions failed, trying coordinate-based...");
      }

      // ── 2. Fall back to coordinate-based directions ──
      if (!directionsSucceeded) {
        const waypoints: LatLng[] = [startLatLng, ...pois.map(p => ({ lat: p.lat, lng: p.lng })), startLatLng];
        const directions = await getWalkingDirections(waypoints, mapsApiKey);
        if (directions && directions.routePoints.length > 5) {
          routePoints = directions.routePoints;
          totalDistanceMeters = directions.distanceMeters;
          totalDurationSeconds = directions.durationSeconds;
          directionsSucceeded = true;
          console.log(`[Tour] Coord-based directions: ${routePoints.length} detailed route points`);
        }
      }
    }

    // ── 3. Final fallback: Haversine estimates ──
    if (!directionsSucceeded) {
      console.warn("[Tour] All Directions API attempts failed, using Haversine fallback");
      const fallbackWaypoints: LatLng[] = [startLatLng, ...pois.map(p => ({ lat: p.lat, lng: p.lng })), startLatLng];
      for (let i = 1; i < fallbackWaypoints.length; i++) {
        totalDistanceMeters += distanceMeters(fallbackWaypoints[i - 1], fallbackWaypoints[i]);
      }
    }

    // Distribute walking time across POIs
    if (directionsSucceeded) {
      const totalWalkingTimeMin = Math.round(totalDurationSeconds / 60);
      const avgTimePerSegment = pois.length > 0 ? totalWalkingTimeMin / (pois.length + 1) : 0;
      pois.forEach((poi) => {
        poi.timeToGetThereMin = Math.max(1, Math.round(avgTimePerSegment));
      });
    } else {
      const prevPoints: LatLng[] = [startLatLng, ...pois.map(p => ({ lat: p.lat, lng: p.lng }))];
      pois.forEach((poi, i) => {
        const from = prevPoints[i];
        const to = { lat: poi.lat, lng: poi.lng };
        const distM = distanceMeters(from, to);
        poi.timeToGetThereMin = Math.max(1, Math.round(distM / WALKING_M_PER_MIN));
      });
    }

    const tourPlan: TourPlan = {
      intro: String(parsed.intro || "Welcome to your tour."),
      outro: String(parsed.outro || "Thanks for walking with us."),
      theme: String(theme),
      estimatedMinutes: validatedDuration,
      distanceMeters: Math.round(totalDistanceMeters),
      routePoints,
      tourDate,
      voiceLang: lang,
      voiceStyle: voiceStyle,
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
