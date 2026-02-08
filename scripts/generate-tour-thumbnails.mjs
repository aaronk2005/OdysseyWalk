#!/usr/bin/env node
/**
 * Generates SVG thumbnail images for each tour and updates thumbnailUrl in JSON.
 * Run: node scripts/generate-tour-thumbnails.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TOURS_DIR = path.join(__dirname, "..", "public", "tours");

// Gradient colors by index (varied, accessible)
const GRADIENTS = [
  ["#1e3a5f", "#2d5a87"],
  ["#5c2a2a", "#8b3d3d"],
  ["#2d4a3e", "#3d6b5a"],
  ["#4a3d2d", "#6b5a3d"],
  ["#3d2d5a", "#5a3d7a"],
  ["#2d5a4a", "#3d7a6b"],
  ["#5a3d2d", "#7a5a3d"],
  ["#2d3d5a", "#3d5a7a"],
  ["#4a2d3d", "#6b3d5a"],
  ["#3d4a2d", "#5a6b3d"],
  ["#2d2d4a", "#3d3d6b"],
  ["#5a2d4a", "#7a3d6b"],
  ["#2d4a5a", "#3d6b7a"],
  ["#4a4a2d", "#6b6b3d"],
  ["#3d2d2d", "#5a3d3d"],
  ["#2d5a2d", "#3d7a3d"],
  ["#5a4a2d", "#7a6b3d"],
];

function escapeXml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function generateSvg(title, subtitle, colorPair) {
  const [c1, c2] = colorPair;
  const safeTitle = escapeXml(title);
  const safeSubtitle = escapeXml(subtitle);
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500" width="800" height="500">
  <defs>
    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${c1}"/>
      <stop offset="100%" style="stop-color:${c2}"/>
    </linearGradient>
  </defs>
  <rect width="800" height="500" fill="url(#g)"/>
  <text x="400" y="250" text-anchor="middle" fill="white" font-family="system-ui, -apple-system, sans-serif" font-size="42" font-weight="700">${safeTitle}</text>
  <text x="400" y="290" text-anchor="middle" fill="rgba(255,255,255,0.9)" font-family="system-ui, -apple-system, sans-serif" font-size="16">${safeSubtitle}</text>
</svg>`;
}

const files = fs.readdirSync(TOURS_DIR).filter((f) => f.endsWith(".json"));
let index = 0;

for (const file of files) {
  const filePath = path.join(TOURS_DIR, file);
  const raw = fs.readFileSync(filePath, "utf-8");
  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    continue;
  }
  const tour = data.tour;
  if (!tour || !tour.tourId) continue;

  const city = tour.city || tour.name || tour.tourId;
  const title = city.split(",")[0].trim();
  const subtitle = "Walking Tour";
  const colorPair = GRADIENTS[index % GRADIENTS.length];
  index += 1;

  const svg = generateSvg(title, subtitle, colorPair);
  const baseName = tour.tourId;
  const svgPath = path.join(TOURS_DIR, `thumb-${baseName}.svg`);
  fs.writeFileSync(svgPath, svg, "utf-8");
  console.log("Wrote", path.basename(svgPath));

  tour.thumbnailUrl = `/tours/thumb-${baseName}.svg`;
  data.tour = tour;
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n", "utf-8");
  console.log("Updated thumbnailUrl in", file);
}

console.log("Done.");
