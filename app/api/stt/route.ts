import { NextResponse } from "next/server";
import { getServerConfig } from "@/lib/config";
import { rateLimit, getRateLimitHeaders } from "@/lib/rateLimit";
import { getClientIp } from "@/lib/api/getClientIp";
import { fetchWithTimeout } from "@/lib/net/fetchWithTimeout";

export async function POST(req: Request) {
  const config = getServerConfig();
  if (!config.gradiumConfigured) {
    return NextResponse.json(
      { error: "STT not configured", transcript: "" },
      { status: 503 }
    );
  }
  const ip = getClientIp(req);
  const rl = rateLimit(ip, "/api/stt");
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many requests", transcript: "" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } }
    );
  }
  const apiKey = process.env.GRADIUM_API_KEY!;
  const sttUrl = process.env.GRADIUM_STT_URL!;
  try {
    const formData = await req.formData();
    const audio = formData.get("audio") as File | null;
    const lang = (formData.get("lang") as string) || "en";
    if (!audio || !(audio instanceof Blob)) {
      return NextResponse.json({ error: "Missing audio file", transcript: "" }, { status: 400 });
    }

    const body = new FormData();
    body.append("file", audio, audio.name || "audio.webm");

    const gradiumRes = await fetchWithTimeout(
      sttUrl,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}` },
        body,
      },
      { timeoutMs: 15000, retries: 1 }
    );

    if (!gradiumRes.ok) {
      const errText = await gradiumRes.text();
      return NextResponse.json(
        { error: "STT provider error: " + errText, transcript: "" },
        { status: 502, headers: getRateLimitHeaders(ip, "/api/stt") }
      );
    }

    const data = await gradiumRes.json();
    const transcript =
      typeof data.text === "string"
        ? data.text
        : data.transcript ?? data.transcription ?? "";
    return NextResponse.json(
      { transcript },
      { headers: getRateLimitHeaders(ip, "/api/stt") }
    );
  } catch (e) {
    return NextResponse.json(
      { transcript: "", error: e instanceof Error ? e.message : "STT failed" },
      { status: 500, headers: getRateLimitHeaders(ip, "/api/stt") }
    );
  }
}
