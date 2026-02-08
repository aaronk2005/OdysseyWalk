import { NextResponse } from "next/server";
import { getServerConfig } from "@/lib/config";
import { rateLimit, getRateLimitHeaders } from "@/lib/rateLimit";
import { getClientIp } from "@/lib/api/getClientIp";
import { fetchWithTimeout } from "@/lib/net/fetchWithTimeout";

export const maxDuration = 30;

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
      "You are a knowledgeable and engaging tour guide assistant.",
      "Provide helpful, accurate answers based on the tour context provided below.",
      "Keep responses conversational and informative (3-5 sentences).",
      "If the question is about something not covered in the context, acknowledge the question and provide what relevant information you can from the context, or politely indicate you don't have that specific information.",
      "Match the tour's theme and tone in your responses.",
      "",
      "TOUR CONTEXT:",
      "Theme: " + theme,
      "Tour Overview: " + intro,
      "Current Stop Information: " + script,
      "",
      "Answer the visitor's question based on this context:",
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
          max_tokens: 300,
          temperature: 0.7,
        }),
      },
      { timeoutMs: 12000, retries: 1 }
    );

    if (!res.ok) {
      // Provide a helpful fallback based on the available context
      const fallbackAnswer = script
        ? `I'm having trouble connecting right now, but here's what I can share about this location: ${script.slice(0, 150)}${script.length > 150 ? "..." : ""}`
        : "I'm having trouble connecting right now. Please try your question again in a moment.";
      return NextResponse.json(
        { answerText: fallbackAnswer },
        { headers: getRateLimitHeaders(ip, "/api/qa") }
      );
    }
    const data = await res.json();
    const answerText =
      data.choices?.[0]?.message?.content?.trim() ||
      "I don't have specific information about that, but feel free to explore the area and ask another question.";
    return NextResponse.json(
      { answerText },
      { headers: getRateLimitHeaders(ip, "/api/qa") }
    );
  } catch (_e) {
    return NextResponse.json(
      { answerText: "I'm having trouble answering right now. Please try again." },
      { status: 200, headers: getRateLimitHeaders(ip, "/api/qa") }
    );
  }
}
