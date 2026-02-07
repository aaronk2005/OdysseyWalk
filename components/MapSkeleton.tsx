"use client";

import { motion } from "framer-motion";

/**
 * Map loading skeleton: soft placeholder before map loads.
 */
export function MapSkeleton({ className }: { className?: string }) {
  return (
    <div className={`relative overflow-hidden bg-surface-muted ${className}`}>
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
        animate={{ x: ["-100%", "100%"] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
      />
      <div className="absolute inset-0 flex items-center justify-center">
        <p className="text-xs text-ink-tertiary">Loading map...</p>
      </div>
    </div>
  );
}
