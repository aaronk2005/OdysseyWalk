"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Map, Mic, Compass, ArrowRight, Sparkles } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen overflow-x-hidden">
      <div className="absolute inset-0 bg-gradient-hero pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(59,130,246,0.15),transparent)] pointer-events-none" />

      <header className="relative z-10 flex items-center justify-between px-4 py-6 max-w-6xl mx-auto">
        <span className="font-semibold text-lg tracking-tight text-white">
          Odyssey Walk
        </span>
        <nav className="flex items-center gap-4">
          <Link
            href="/tours"
            className="text-sm text-white/70 hover:text-white transition-colors"
          >
            Tours
          </Link>
          <Link
            href="/demo"
            className="text-sm text-white/70 hover:text-white transition-colors"
          >
            Demo
          </Link>
          <Link
            href="/tour/sample"
            className="text-sm px-3 py-1.5 rounded-lg bg-accent-blue/20 text-accent-blue border border-accent-blue/30 hover:bg-accent-blue/30 transition-colors"
          >
            Try now
          </Link>
        </nav>
      </header>

      <main className="relative z-10 px-4 pt-12 pb-24 max-w-6xl mx-auto">
        <motion.section
          className="text-center max-w-3xl mx-auto"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <motion.div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-white/80 text-sm mb-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <Sparkles className="w-4 h-4 text-accent-purple" />
            Voice-first audio tours
          </motion.div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-white mb-6">
            Walk. Listen.{" "}
            <span className="bg-gradient-to-r from-accent-blue to-accent-purple bg-clip-text text-transparent">
              Ask.
            </span>
          </h1>
          <p className="text-lg text-white/70 mb-10">
            Premium audio tours that play as you go. Hold the mic to ask questions—answered by AI and spoken back in real time.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/tours"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-accent-blue to-accent-purple text-white font-medium shadow-lg shadow-accent-blue/20 hover:opacity-90 transition-opacity"
            >
              Explore Tours
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/demo"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white/10 border border-white/20 text-white font-medium hover:bg-white/15 transition-colors"
            >
              Try Demo
            </Link>
          </div>
        </motion.section>

        <motion.section
          className="mt-20 grid sm:grid-cols-3 gap-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
        >
          {[
            {
              icon: Map,
              title: "Auto narration",
              description: "Stories play automatically when you reach each stop. No tapping required.",
            },
            {
              icon: Mic,
              title: "Voice Q&A",
              description: "Press and hold to ask anything. Get answers spoken back using AI and TTS.",
            },
            {
              icon: Compass,
              title: "Accessible",
              description: "Hands-free, screen-optional. Perfect for walking and exploring.",
            },
          ].map((card, i) => (
            <motion.div
              key={card.title}
              className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-6"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 + i * 0.1 }}
            >
              <card.icon className="w-10 h-10 text-accent-blue mb-4" />
              <h3 className="font-semibold text-white mb-2">{card.title}</h3>
              <p className="text-sm text-white/60">{card.description}</p>
            </motion.div>
          ))}
        </motion.section>

        <motion.section
          className="mt-20 rounded-2xl border border-white/10 bg-navy-800/50 overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
        >
          <div className="aspect-video bg-navy-900 flex items-center justify-center text-white/40">
            <div className="text-center">
              <Map className="w-16 h-16 mx-auto mb-2 opacity-50" />
              <p>App preview — open a tour to see the map</p>
            </div>
          </div>
        </motion.section>
      </main>
    </div>
  );
}
