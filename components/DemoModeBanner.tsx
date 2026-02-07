"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { MapPin, Play } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface DemoModeBannerProps {
  onRunScriptedDemo?: () => void;
  onJumpNext?: () => void;
  className?: string;
}

export function DemoModeBanner({
  onRunScriptedDemo,
  onJumpNext,
  className,
}: DemoModeBannerProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "flex flex-wrap items-center gap-2 px-3 py-2 rounded-xl bg-accent-purple/15 border border-accent-purple/30",
        className
      )}
    >
      <span className="text-xs font-medium text-white/90">
        Demo mode: simulated movement
      </span>
      {onJumpNext && (
        <button
          type="button"
          onClick={onJumpNext}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-medium"
        >
          <Play className="w-3 h-3" />
          Next stop
        </button>
      )}
      {onRunScriptedDemo && (
        <Link
          href="/demo"
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-medium"
        >
          <MapPin className="w-3 h-3" />
          Run 90s Demo
        </Link>
      )}
    </motion.div>
  );
}
