import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const TOURS_DIR = path.join(process.cwd(), "public", "tours");

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ tourId: string }> }
) {
  const { tourId } = await params;
  const safeId = tourId.replace(/[^a-z0-9-_]/gi, "");
  const files = fs.existsSync(TOURS_DIR) ? fs.readdirSync(TOURS_DIR) : [];
  for (const file of files) {
    if (!file.endsWith(".json")) continue;
    try {
      const raw = fs.readFileSync(path.join(TOURS_DIR, file), "utf-8");
      const data = JSON.parse(raw);
      if (data.tour?.tourId === safeId || data.tour?.tourId === tourId) {
        return NextResponse.json({
          tour: data.tour,
          pois: data.pois || [],
        });
      }
    } catch {
      // continue
    }
  }
  return NextResponse.json({ error: "Tour not found" }, { status: 404 });
}
