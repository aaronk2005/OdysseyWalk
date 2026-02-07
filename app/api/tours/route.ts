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
      const pois = data.pois || [];
      summaries.push({
        tourId: tour.tourId,
        name: tour.name,
        city: tour.city,
        estimatedMinutes: tour.estimatedMinutes ?? 30,
        poiCount: pois.length,
        thumbnailUrl: tour.thumbnailUrl || "/tours/thumb-default.jpg",
        tags: tour.tags || [],
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
