"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

/**
 * First-time hint: shows a coach mark once, dismissible, stored in localStorage.
 */
export interface FirstTimeHintProps {
  storageKey: string;
  message: string;
  position?: "top" | "bottom";
}

export function FirstTimeHint({ storageKey, message, position = "bottom" }: FirstTimeHintProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const seen = localStorage.getItem(storageKey);
    if (!seen) {
      setVisible(true);
    }
  }, [storageKey]);

  const handleDismiss = () => {
    setVisible(false);
    if (typeof window !== "undefined") {
      localStorage.setItem(storageKey, "true");
    }
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: position === "bottom" ? 20 : -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: position === "bottom" ? 20 : -20 }}
          transition={{ type: "spring", damping: 20, stiffness: 200 }}
          className={`absolute left-4 right-4 z-50 ${position === "bottom" ? "bottom-24" : "top-24"}`}
        >
          <div className="max-w-sm mx-auto rounded-2xl bg-brand-primary text-white shadow-lg p-4 flex items-start gap-3">
            <p className="flex-1 text-sm font-medium leading-relaxed">{message}</p>
            <button
              type="button"
              onClick={handleDismiss}
              className="shrink-0 p-1 hover:bg-white/20 rounded-full transition-colors"
              aria-label="Dismiss hint"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
