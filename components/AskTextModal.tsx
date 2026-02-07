"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface AskTextModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (text: string) => void;
  placeholder?: string;
}

export function AskTextModal({
  open,
  onClose,
  onSubmit,
  placeholder = "Type your question…",
}: AskTextModalProps) {
  const [value, setValue] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const t = value.trim();
    if (t) {
      onSubmit(t);
      setValue("");
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-50 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed left-4 right-4 top-1/2 -translate-y-1/2 z-50 rounded-card border border-app-border bg-surface shadow-2xl p-4"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-heading-sm">Ask a question</h3>
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-button hover:bg-app-bg text-ink-primary"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-caption text-ink-secondary mb-3">
              Voice didn’t work? Type your question below.
            </p>
            <form onSubmit={handleSubmit}>
              <input
                type="text"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={placeholder}
                className={cn(
                  "w-full px-4 py-3 rounded-button bg-surface-muted border border-app-border",
                  "text-ink-primary placeholder-ink-tertiary focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary"
                )}
                autoFocus
              />
              <div className="flex gap-2 mt-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2.5 rounded-button bg-surface-muted border border-app-border text-ink-primary font-medium hover:bg-app-bg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!value.trim()}
                  className={cn(
                    "flex-1 py-2.5 rounded-button font-medium",
                    value.trim()
                      ? "bg-brand-primary text-white hover:bg-brand-primaryHover"
                      : "bg-app-border text-ink-tertiary cursor-not-allowed"
                  )}
                >
                  Send
                </button>
              </div>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
