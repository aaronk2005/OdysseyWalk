import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Odyssey Walk",
    short_name: "Odyssey Walk",
    description: "Voice-first audio walking tours with live narration and voice Q&A",
    start_url: "/",
    display: "standalone",
    background_color: "#f1f5f9",
    theme_color: "#0d9488",
    icons: [
      { src: "/icons/app-icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/app-icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  };
}
