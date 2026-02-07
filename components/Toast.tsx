"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils/cn";

export type ToastType = "success" | "error" | "info";

interface ToastProps {
  message: string;
  type?: ToastType;
  visible: boolean;
  onDismiss: () => void;
  duration?: number;
}

export function Toast({
  message,
  type = "info",
  visible,
  onDismiss,
  duration = 4000,
}: ToastProps) {
  useEffect(() => {
    if (!visible || duration <= 0) return;
    const t = setTimeout(onDismiss, duration);
    return () => clearTimeout(t);
  }, [visible, duration, onDismiss]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className={cn(
            "fixed left-4 right-4 bottom-24 z-50 mx-auto max-w-md rounded-card px-4 py-3 shadow-lg border",
            type === "success" && "bg-emerald-50 border-emerald-200 text-emerald-800",
            type === "error" && "bg-red-50 border-red-200 text-red-800",
            type === "info" && "bg-surface border-app-border text-ink-primary"
          )}
        >
          {message}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
