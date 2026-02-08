#!/usr/bin/env node
/**
 * Downloads Unsplash stock photos for each tour and updates thumbnailUrl in JSON.
 * Run: node scripts/download-tour-photos.mjs
 *
 * Photo IDs from Unsplash (free to use, no attribution required per Unsplash License).
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TOURS_DIR = path.join(__dirname, "..", "public", "tours");

// Unsplash photo IDs (from unsplash.com/photos/ID) - city/landmark images, free to use
const PHOTOS = {
  "paris-history": "Jf7_rRyhp7s",
  "rome-history": "75XHJzEIeUc",
  "london-art": "Q6UehpkBSnQ",
  "new-york-food": "VHaWwCLmCLg",
  "boston-freedom": "65m6fvWtcGA",
  "chicago-architecture": "2B5aWwADOn4",
  "amsterdam-canals": "Sonq0EPLTiE",
  "barcelona-gaudi": "ScFR_p0T78A",
  "tokyo-culture": "4LoaeeTL1_s",
  "spooky": "_EHPjZ3aBzU",
  "sample": "_EHPjZ3aBzU",
  "dublin-literary": "TIS8AnSiFI4",
  "lisbon-hills": "TZDLtks0xIQ",
  "edinburgh-old-town": "EYLgLeJJQGU",
  "berlin-wall": "EmGJdoIvp3A",
  "kyoto-temples": "4LoaeeTL1_s",
  "new-orleans-french-quarter": "qtYhAQnIwSE",
};

async function download(url) {
  const res = await fetch(url, {
    redirect: "follow",
    headers: { "User-Agent": "OdysseyWalk/1.0 (https://github.com/odyssey-walk)" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  return buf;
}

async function main() {
  for (const [tourId, photoId] of Object.entries(PHOTOS)) {
    const jsonPath = path.join(TOURS_DIR, `${tourId}.json`);
    if (!fs.existsSync(jsonPath)) {
      console.log("Skip (no JSON):", tourId);
      continue;
    }
    const outPath = path.join(TOURS_DIR, `thumb-${tourId}.jpg`);
    const url = `https://unsplash.com/photos/${photoId}/download?w=800&h=500&fit=crop`;
    try {
      console.log("Downloading", tourId, "...");
      const buf = await download(url);
      fs.writeFileSync(outPath, buf);
      console.log("  ->", path.basename(outPath));

      const data = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
      if (data.tour) {
        data.tour.thumbnailUrl = `/tours/thumb-${tourId}.jpg`;
        fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2) + "\n", "utf-8");
        console.log("  -> updated", tourId + ".json");
      }
    } catch (err) {
      console.error("  ERROR", tourId, err.message);
    }
  }
  console.log("Done.");
}

main();
