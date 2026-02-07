"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Timer } from "lucide-react";
import { OdysseyLogo } from "@/components/OdysseyLogo";
import { saveTour } from "@/lib/data/SessionStore";
import { AudioSessionManager } from "@/lib/audio/AudioSessionManager";
import type { SessionState, GeneratedTourResponse } from "@/lib/types";

const DEMO_SESSION: GeneratedTourResponse = {
  sessionId: "demo-90",
  tourPlan: {
    intro: "Welcome to this short demo. We'll visit two stops and try a question.",
    outro: "Demo complete. Create your own tour from the home page.",
    theme: "demo",
    estimatedMinutes: 5,
    routePoints: [
      { lat: 37.7849, lng: -122.4094 },
      { lat: 37.786, lng: -122.408 },
      { lat: 37.787, lng: -122.407 },
    ],
  },
  pois: [
    {
      poiId: "poi-1",
      name: "Demo Stop 1",
      lat: 37.786,
      lng: -122.408,
      radiusM: 35,
      script: "This is the first demo stop. Imagine you're standing at a historic landmark. The narration would tell you about the place in ninety to one hundred forty words. For this demo we keep it short.",
      facts: ["Demo fact one.", "Demo fact two.", "Demo fact three."],
      orderIndex: 0,
    },
    {
      poiId: "poi-2",
      name: "Demo Stop 2",
      lat: 37.787,
      lng: -122.407,
      radiusM: 35,
      script: "This is the second demo stop. The tour would continue with more stories. Thanks for trying the demo.",
      facts: ["Second stop fact."],
      orderIndex: 1,
    },
  ],
};

const SCRIPT_MS = 6000;
const SAMPLE_QUESTION = "When was it built?";

export default function DemoPage() {
  const [running, setRunning] = useState(false);
  const [step, setStep] = useState<string>("");

  const run90SecondDemo = async () => {
    setRunning(true);
    saveTour(DEMO_SESSION.sessionId, DEMO_SESSION);
    const session: SessionState = {
      sessionId: DEMO_SESSION.sessionId,
      tourPlan: DEMO_SESSION.tourPlan,
      pois: DEMO_SESSION.pois,
      visitedPoiIds: [],
      activePoiId: null,
      mode: "demo",
      startedAt: Date.now(),
    };

    try {
      setStep("Playing stop 1…");
      await AudioSessionManager.playPoiScript(DEMO_SESSION.pois[0]);
      await new Promise((r) => setTimeout(r, SCRIPT_MS));
      AudioSessionManager.stop();

      setStep("Sample Q&A…");
      const res = await fetch("/api/qa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: session.sessionId,
          poiId: DEMO_SESSION.pois[0].poiId,
          questionText: SAMPLE_QUESTION,
          context: {
            currentPoiScript: DEMO_SESSION.pois[0].script,
            tourIntro: DEMO_SESSION.tourPlan.intro,
            theme: DEMO_SESSION.tourPlan.theme,
          },
        }),
      });
      const qaData = await res.json();
      const answerText = qaData.answerText ?? "This is a demo. In a real tour you'd hear an answer here.";
      await AudioSessionManager.playAnswer(answerText);
      await new Promise((r) => setTimeout(r, 5000));
      AudioSessionManager.stop();

      setStep("Playing stop 2…");
      await AudioSessionManager.playPoiScript(DEMO_SESSION.pois[1]);
      await new Promise((r) => setTimeout(r, SCRIPT_MS));
      AudioSessionManager.stop();

      setStep("Done.");
    } finally {
      setRunning(false);
      setStep("");
    }
  };

  return (
    <div className="min-h-screen bg-app-bg">
      <header className="sticky top-0 z-20 border-b border-app-border bg-surface shadow-sm px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-4">
          <Link href="/" className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-button hover:bg-app-bg text-ink-primary" aria-label="Back to home">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <Link href="/" className="min-h-[44px] flex items-center shrink-0" aria-label="Odyssey Walk home">
            <OdysseyLogo size="sm" />
          </Link>
          <h1 className="text-heading-sm flex-1">Demo</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-8">
        <p className="text-body text-ink-secondary">
          This runs a short scripted tour so you can see how narration and Q&A work. No mic or location required. One click: Stop 1 → sample question → Stop 2.
        </p>

        <button
          type="button"
          onClick={run90SecondDemo}
          disabled={running}
          className="flex items-center justify-center gap-2 w-full py-4 rounded-button bg-brand-primary hover:bg-brand-primaryHover text-white font-semibold shadow-md disabled:opacity-50 min-h-[44px]"
          aria-label={running ? "Running demo" : "Run 90 second demo"}
        >
          <Timer className="w-5 h-5" />
          {running ? step || "Running…" : "Run 90s Demo"}
        </button>

        <Link
          href="/create"
          className="block text-center py-3 rounded-button bg-surface border border-app-border text-ink-primary font-medium hover:bg-surface-muted"
        >
          Create your own tour
        </Link>
      </main>
    </div>
  );
}
