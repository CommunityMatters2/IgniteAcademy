import "server-only";
import { and, asc, count, desc, eq, gte, inArray, isNotNull, ne, or, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  announcement,
  attendanceCheckin,
  form,
  formResponse,
  profile,
  sessionSignup,
  tutorSession,
  user,
  userBadge,
} from "@/db/schema";
import { addDaysIso, daysUntilBirthday, weekOf, zonedToday } from "@/lib/dates";

/** Consecutive weeks (ending this week or last week) with a non-rejected check-in. */
export async function getCheckinStreak(userId: string) {
  const rows = await db
    .select({ weekOf: attendanceCheckin.weekOf })
    .from(attendanceCheckin)
    .where(and(eq(attendanceCheckin.userId, userId), ne(attendanceCheckin.status, "rejected")))
    .orderBy(desc(attendanceCheckin.weekOf))
    .limit(60);
  const weeks = new Set(rows.map((r) => r.weekOf));
  let cursor = weekOf(zonedToday().iso);
  if (!weeks.has(cursor)) cursor = addDaysIso(cursor, -7);
  let streak = 0;
  while (weeks.has(cursor)) {
    streak++;
    cursor = addDaysIso(cursor, -7);
  }
  return streak;
}

export async function getNextSignedUpSession(userId: string) {
  const [row] = await db
    .select({ s: tutorSession })
    .from(sessionSignup)
    .innerJoin(tutorSession, eq(tutorSession.id, sessionSignup.sessionId))
    .where(
      and(
        eq(sessionSignup.userId, userId),
        gte(tutorSession.startsAt, sql`now() - (${tutorSession.durationMin} * interval '1 minute')`),
      ),
    )
    .orderBy(asc(tutorSession.startsAt))
    .limit(1);
  return row?.s ?? null;
}

export async function getAnnouncements(limit = 3) {
  return db.select().from(announcement).orderBy(desc(announcement.pinned), desc(announcement.createdAt)).limit(limit);
}

export async function getBadgeCount(userId: string) {
  const [row] = await db.select({ n: count() }).from(userBadge).where(eq(userBadge.userId, userId));
  return row?.n ?? 0;
}

/** Published forms assigned to this student that they haven't submitted yet. */
export async function getOpenForms(userId: string, cohortId: string | null) {
  const audience = cohortId ? or(eq(form.audience, "all"), eq(form.audience, cohortId)) : eq(form.audience, "all");
  const forms = await db
    .select()
    .from(form)
    .where(and(eq(form.status, "published"), audience))
    .orderBy(asc(form.dueDate), desc(form.createdAt));
  if (!forms.length) return { open: [], done: [] };
  const responses = await db
    .select({ formId: formResponse.formId, submittedAt: formResponse.submittedAt })
    .from(formResponse)
    .where(and(eq(formResponse.userId, userId), inArray(formResponse.formId, forms.map((f) => f.id))));
  const doneIds = new Set(responses.map((r) => r.formId));
  return { open: forms.filter((f) => !doneIds.has(f.id)), done: forms.filter((f) => doneIds.has(f.id)) };
}

export type BirthdayPerson = {
  userId: string;
  name: string;
  preferredName: string | null;
  avatarKey: string | null;
  birthday: string;
  daysAway: number;
};

/** Active students with birthdays in the next `withinDays` days (0 = today). */
export async function getUpcomingBirthdays(withinDays = 7) {
  const rows = await db
    .select({
      userId: user.id,
      name: user.name,
      preferredName: profile.preferredName,
      avatarKey: profile.avatarKey,
      birthday: profile.birthday,
    })
    .from(profile)
    .innerJoin(user, eq(user.id, profile.userId))
    .where(and(isNotNull(profile.birthday), eq(user.role, "student"), or(eq(user.banned, false), sql`${user.banned} is null`)));
  const today = zonedToday().iso;
  return rows
    .map((r) => ({ ...r, birthday: r.birthday!, daysAway: daysUntilBirthday(r.birthday!, today) }))
    .filter((r) => r.daysAway <= withinDays)
    .sort((a, b) => a.daysAway - b.daysAway) as BirthdayPerson[];
}

export function isBirthdayToday(birthday: string | null | undefined) {
  if (!birthday) return false;
  return birthday.slice(5) === zonedToday().iso.slice(5);
}
