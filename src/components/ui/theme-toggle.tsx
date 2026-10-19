"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";

type Theme = "dark" | "light";

function subscribe(cb: () => void) {
  const obs = new MutationObserver(cb);
  obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => obs.disconnect();
}
const getTheme = (): Theme => (document.documentElement.dataset.theme === "light" ? "light" : "dark");

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, getTheme, () => "dark" as Theme);
  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("ignite-theme", next);
    } catch {}
  }
  return (
    <button
      type="button"
      onClick={toggle}
      className="flex w-full items-center justify-between rounded-2xl px-4 py-3.5 text-left hover:bg-surface-2"
    >
      <span className="flex items-center gap-3 text-[15px] font-medium">
        {theme === "dark" ? <Moon className="size-5 text-muted" /> : <Sun className="size-5 text-muted" />}
        Appearance
      </span>
      <span className="text-sm text-muted">{theme === "dark" ? "Dark" : "Light"}</span>
    </button>
  );
}
