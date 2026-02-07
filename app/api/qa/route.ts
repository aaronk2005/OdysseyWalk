import { NextResponse } from "next/server";
import type { VoiceStyle, Lang } from "@/lib/types";
import { getServerConfig } from "@/lib/config";
import { rateLimit, getRateLimitHeaders } from "@/lib/rateLimit";
import { getClientIp } from "@/lib/api/getClientIp";
import { fetchWithTimeout } from "@/lib/net/fetchWithTimeout";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

export async function POST(req: Request) {
  const config = getServerConfig();
  if (!config.openRouterConfigured) {
    return NextResponse.json(
      { error: "OpenRouter not configured", answerText: "I don't have access to answers right now. Check the POI facts on screen." },
      { status: 503 }
    );
  }
  const ip = getClientIp(req);
  const rl = rateLimit(ip, "/api/qa");
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many requests. Please wait a moment.", answerText: "Please try again in a minute." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } }
    );
  }
  try {
    const body = await req.json();
    const {
      tourId,
      poiId,
      question,
      voiceStyle = "friendly",
      lang = "en",
      recentContext = [],
      poiScript,
      poiFacts,
    } = body as {
      tourId: string;
      poiId: string;
      question: string;
      voiceStyle?: VoiceStyle;
      lang?: Lang;
      recentContext?: string[];
      poiScript?: string;
      poiFacts?: string[];
    };

    const factsList = Array.isArray(poiFacts) ? poiFacts : [];
    const script = poiScript || "";
    const context = [
      "You are a friendly tour guide. Answer in 2-3 short sentences.",
      "Only use facts from the provided context. If uncertain, say so. Do not invent specific dates or names.",
      "Language: " + (lang === "fr" ? "French" : "English"),
      "",
      "Context about this stop:",
      script,
      "Facts: " + factsList.join("; "),
    ].join("\n");

    const key = process.env.OPENROUTER_API_KEY!;
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
            { role: "system", content: context },
            ...recentContext.slice(-4).map((q: string) => ({ role: "user", content: q })),
            { role: "user", content: question },
          ],
          max_tokens: 150,
        }),
      },
      { timeoutMs: 12000, retries: 1 }
    );

    if (!res.ok) {
      const fallback =
        factsList.length >= 2
          ? [factsList[0], factsList[1]].join(" ")
          : factsList.length
            ? "Based on what we know: " + factsList[0] + "."
            : "I'm not sure. Try reading the stop description on screen.";
      return NextResponse.json(
        { answerText: fallback },
        { headers: getRateLimitHeaders(ip, "/api/qa") }
      );
    }
    const data = await res.json();
    const answerText =
      data.choices?.[0]?.message?.content?.trim() ||
      (factsList.length >= 2
        ? [factsList[0], factsList[1]].join(" ")
        : factsList.length
          ? "One fact we have: " + factsList[0]
          : "I don't have more details for that.");
    return NextResponse.json(
      { answerText },
      { headers: getRateLimitHeaders(ip, "/api/qa") }
    );
  } catch (_e) {
    return NextResponse.json(
      { answerText: "Something went wrong. Check the facts on screen for this stop." },
      { status: 200, headers: getRateLimitHeaders(ip, "/api/qa") }
    );
  }
}
