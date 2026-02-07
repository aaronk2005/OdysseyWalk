"use client";

import { cn } from "@/lib/utils/cn";

interface MapsKeyBannerProps {
  className?: string;
}

export function MapsKeyBanner({ className }: MapsKeyBannerProps) {
  return (
    <div
      className={cn(
        "px-4 py-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-200 text-sm",
        className
      )}
      role="alert"
    >
      <strong>Map unavailable.</strong> Add <code className="text-xs bg-white/10 px-1 rounded">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> to see the map. You can still use the tour and audio.
    </div>
  );
}
