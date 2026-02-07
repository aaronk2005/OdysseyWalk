"use client";

import { cn } from "@/lib/utils/cn";

/** Wordmark only for Odyssey Walk (logo image removed for now) */
export function OdysseyLogo({ className, size = "md" }: { className?: string; size?: "sm" | "md" | "lg" }) {
  const textSizes = { sm: "text-2xl", md: "text-3xl", lg: "text-4xl" };

  return (
    <span className={cn("font-bold tracking-tight text-ink-primary", textSizes[size], className)}>
      Odyssey Walk
    </span>
  );
}
