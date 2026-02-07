import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import type { TourSummary } from "@/lib/types";

const TOURS_DIR = path.join(process.cwd(), "public", "tours");

function getSummaries(): TourSummary[] {
  const summaries: TourSummary[] = [];
  if (!fs.existsSync(TOURS_DIR)) return summaries;
  const files = fs.readdirSync(TOURS_DIR).filter((f) => f.endsWith(".json"));
  for (const file of files) {
    try {
      const raw = fs.readFileSync(path.join(TOURS_DIR, file), "utf-8");
      const data = JSON.parse(raw);
      const tour = data.tour;
      if (!tour || typeof tour !== "object") continue;
      const pois = Array.isArray(data.pois) ? data.pois : [];
      summaries.push({
        tourId: String(tour.tourId ?? file.replace(/\.json$/, "")),
        name: String(tour.name ?? "Unnamed Tour"),
        city: String(tour.city ?? ""),
        estimatedMinutes: Number(tour.estimatedMinutes) || 30,
        poiCount: pois.length,
        thumbnailUrl: String(tour.thumbnailUrl || "/tours/thumb-default.jpg"),
        tags: Array.isArray(tour.tags) ? tour.tags.map(String) : [],
      });
    } catch {
      // skip invalid files
    }
  }
  return summaries;
}

export async function GET() {
  const tours = getSummaries();
  return NextResponse.json({ tours });
}
