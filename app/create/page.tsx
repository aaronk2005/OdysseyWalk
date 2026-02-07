"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, MapPin, Sparkles, Loader2 } from "lucide-react";
import { cacheTour } from "@/lib/data/TourRepository";
import type { Tour, POI, VoiceStyle, Lang } from "@/lib/types";

const THEMES = [
  { id: "history", label: "History" },
  { id: "food", label: "Food" },
  { id: "campus", label: "Campus" },
  { id: "spooky", label: "Spooky" },
  { id: "art", label: "Art" },
];

export default function CreateTourPage() {
  const router = useRouter();
  const [startName, setStartName] = useState("San Francisco, CA");
  const [startLat, setStartLat] = useState(37.7849);
  const [startLng, setStartLng] = useState(-122.4094);
  const [theme, setTheme] = useState("history");
  const [durationMin, setDurationMin] = useState(30);
  const [pace, setPace] = useState<"slow" | "normal" | "fast">("normal");
  const [lang, setLang] = useState<Lang>("en");
  const [voiceStyle, setVoiceStyle] = useState<VoiceStyle>("friendly");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generated, setGenerated] = useState<{ tour: Tour; pois: POI[] } | null>(null);

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/tour/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startPlace: { name: startName, lat: startLat, lng: startLng },
          theme,
          durationMin,
          pace,
          lang,
          voiceStyle,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Generate failed");
      setGenerated({ tour: data.tour, pois: data.pois });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = () => {
    if (!generated) return;
    cacheTour(generated.tour.tourId, generated.tour, generated.pois);
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(
        `odyssey-tour-${generated.tour.tourId}`,
        JSON.stringify({ tour: generated.tour, pois: generated.pois })
      );
    }
    router.push(`/tour/${generated.tour.tourId}`);
  };

  return (
    <div className="min-h-screen bg-navy-950">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-navy-950/90 backdrop-blur px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-4">
          <Link href="/" className="p-2 rounded-lg hover:bg-white/10 text-white" aria-label="Back">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="font-semibold text-xl text-white">Create Tour</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-8">
        <motion.section
          className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-6"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h2 className="font-medium text-white mb-4 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-accent-blue" />
            Starting location
          </h2>
          <input
            type="text"
            value={startName}
            onChange={(e) => setStartName(e.target.value)}
            placeholder="City or address"
            className="w-full px-4 py-3 rounded-xl bg-navy-800 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-accent-blue/50"
          />
          <p className="text-xs text-white/50 mt-2">
            For demo we use San Francisco. Add Google Places for real search.
          </p>
          <div className="grid grid-cols-2 gap-2 mt-2">
            <input
              type="number"
              step="any"
              value={startLat}
              onChange={(e) => setStartLat(Number(e.target.value))}
              className="px-3 py-2 rounded-lg bg-navy-800 border border-white/10 text-white text-sm"
              placeholder="Lat"
            />
            <input
              type="number"
              step="any"
              value={startLng}
              onChange={(e) => setStartLng(Number(e.target.value))}
              className="px-3 py-2 rounded-lg bg-navy-800 border border-white/10 text-white text-sm"
              placeholder="Lng"
            />
          </div>
        </motion.section>

        <motion.section
          className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-6"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <h2 className="font-medium text-white mb-4 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-accent-purple" />
            Theme & duration
          </h2>
          <div className="flex flex-wrap gap-2 mb-4">
            {THEMES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTheme(t.id)}
                className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  theme === t.id
                    ? "bg-accent-purple/30 text-white border border-accent-purple/50"
                    : "bg-white/10 text-white/80 hover:bg-white/15"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <label className="block text-sm text-white/70 mb-2">
            Duration: {durationMin} min
          </label>
          <input
            type="range"
            min={15}
            max={60}
            value={durationMin}
            onChange={(e) => setDurationMin(Number(e.target.value))}
            className="w-full h-2 rounded-full bg-white/10 accent-accent-blue"
          />
          <div className="flex gap-2 mt-2">
            {(["slow", "normal", "fast"] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPace(p)}
                className={`px-3 py-1.5 rounded-lg text-sm capitalize ${
                  pace === p ? "bg-accent-blue/20 text-white" : "bg-white/10 text-white/70"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </motion.section>

        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-200 text-sm">
            {error}
          </div>
        )}

        <div className="flex gap-4">
          <button
            type="button"
            onClick={handleGenerate}
            disabled={generating}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-accent-blue to-accent-purple text-white font-medium disabled:opacity-50"
          >
            {generating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Generating…
              </>
            ) : (
              "Generate Tour"
            )}
          </button>
          {generated && (
            <button
              type="button"
              onClick={handleSave}
              className="px-6 py-3 rounded-xl bg-white/10 border border-white/20 text-white font-medium hover:bg-white/15"
            >
              Save & Open
            </button>
          )}
        </div>

        <p className="text-sm text-white/50">
          No API key? Use the{" "}
          <Link href="/tour/sample" className="text-accent-blue hover:underline">
            sample tour
          </Link>{" "}
          or try the{" "}
          <Link href="/demo" className="text-accent-blue hover:underline">
            demo page
          </Link>
          .
        </p>

        {generated && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-2xl border border-white/10 bg-white/5 p-4"
          >
            <h3 className="font-medium text-white mb-2">{generated.tour.name}</h3>
            <p className="text-sm text-white/60">
              {generated.pois.length} stops · {generated.tour.estimatedMinutes} min
            </p>
          </motion.div>
        )}
      </main>
    </div>
  );
}
