import { format, startOfWeek } from "date-fns";

/** Program time zone (CM2 is US-based). Used for "today", birthdays and months. */
export const TZ = process.env.PROGRAM_TZ ?? "America/New_York";

/** Today's date parts in the program time zone. */
export function zonedToday(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)!.value;
  const y = Number(get("year"));
  const m = Number(get("month"));
  const d = Number(get("day"));
  return { y, m, d, iso: `${get("year")}-${get("month")}-${get("day")}` };
}

/** "YYYY-MM" for the program's current month. */
export function currentMonth(now = new Date()) {
  return zonedToday(now).iso.slice(0, 7);
}

export function monthLabel(month: string) {
  const [y, m] = month.split("-").map(Number);
  return format(new Date(y, m - 1, 1), "MMMM yyyy");
}

export function shiftMonth(month: string, delta: number) {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return format(d, "yyyy-MM");
}

/** Monday of the week containing `iso` (YYYY-MM-DD). */
export function weekOf(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return format(startOfWeek(new Date(y, m - 1, d), { weekStartsOn: 1 }), "yyyy-MM-dd");
}

export function addDaysIso(iso: string, days: number) {
  const [y, m, d] = iso.split("-").map(Number);
  return format(new Date(y, m - 1, d + days), "yyyy-MM-dd");
}

export function prettyDate(iso: string | Date, pattern = "MMM d, yyyy") {
  if (iso instanceof Date) return format(iso, pattern);
  const [y, m, d] = iso.split("-").map(Number);
  return format(new Date(y, m - 1, d), pattern);
}

/** Formats a timestamp in the program time zone. */
export function zonedDateTime(date: Date, opts: Intl.DateTimeFormatOptions = {}) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    ...opts,
  }).format(date);
}

/** Days until the next occurrence of a birthday (0 = today). */
export function daysUntilBirthday(birthday: string, todayIso: string) {
  const [, bm, bd] = birthday.split("-").map(Number);
  const [ty, tm, td] = todayIso.split("-").map(Number);
  const today = Date.UTC(ty, tm - 1, td);
  let next = Date.UTC(ty, bm - 1, bd);
  if (next < today) next = Date.UTC(ty + 1, bm - 1, bd);
  return Math.round((next - today) / 86_400_000);
}

export function ageOn(birthday: string, todayIso: string) {
  const [by, bm, bd] = birthday.split("-").map(Number);
  const [ty, tm, td] = todayIso.split("-").map(Number);
  return ty - by - (tm < bm || (tm === bm && td < bd) ? 1 : 0);
}

/** Current time (request-time helper for server components). */
export const nowMs = () => Date.now();
