"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, MapPin, Sparkles, Route } from "lucide-react";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

/**
 * Generating steps animation: shows step-by-step progress so waiting feels purposeful.
 */
const STEPS = [
  { id: 1, label: "Finding stops...", icon: MapPin, duration: 2000 },
  { id: 2, label: "Writing narration...", icon: Sparkles, duration: 3000 },
  { id: 3, label: "Building route...", icon: Route, duration: 2000 },
];

export function GeneratingSteps() {
  const [currentStep, setCurrentStep] = useState(0);
  const prefersReducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    if (currentStep >= STEPS.length) return;
    const timer = setTimeout(() => {
      setCurrentStep((s) => s + 1);
    }, STEPS[currentStep].duration);
    return () => clearTimeout(timer);
  }, [currentStep]);

  const step = STEPS[currentStep] || STEPS[STEPS.length - 1];
  const Icon = step.icon;

  return (
    <div className="flex flex-col items-center gap-4 py-8">
      <div className="relative">
        <Loader2 className={`w-12 h-12 text-brand-primary ${prefersReducedMotion ? "" : "animate-spin"}`} />
        <AnimatePresence mode="wait">
          <motion.div
            key={step.id}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <Icon className="w-5 h-5 text-white" />
          </motion.div>
        </AnimatePresence>
      </div>
      <AnimatePresence mode="wait">
        <motion.p
          key={step.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.25 }}
          className="text-base font-medium text-ink-primary"
        >
          {step.label}
        </motion.p>
      </AnimatePresence>
      <div className="flex gap-1.5">
        {STEPS.map((s, i) => (
          <div
            key={s.id}
            className={`h-1 w-6 rounded-full transition-colors duration-300 ${
              i <= currentStep ? "bg-brand-primary" : "bg-app-border"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
