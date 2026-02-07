"use client";

import { cn } from "@/lib/utils/cn";

interface MapsKeyBannerProps {
  className?: string;
}

export function MapsKeyBanner({ className }: MapsKeyBannerProps) {
  return (
    <div
      className={cn(
        "px-4 py-3 rounded-card bg-amber-50 border border-amber-200 text-amber-900 text-caption",
        className
      )}
      role="alert"
    >
      <strong>Map unavailable.</strong> Add <code className="text-xs bg-amber-100 px-1.5 py-0.5 rounded">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> to see the map. You can still use the tour and audio.
    </div>
  );
}
