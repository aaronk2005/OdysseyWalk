"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { Toast, type ToastType } from "./Toast";

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) return { showToast: () => {} };
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [message, setMessage] = useState("");
  const [type, setType] = useState<ToastType>("info");
  const [visible, setVisible] = useState(false);

  const showToast = useCallback((msg: string, t: ToastType = "info") => {
    setMessage(msg);
    setType(t);
    setVisible(true);
  }, []);

  const onDismiss = useCallback(() => setVisible(false), []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <Toast
        message={message}
        type={type}
        visible={visible}
        onDismiss={onDismiss}
      />
    </ToastContext.Provider>
  );
}
