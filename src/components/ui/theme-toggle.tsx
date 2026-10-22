"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

type Theme = "dark" | "light";

function subscribe(cb: () => void) {
  const obs = new MutationObserver(cb);
  obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => obs.disconnect();
}
const getTheme = (): Theme => (document.documentElement.dataset.theme === "light" ? "light" : "dark");

/** dark = sits on the dark sidebar panel. */
export function ThemeToggle({ dark }: { dark?: boolean } = {}) {
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
      className={cn(
        "flex w-full items-center justify-between rounded-2xl text-left",
        dark ? "px-3 py-2.5 text-nav-fg hover:bg-nav-hover" : "px-4 py-3.5 hover:bg-surface-2",
      )}
    >
      <span className={cn("flex items-center gap-3 font-medium", dark ? "text-sm" : "text-[15px]")}>
        {theme === "dark" ? <Moon className={cn("size-5", dark ? "text-nav-muted" : "text-muted")} /> : <Sun className="size-5 text-gold" />}
        Appearance
      </span>
      <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", dark ? "bg-nav-hover text-nav-muted" : "bg-surface-2 text-muted")}>{theme === "dark" ? "Dark" : "Light"}</span>
    </button>
  );
}
