"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Play } from "lucide-react";
import type { SessionState } from "@/lib/types";

/**
 * Shown on landing and Create when a walk was started but not completed.
 * "Resume your [theme] walk?" → /tour/active
 */
export interface ResumeWalkBannerProps {
  session: SessionState | null;
  className?: string;
}

export function ResumeWalkBanner({ session, className = "" }: ResumeWalkBannerProps) {
  if (!session || session.startedAt <= 0 || session.endedAt) return null;

  const theme = session.tourPlan?.theme ?? "tour";
  const label = theme.charAt(0).toUpperCase() + theme.slice(1) + " walk";

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className={className}
    >
      <Link
        href="/tour/active"
        className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl bg-brand-primary/10 border border-brand-primary/30 text-brand-primary font-medium hover:bg-brand-primary/15 transition-colors"
      >
        <Play className="w-4 h-4" />
        <span>Resume your {label}</span>
      </Link>
    </motion.div>
  );
}
