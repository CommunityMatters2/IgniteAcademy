"use client";

import { useEffect } from "react";
import confetti from "canvas-confetti";

const colors = ["#02BE62", "#FDDD5A", "#ffffff", "#00d66e"];

export function celebrate(intensity: "small" | "big" = "small") {
  if (typeof window === "undefined") return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const count = intensity === "big" ? 220 : 110;
  confetti({ particleCount: count, spread: 80, origin: { y: 0.7 }, colors, disableForReducedMotion: true });
  if (intensity === "big") {
    setTimeout(() => confetti({ particleCount: 90, angle: 60, spread: 60, origin: { x: 0 }, colors }), 250);
    setTimeout(() => confetti({ particleCount: 90, angle: 120, spread: 60, origin: { x: 1 }, colors }), 400);
  }
}

/** Fires once per day per key (e.g. on someone's birthday). */
export function ConfettiOnMount({ storageKey, intensity = "big" }: { storageKey: string; intensity?: "small" | "big" }) {
  useEffect(() => {
    try {
      if (sessionStorage.getItem(storageKey)) return;
      sessionStorage.setItem(storageKey, "1");
    } catch {}
    const t = setTimeout(() => celebrate(intensity), 400);
    return () => clearTimeout(t);
  }, [storageKey, intensity]);
  return null;
}
