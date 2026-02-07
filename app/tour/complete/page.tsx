"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { CompletionSummary } from "@/components/CompletionSummary";
import { loadTour, updateSession, clearTour } from "@/lib/data/SessionStore";

export default function TourCompletePage() {
  const [session, setSession] = useState(loadTour());

  useEffect(() => {
    const s = loadTour();
    if (s && !s.endedAt) {
      updateSession({ endedAt: Date.now() });
      setSession(loadTour());
    } else {
      setSession(s);
    }
  }, []);

  const handleSaveTour = () => {
    // For hackathon: persist to localStorage key for "saved tours" list; keep current session as-is
    const s = loadTour();
    if (s && typeof window !== "undefined") {
      try {
        const saved = JSON.parse(localStorage.getItem("odyssey-saved-tours") ?? "[]");
        saved.push({ ...s, savedAt: Date.now() });
        localStorage.setItem("odyssey-saved-tours", JSON.stringify(saved));
      } catch {
        // ignore
      }
    }
  };

  return (
    <div className="min-h-screen bg-navy-950">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-navy-950/90 backdrop-blur px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-4">
          <Link href="/create" className="p-2 rounded-lg hover:bg-white/10 text-white" aria-label="Back">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="font-semibold text-xl text-white">Tour Complete</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        <CompletionSummary
          session={session}
          onSaveTour={handleSaveTour}
          onGenerateAnother={() => {}}
        />
      </main>
    </div>
  );
}
