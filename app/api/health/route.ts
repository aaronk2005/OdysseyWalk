import { NextResponse } from "next/server";
import { getServerConfig } from "@/lib/config";

export async function GET() {
  const config = getServerConfig();
  const ok =
    config.mapsKeyPresent ||
    config.openRouterConfigured ||
    config.gradiumConfigured;
  return NextResponse.json({
    ok: true,
    mapsKeyPresent: config.mapsKeyPresent,
    openRouterConfigured: config.openRouterConfigured,
    gradiumConfigured: config.gradiumConfigured,
  });
}
