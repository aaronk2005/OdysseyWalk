"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Play, MapPin, Timer } from "lucide-react";
import { getTour } from "@/lib/data/TourRepository";
import { AudioSessionManager } from "@/lib/audio/AudioSessionManager";
import type { Tour, POI } from "@/lib/types";

const NARRATION_DURATION_MS = 7000;
const ANSWER_DURATION_MS = 7000;
const SAMPLE_QUESTION = "When was it built?";

export default function DemoPage() {
  const [tour, setTour] = useState<Tour | null>(null);
  const [pois, setPois] = useState<POI[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [scriptRunning, setScriptRunning] = useState(false);
  const [ninetySecRunning, setNinetySecRunning] = useState(false);

  useEffect(() => {
    getTour("sample")
      .then(({ tour: t, pois: p }) => {
        setTour(t);
        setPois(p);
      })
      .finally(() => setLoading(false));
  }, []);

  const playPoi = async (poi: POI) => {
    const text =
      poi.scripts?.friendly || poi.scripts?.historian || poi.scripts?.funny || "";
    if (text) {
      await AudioSessionManager.playNarration(poi.poiId, text, {
        voiceStyle: "friendly",
        lang: "en",
        scriptVersion: poi.scriptVersion ?? 1,
      });
    }
  };

  const runDemoScript = async () => {
    if (!pois.length) return;
    setScriptRunning(true);
    setCurrentIndex(0);
    await playPoi(pois[0]);
    setCurrentIndex(1);
    await new Promise((r) => setTimeout(r, 500));
    for (let i = 1; i < pois.length; i++) {
      await new Promise((r) => setTimeout(r, 8000));
      setCurrentIndex(i);
      await playPoi(pois[i]);
    }
    setScriptRunning(false);
  };

  const run90SecondDemo = async () => {
    if (!pois.length) return;
    setNinetySecRunning(true);
    setCurrentIndex(0);
    try {
      await playPoi(pois[0]);
      setCurrentIndex(0);
      await new Promise((r) => setTimeout(r, NARRATION_DURATION_MS));
      AudioSessionManager.stop();
      setCurrentIndex(0);
      const poi = pois[0];
      const res = await fetch("/api/qa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tourId: tour?.tourId,
          poiId: poi.poiId,
          question: SAMPLE_QUESTION,
          voiceStyle: "friendly",
          lang: "en",
          poiScript: poi.scripts?.friendly || poi.scripts?.historian,
          poiFacts: poi.facts,
        }),
      });
      const data = await res.json();
      const answerText = data.answerText || (poi.facts?.[0] ?? "No answer.");
      await AudioSessionManager.playAnswerStream(answerText);
      await new Promise((r) => setTimeout(r, ANSWER_DURATION_MS));
      AudioSessionManager.stop();
      setCurrentIndex(1);
      if (pois[1]) await playPoi(pois[1]);
      await new Promise((r) => setTimeout(r, NARRATION_DURATION_MS));
    } finally {
      setNinetySecRunning(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-2 border-accent-blue border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!tour) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4">
        <p className="text-white/80">Could not load sample tour.</p>
        <Link href="/tours" className="text-accent-blue">Back to tours</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-navy-950">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-navy-950/90 backdrop-blur px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-4">
          <Link href="/" className="p-2 rounded-lg hover:bg-white/10 text-white" aria-label="Back">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="font-semibold text-xl text-white">Demo — Scripted Playback</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-8">
        <p className="text-white/70">
          No permissions required. Teleport to a stop and play, or run the scripted demos below.
        </p>

        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={run90SecondDemo}
            disabled={ninetySecRunning || scriptRunning}
            className="flex items-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-accent-blue to-accent-purple text-white font-medium disabled:opacity-50"
          >
            <Timer className="w-5 h-5" />
            {ninetySecRunning ? "Running 90s demo…" : "Run 90-second demo"}
          </button>
          <p className="text-xs text-white/50">
            POI1 narration → sample question & answer → POI2 narration. No mic needed.
          </p>
          <button
            type="button"
            onClick={runDemoScript}
            disabled={scriptRunning || ninetySecRunning}
            className="flex items-center gap-2 px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white font-medium disabled:opacity-50"
          >
            <Play className="w-5 h-5" />
            {scriptRunning ? "Playing…" : "Run full demo script"}
          </button>
          <Link
            href={`/tour/${tour.tourId}`}
            className="flex items-center gap-2 px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white font-medium hover:bg-white/15 text-center justify-center"
          >
            Open full tour
          </Link>
        </div>

        <div className="space-y-2">
          <h2 className="font-medium text-white">Stops — tap to play</h2>
          {pois.map((poi, i) => (
            <motion.button
              key={poi.poiId}
              type="button"
              onClick={() => {
                setCurrentIndex(i);
                playPoi(poi);
              }}
              className={`w-full flex items-center gap-3 p-4 rounded-xl border text-left transition-colors ${
                currentIndex === i
                  ? "border-accent-blue/50 bg-accent-blue/10"
                  : "border-white/10 bg-white/5 hover:bg-white/10"
              }`}
            >
              <MapPin className="w-5 h-5 text-accent-blue shrink-0" />
              <div>
                <p className="font-medium text-white">{poi.name}</p>
                <p className="text-sm text-white/60 line-clamp-1">
                  {poi.scripts?.friendly?.slice(0, 60)}…
                </p>
              </div>
            </motion.button>
          ))}
        </div>
      </main>
    </div>
  );
}
