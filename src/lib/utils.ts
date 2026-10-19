import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function firstName(name: string | null | undefined, preferred?: string | null) {
  return (preferred || name || "").trim().split(/\s+/)[0] || "Friend";
}

/** "Jordan Smith" → "Jordan S." (used on public leaderboards for minors' privacy) */
export function shortName(name: string, preferred?: string | null) {
  const parts = name.trim().split(/\s+/);
  const first = preferred?.trim() || parts[0];
  const last = parts.length > 1 ? `${parts[parts.length - 1][0]}.` : "";
  return `${first} ${last}`.trim();
}

export function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

export type ActionState = { ok?: boolean; error?: string; message?: string } | undefined;
