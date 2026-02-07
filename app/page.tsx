"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Map, Mic, Compass, ArrowRight } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen overflow-x-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-navy-900/95 to-navy-950 pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(59,130,246,0.12),transparent)] pointer-events-none" />

      <header className="relative z-10 flex items-center justify-between px-4 py-6 max-w-6xl mx-auto">
        <span className="font-semibold text-lg tracking-tight text-white">Odyssey Walk</span>
        <Link
          href="/create"
          className="text-sm px-4 py-2 rounded-xl bg-accent-blue/20 text-accent-blue border border-accent-blue/30 hover:bg-accent-blue/30 transition-colors"
        >
          Create Tour
        </Link>
      </header>

      <main className="relative z-10 px-4 pt-16 pb-24 max-w-6xl mx-auto text-center">
        <motion.h1
          className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-white mb-6"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          Walk. Listen.{" "}
          <span className="bg-gradient-to-r from-accent-blue to-accent-purple bg-clip-text text-transparent">
            Ask.
          </span>
        </motion.h1>
        <motion.p
          className="text-lg text-white/70 mb-10 max-w-xl mx-auto"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          Generate a walking tour from any starting point. Narration plays at each stop. Press and hold the mic to ask questions—answered by AI and spoken back.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <Link
            href="/create"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-accent-blue to-accent-purple text-white font-semibold shadow-lg shadow-accent-blue/20 hover:opacity-95 transition-opacity"
          >
            Create Tour
            <ArrowRight className="w-5 h-5" />
          </Link>
        </motion.div>

        <motion.section
          className="mt-24 grid sm:grid-cols-3 gap-6 text-left"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          {[
            { icon: Map, title: "Pick your start", description: "Search or click the map to set your starting location." },
            { icon: Compass, title: "Generate route", description: "Get a walking loop with 5–8 stops and narration scripts." },
            { icon: Mic, title: "Ask along the way", description: "Press and hold to ask questions; hear answers spoken back." },
          ].map((item, i) => (
            <div
              key={item.title}
              className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-6"
            >
              <item.icon className="w-10 h-10 text-accent-blue mb-4" />
              <h3 className="font-semibold text-white mb-2">{item.title}</h3>
              <p className="text-sm text-white/60">{item.description}</p>
            </div>
          ))}
        </motion.section>
      </main>
    </div>
  );
}
