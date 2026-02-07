import { NextResponse } from "next/server";
import { getServerConfig } from "@/lib/config";
import { rateLimit, getRateLimitHeaders } from "@/lib/rateLimit";
import { getClientIp } from "@/lib/api/getClientIp";
import { fetchWithTimeout } from "@/lib/net/fetchWithTimeout";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

export async function POST(req: Request) {
  const config = getServerConfig();
  if (!config.openRouterConfigured) {
    return NextResponse.json(
      { error: "OpenRouter not configured", answerText: "I don't have access to answers right now." },
      { status: 503 }
    );
  }
  const ip = getClientIp(req);
  const rl = rateLimit(ip, "/api/qa");
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many requests", answerText: "Please try again in a minute." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } }
    );
  }
  try {
    const body = await req.json();
    const {
      sessionId,
      poiId,
      questionText,
      context,
    } = body as {
      sessionId?: string;
      poiId?: string;
      questionText: string;
      context?: { currentPoiScript?: string; tourIntro?: string; theme?: string };
    };

    const script = context?.currentPoiScript ?? "";
    const intro = context?.tourIntro ?? "";
    const theme = context?.theme ?? "";
    const systemContent = [
      "You are a friendly tour guide. Answer in 2-3 short sentences.",
      "Use only the provided context. If uncertain, say so.",
      "Theme: " + theme,
      "Tour intro: " + intro,
      "Current stop script: " + script,
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
            { role: "system", content: systemContent },
            { role: "user", content: questionText },
          ],
          max_tokens: 150,
        }),
      },
      { timeoutMs: 12000, retries: 1 }
    );

    if (!res.ok) {
      return NextResponse.json(
        { answerText: "Based on this stop: " + (script.slice(0, 80) + "...") },
        { headers: getRateLimitHeaders(ip, "/api/qa") }
      );
    }
    const data = await res.json();
    const answerText =
      data.choices?.[0]?.message?.content?.trim() ||
      "Check the stop description for more.";
    return NextResponse.json(
      { answerText },
      { headers: getRateLimitHeaders(ip, "/api/qa") }
    );
  } catch (_e) {
    return NextResponse.json(
      { answerText: "Something went wrong. Try reading the stop script." },
      { status: 200, headers: getRateLimitHeaders(ip, "/api/qa") }
    );
  }
}
