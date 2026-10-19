import "server-only";
import { db } from "@/db";
import { auditLog, notification, pointEvent } from "@/db/schema";
import { currentMonth } from "@/lib/dates";

export async function audit(
  actorId: string | null,
  action: string,
  target?: { type: string; id: string },
  meta?: Record<string, unknown>,
) {
  await db.insert(auditLog).values({
    actorId,
    action,
    targetType: target?.type,
    targetId: target?.id,
    meta,
  });
}

export async function notify(userId: string, title: string, body?: string, href?: string) {
  await db.insert(notification).values({ userId, title, body, href });
}

export async function awardPoints(userId: string, points: number, reason: string, source: string) {
  if (!points) return;
  await db.insert(pointEvent).values({ userId, points, reason, source, month: currentMonth() });
}
