import "server-only";
import { asc, count, eq } from "drizzle-orm";
import { db } from "@/db";
import { attendanceCheckin, badgeClaim, cohort, helpRequest, invite, profile, reportCard, user } from "@/db/schema";

export async function getStudents() {
  return db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      banned: user.banned,
      createdAt: user.createdAt,
      emailVerified: user.emailVerified,
      school: profile.school,
      gradeLevel: profile.gradeLevel,
      cohortId: profile.cohortId,
      avatarKey: profile.avatarKey,
      onboardedAt: profile.onboardedAt,
      birthday: profile.birthday,
      preferredName: profile.preferredName,
    })
    .from(user)
    .leftJoin(profile, eq(profile.userId, user.id))
    .orderBy(asc(user.name));
}

export async function getPendingCounts() {
  const [[cards], [checkins], [claims], [help]] = await Promise.all([
    db.select({ n: count() }).from(reportCard).where(eq(reportCard.status, "pending")),
    db.select({ n: count() }).from(attendanceCheckin).where(eq(attendanceCheckin.status, "pending")),
    db.select({ n: count() }).from(badgeClaim).where(eq(badgeClaim.status, "pending")),
    db.select({ n: count() }).from(helpRequest).where(eq(helpRequest.status, "open")),
  ]);
  return { cards: cards.n, checkins: checkins.n, claims: claims.n, help: help.n, total: cards.n + checkins.n + claims.n };
}

export async function getCohorts() {
  return db.select().from(cohort).orderBy(asc(cohort.name));
}

export async function getAcceptedInviteUserIds() {
  const rows = await db.select({ userId: invite.userId, acceptedAt: invite.acceptedAt }).from(invite);
  return new Set(rows.filter((r) => r.acceptedAt).map((r) => r.userId));
}
