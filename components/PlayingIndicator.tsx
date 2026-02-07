"use client";

import { motion } from "framer-motion";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

/**
 * Playing indicator: 4 animated bars to show audio is playing (respects reduced motion).
 */
export function PlayingIndicator() {
  const prefersReducedMotion = usePrefersReducedMotion();
  
  return (
    <div className="flex items-center gap-0.5 h-4">
      {[0, 1, 2, 3].map((i) => (
        <motion.div
          key={i}
          className="w-0.5 bg-brand-primary rounded-full"
          animate={prefersReducedMotion ? { height: "60%" } : {
            height: ["30%", "100%", "30%"],
          }}
          transition={prefersReducedMotion ? {} : {
            duration: 0.8,
            repeat: Infinity,
            ease: "easeInOut",
            delay: i * 0.15,
          }}
        />
      ))}
    </div>
  );
}
