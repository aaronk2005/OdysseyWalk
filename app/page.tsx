"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, X } from "lucide-react";
import { OdysseyLogo } from "@/components/OdysseyLogo";

const ONBOARDING_KEY = "odyssey-onboarding-seen";

export default function LandingPage() {
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const seen = localStorage.getItem(ONBOARDING_KEY);
    if (!seen) setShowOnboarding(true);
  }, []);

  const dismissOnboarding = () => {
    setShowOnboarding(false);
    if (typeof window !== "undefined") localStorage.setItem(ONBOARDING_KEY, "true");
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-app-bg">
      <header className="relative z-10 flex items-center justify-between px-4 py-5 max-w-6xl mx-auto">
        <Link href="/" className="focus:outline-none min-h-[44px] flex items-center" aria-label="Odyssey Walk home">
          <OdysseyLogo size="lg" />
        </Link>
        <Link
          href="/create"
          className="text-[15px] font-semibold px-5 py-2.5 rounded-full bg-ink-primary text-white hover:opacity-90 transition-opacity min-h-[44px] flex items-center"
          aria-label="Create Tour"
        >
          Create Tour
        </Link>
      </header>

      <AnimatePresence>
        {showOnboarding && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="relative z-20 mx-4 mt-2 mb-4 rounded-card border border-app-border bg-surface p-4 shadow-sm"
          >
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-body text-ink-primary font-medium mb-1">Welcome!</p>
                <p className="text-caption text-ink-secondary mb-4">
                  Pick a spot on the map, choose a theme, and we&apos;ll generate a walking tour. You can try the demo first if you prefer.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Link
                    href="/demo"
                    onClick={dismissOnboarding}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-button bg-surface-muted text-ink-primary font-medium hover:bg-app-bg border border-app-border min-h-[44px]"
                  >
                    Try demo
                  </Link>
                  <Link
                    href="/create"
                    onClick={dismissOnboarding}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-button bg-brand-primary text-white font-medium hover:bg-brand-primaryHover min-h-[44px]"
                  >
                    Create tour
                  </Link>
                  <button
                    type="button"
                    onClick={dismissOnboarding}
                    className="inline-flex items-center px-4 py-2.5 rounded-button text-ink-secondary font-medium hover:bg-surface-muted min-h-[44px]"
                  >
                    Got it
                  </button>
                </div>
              </div>
              <button
                type="button"
                onClick={dismissOnboarding}
                className="p-2 rounded-button hover:bg-surface-muted text-ink-tertiary min-w-[44px] min-h-[44px] flex items-center justify-center"
                aria-label="Dismiss welcome"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="relative z-10 px-4 pt-16 pb-24 max-w-6xl mx-auto text-center">
        <motion.h1
          className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-ink-primary mb-6"
          style={{ letterSpacing: "-0.03em", lineHeight: 1.1 }}
          initial={{ opacity: 1, y: 0 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          Walk. Listen.{" "}
          <span className="text-brand-primary">Ask.</span>
        </motion.h1>
        <motion.p
          className="text-lg sm:text-xl text-ink-secondary mb-12 max-w-lg mx-auto font-medium"
          style={{ letterSpacing: "-0.01em" }}
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          Generate a walking tour from any starting point. Narration at each stop. Hold the mic to ask—AI answers out loud.
        </motion.p>
        <motion.div
          className="flex flex-col sm:flex-row items-center justify-center gap-3"
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <Link
            href="/create"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-brand-primary text-white text-lg font-semibold hover:bg-brand-primaryHover transition-colors min-h-[44px]"
          >
            Create Tour
            <ArrowRight className="w-5 h-5" />
          </Link>
          <Link
            href="/demo"
            className="inline-flex items-center px-6 py-3 rounded-full border border-app-border bg-surface text-ink-primary font-medium hover:bg-surface-muted transition-colors min-h-[44px]"
          >
            Try the demo first
          </Link>
        </motion.div>

        <motion.section
          className="mt-24 max-w-2xl mx-auto text-left"
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <div className="space-y-1 border-l-2 border-ink-primary/20 pl-6">
            <p className="text-ink-primary font-semibold text-[15px]" style={{ letterSpacing: "-0.01em" }}>
              Pick your start
            </p>
            <p className="text-ink-secondary text-sm mb-6">
              Search or click the map to set your starting location.
            </p>

            <p className="text-ink-primary font-semibold text-[15px]" style={{ letterSpacing: "-0.01em" }}>
              Generate route
            </p>
            <p className="text-ink-secondary text-sm mb-6">
              Get a walking loop with 5–8 stops and narration scripts.
            </p>

            <p className="text-ink-primary font-semibold text-[15px]" style={{ letterSpacing: "-0.01em" }}>
              Ask along the way
            </p>
            <p className="text-ink-secondary text-sm">
              Press and hold to ask questions; hear answers spoken back.
            </p>
          </div>
        </motion.section>
      </main>
    </div>
  );
}
