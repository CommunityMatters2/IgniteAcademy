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

/** Offset (ms) of the program time zone from UTC at `date`. */
function tzOffsetMs(date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);
  const get = (t: string) => Number(parts.find((p) => p.type === t)!.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return asUtc - Math.floor(date.getTime() / 1000) * 1000;
}

/** "YYYY-MM-DDTHH:mm" wall time in the program time zone → Date. Null if malformed. */
export function zonedWallToDate(local: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(local);
  if (!m) return null;
  const guess = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
  // Two passes handle the hour around daylight-saving changes.
  let ts = guess - tzOffsetMs(new Date(guess));
  ts = guess - tzOffsetMs(new Date(ts));
  return new Date(ts);
}

/** Date → "YYYY-MM-DDTHH:mm" in the program time zone (for datetime-local inputs). */
export function toZonedInput(date: Date) {
  const shifted = new Date(date.getTime() + tzOffsetMs(date));
  return shifted.toISOString().slice(0, 16);
}

/** "3:05 PM" in the program time zone. */
export function zonedTime(date: Date) {
  return new Intl.DateTimeFormat("en-US", { timeZone: TZ, hour: "numeric", minute: "2-digit" }).format(date);
}

/** 95 → "1h 35m", 40 → "40m". */
export function formatMinutes(min: number) {
  const m = Math.max(0, Math.round(min));
  const h = Math.floor(m / 60);
  return h ? `${h}h ${m % 60}m` : `${m}m`;
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
