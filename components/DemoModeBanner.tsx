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
        "flex flex-wrap items-center gap-2 px-3 py-2 rounded-card bg-brand-secondary/10 border border-brand-secondary/30",
        className
      )}
    >
      <span className="text-xs font-medium text-ink-primary">
        Demo mode: simulated movement
      </span>
      {onJumpNext && (
        <button
          type="button"
          onClick={onJumpNext}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-button bg-surface border border-app-border text-ink-primary text-xs font-medium hover:bg-surface-muted"
        >
          <Play className="w-3 h-3" />
          Next stop
        </button>
      )}
      {onRunScriptedDemo && (
        <Link
          href="/demo"
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-button bg-surface border border-app-border text-ink-primary text-xs font-medium hover:bg-surface-muted"
        >
          <MapPin className="w-3 h-3" />
          Run 90s Demo
        </Link>
      )}
    </motion.div>
  );
}
