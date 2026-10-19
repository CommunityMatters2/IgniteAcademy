"use client";

import { Toaster as Sonner } from "sonner";

export function Toaster() {
  return (
    <Sonner
      position="top-center"
      theme="system"
      toastOptions={{
        classNames: {
          toast: "!rounded-2xl !border !border-border !bg-surface !text-fg !shadow-2xl !font-sans",
          description: "!text-muted",
        },
      }}
    />
  );
}
