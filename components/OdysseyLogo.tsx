"use client";

import NextImage from "next/image";
import { cn } from "@/lib/utils/cn";

const HEADER_LOGO_SIZES = {
  sm: { height: 28, class: "h-7" },
  md: { height: 32, class: "h-8" },
  lg: { height: 40, class: "h-10" },
} as const;

/**
 * Odyssey Walk header logo (horizontal lockup). Use in nav/headers.
 * Renders /brand/odyssey-header.png with size-controlled height; width scales to preserve aspect ratio.
 * Wrap in <Link href="/"> when the logo should be clickable.
 */
export function OdysseyLogo({
  className,
  size = "md",
  priority = false,
}: {
  className?: string;
  size?: "sm" | "md" | "lg";
  /** Set true when logo is above the fold (e.g. landing header) */
  priority?: boolean;
}) {
  const { height, class: sizeClass } = HEADER_LOGO_SIZES[size];

  return (
    <NextImage
      src="/brand/odyssey-header.png"
      alt="Odyssey Walk"
      width={height * 4}
      height={height}
      className={cn("h-full w-auto object-contain shrink-0", sizeClass, className)}
      priority={priority}
    />
  );
}

/**
 * Square mark only (e.g. for app icon, social, or compact UI).
 * Use when you need the icon without the wordmark.
 */
export function OdysseyMark({
  className,
  size = 40,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <NextImage
      src="/brand/odyssey-mark.png"
      alt="Odyssey Walk"
      width={size}
      height={size}
      className={cn("shrink-0 object-contain", className)}
    />
  );
}
