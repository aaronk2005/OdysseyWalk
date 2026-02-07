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
            "fixed left-4 right-4 bottom-24 z-50 mx-auto max-w-md rounded-xl px-4 py-3 shadow-lg backdrop-blur",
            type === "success" && "bg-emerald-500/20 border border-emerald-400/30 text-emerald-200",
            type === "error" && "bg-red-500/20 border border-red-400/30 text-red-200",
            type === "info" && "bg-white/10 border border-white/20 text-white"
          )}
        >
          {message}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
