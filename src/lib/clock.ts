import "server-only";
import { and, desc, eq, gte, isNull, lt, lte, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { clockSession } from "@/db/schema";
import { awardPoints } from "@/lib/activity";
import { addDaysIso, prettyDate, weekOf, zonedTime, zonedToday } from "@/lib/dates";
import type { ProgramSettings } from "@/lib/settings";

export type ClockRow = typeof clockSession.$inferSelect;

/** Great-circle distance in meters. */
export function distanceMeters(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6_371_000;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(lat2 - lat1);
  const dLng = rad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export type LocationCheck =
  | { ok: true; distanceM: number; accuracyM: number }
  | { ok: false; error: string };

/**
 * Checks a phone's reported position against the program site. GPS accuracy is allowed
 * as slack (capped at 100 m) so a weak indoor fix next to the building still counts.
 */
export function checkLocation(clock: ProgramSettings["clock"], lat: number, lng: number, accuracy: number): LocationCheck {
  if (clock.lat == null || clock.lng == null) {
    return { ok: false, error: "Clock-in isn't set up yet. Ask staff to add the program location." };
  }
  if (![lat, lng, accuracy].every(Number.isFinite) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return { ok: false, error: "We couldn't read your location. Try again." };
  }
  const distanceM = Math.round(distanceMeters(lat, lng, clock.lat, clock.lng));
  const accuracyM = Math.round(Math.max(0, accuracy));
  if (distanceM > clock.radiusM + Math.min(accuracyM, 100)) {
    const away = distanceM >= 1000 ? `${(distanceM / 1609).toFixed(1)} miles` : `${distanceM} m`;
    return { ok: false, error: `You need to be at ${clock.siteName} to clock in or out. You're about ${away} away.` };
  }
  return { ok: true, distanceM, accuracyM };
}

export function visitMinutes(row: Pick<ClockRow, "clockInAt" | "clockOutAt">, now = Date.now()) {
  const end = row.clockOutAt?.getTime() ?? now;
  return Math.max(0, (end - row.clockInAt.getTime()) / 60_000);
}

/** Today's open visit for a student, if any. */
export async function getOpenToday(userId: string) {
  return db.query.clockSession.findFirst({
    where: and(eq(clockSession.userId, userId), eq(clockSession.day, zonedToday().iso), isNull(clockSession.clockOutAt)),
  });
}

/** Open visits from before today ("forgot to clock out"). Pass userId to limit to one student. */
export async function getStaleOpen(userId?: string) {
  return db
    .select()
    .from(clockSession)
    .where(
      and(
        isNull(clockSession.clockOutAt),
        lt(clockSession.day, zonedToday().iso),
        userId ? eq(clockSession.userId, userId) : undefined,
      ),
    )
    .orderBy(desc(clockSession.clockInAt));
}

export async function getVisits(userId: string, limit = 20) {
  return db
    .select()
    .from(clockSession)
    .where(eq(clockSession.userId, userId))
    .orderBy(desc(clockSession.clockInAt))
    .limit(limit);
}

/** Completed minutes between two program dates (inclusive). Open visits don't count. */
export async function completedMinutes(userId: string, fromIso: string, toIso: string) {
  const [row] = await db
    .select({
      min: sql<number>`coalesce(sum(extract(epoch from (${clockSession.clockOutAt} - ${clockSession.clockInAt})) / 60), 0)`,
    })
    .from(clockSession)
    .where(
      and(
        eq(clockSession.userId, userId),
        gte(clockSession.day, fromIso),
        lte(clockSession.day, toIso),
        sql`${clockSession.clockOutAt} is not null`,
      ),
    );
  return Number(row?.min ?? 0);
}

export function thisWeekRange() {
  const start = weekOf(zonedToday().iso);
  return { start, end: addDaysIso(start, 6) };
}

/** Everything the student clock card needs. */
export async function getClockCardData(userId: string, settings: ProgramSettings) {
  const today = zonedToday().iso;
  const [open, stale, todayMin] = await Promise.all([
    getOpenToday(userId),
    getStaleOpen(userId),
    completedMinutes(userId, today, today),
  ]);
  return {
    openSince: open ? open.clockInAt.toISOString() : null,
    openSinceLabel: open ? zonedTime(open.clockInAt) : null,
    todayMinutes: Math.round(todayMin),
    siteName: settings.clock.siteName,
    available: settings.clock.enabled && settings.clock.lat != null && settings.clock.lng != null,
    staleDayLabel: stale[0] ? prettyDate(stale[0].day, "EEE, MMM d") : null,
    serverNow: Date.now(),
  };
}

/**
 * Awards the daily visit points for a completed visit when it's long enough and no other
 * visit that day already earned them. Returns the points given (0 if none).
 */
export async function maybeAwardVisitPoints(row: ClockRow, settings: ProgramSettings) {
  if (!row.clockOutAt || row.pointsAwarded > 0 || !settings.points.clockVisit) return 0;
  if (visitMinutes(row) < settings.clock.minMinutes) return 0;
  const already = await db.query.clockSession.findFirst({
    where: and(
      eq(clockSession.userId, row.userId),
      eq(clockSession.day, row.day),
      ne(clockSession.id, row.id),
      sql`${clockSession.pointsAwarded} > 0`,
    ),
  });
  if (already) return 0;
  const pts = settings.points.clockVisit;
  // Guarded update so two concurrent requests can't both award.
  const updated = await db
    .update(clockSession)
    .set({ pointsAwarded: pts })
    .where(and(eq(clockSession.id, row.id), eq(clockSession.pointsAwarded, 0)))
    .returning({ id: clockSession.id });
  if (!updated.length) return 0;
  await awardPoints(row.userId, pts, "Program visit", "clock");
  return pts;
}
