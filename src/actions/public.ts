"use server";

import { and, eq, gt } from "drizzle-orm";
import { db } from "@/db";
import { counselorVerification, user } from "@/db/schema";
import { audit } from "@/lib/activity";
import type { ActionState } from "@/lib/utils";

/** Counselor submits a verification via a one-time tokenized link (no account). */
export async function submitVerificationAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const token = String(fd.get("token") ?? "");
  const yes = (k: string) => {
    const v = fd.get(k);
    return v === "yes" ? true : v === "no" ? false : null;
  };
  const enrolled = yes("enrolled");
  const attendanceGood = yes("attendanceGood");
  const passing = yes("passing");
  if (enrolled === null || attendanceGood === null || passing === null) return { error: "Please answer all three questions." };
  const name = String(fd.get("counselorName") ?? "").trim().slice(0, 100);
  if (!name) return { error: "Please add your name." };

  const v = await db.query.counselorVerification.findFirst({
    where: and(
      eq(counselorVerification.token, token),
      eq(counselorVerification.status, "sent"),
      gt(counselorVerification.expiresAt, new Date()),
    ),
  });
  if (!v) return { error: "This link is no longer valid." };

  await db
    .update(counselorVerification)
    .set({
      status: "completed",
      enrolled,
      attendanceGood,
      passing,
      counselorName: name,
      comments: String(fd.get("comments") ?? "").trim().slice(0, 1000) || null,
      respondedAt: new Date(),
    })
    .where(eq(counselorVerification.id, v.id));
  const student = await db.query.user.findFirst({ where: eq(user.id, v.userId) });
  await audit(null, "counselor.responded", { type: "user", id: v.userId }, { counselor: name, student: student?.name });
  return { ok: true };
}
