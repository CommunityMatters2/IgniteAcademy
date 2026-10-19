import "server-only";
import { and, desc, eq, or, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { pointEvent, profile, user } from "@/db/schema";

export type LeaderRow = {
  userId: string;
  name: string;
  preferredName: string | null;
  avatarKey: string | null;
  showOnLeaderboard: boolean;
  points: number;
};

export async function getLeaderboard(month: string, limit = 50): Promise<LeaderRow[]> {
  const total = sql<number>`coalesce(sum(${pointEvent.points}), 0)::int`;
  const rows = await db
    .select({
      userId: user.id,
      name: user.name,
      preferredName: profile.preferredName,
      avatarKey: profile.avatarKey,
      showOnLeaderboard: profile.showOnLeaderboard,
      points: total,
    })
    .from(pointEvent)
    .innerJoin(user, eq(user.id, pointEvent.userId))
    .leftJoin(profile, eq(profile.userId, user.id))
    .where(and(eq(pointEvent.month, month), eq(user.role, "student"), or(eq(user.banned, false), isNull(user.banned))))
    .groupBy(user.id, user.name, profile.preferredName, profile.avatarKey, profile.showOnLeaderboard)
    .orderBy(desc(total))
    .limit(limit);
  return rows.map((r) => ({ ...r, showOnLeaderboard: r.showOnLeaderboard ?? true }));
}

export async function getUserMonthPoints(userId: string, month: string) {
  const [row] = await db
    .select({ points: sql<number>`coalesce(sum(${pointEvent.points}), 0)::int` })
    .from(pointEvent)
    .where(and(eq(pointEvent.userId, userId), eq(pointEvent.month, month)));
  return row?.points ?? 0;
}

export async function getUserTotalPoints(userId: string) {
  const [row] = await db
    .select({ points: sql<number>`coalesce(sum(${pointEvent.points}), 0)::int` })
    .from(pointEvent)
    .where(eq(pointEvent.userId, userId));
  return row?.points ?? 0;
}
