"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { CompletionSummary } from "@/components/CompletionSummary";
import { OdysseyLogo } from "@/components/OdysseyLogo";
import { loadTour, updateSession } from "@/lib/data/SessionStore";

export default function TourCompletePage() {
  const [session, setSession] = useState<ReturnType<typeof loadTour>>(null);

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
    <div className="min-h-screen bg-app-bg">
      <header className="sticky top-0 z-20 border-b border-app-border bg-surface shadow-sm px-4 py-4 safe-bottom">
        <div className="max-w-2xl mx-auto flex items-center gap-4">
          <Link href="/create" className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-button hover:bg-app-bg text-ink-primary" aria-label="Back to create">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <Link href="/" className="min-h-[44px] flex items-center shrink-0" aria-label="Odyssey Walk home">
            <OdysseyLogo size="sm" />
          </Link>
          <h1 className="text-heading-sm flex-1">Tour Complete</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        <CompletionSummary
          session={session}
          onSaveTour={handleSaveTour}
          onGenerateAnother={undefined}
        />
      </main>
    </div>
  );
}
