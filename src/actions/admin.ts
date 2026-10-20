"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, inArray, ne, or, isNull } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import {
  announcement,
  attendanceCheckin,
  badge,
  badgeClaim,
  birthdayWish,
  clockSession,
  cohort,
  counselorVerification,
  form,
  helpRequest,
  idea,
  profile,
  reportCard,
  scholarOfMonth,
  sessionSignup,
  term,
  tutorSession,
  user,
  userBadge,
  type FormField,
} from "@/db/schema";
import { auth } from "@/lib/auth";
import { audit, awardPoints, notify } from "@/lib/activity";
import { sendEmail, sendEmailToMany, trySendEmail } from "@/lib/email";
import { appUrl } from "@/lib/env";
import { inviteUser, resendInvite } from "@/lib/invites";
import { requireAdmin, requireStaff, type Role } from "@/lib/session";
import { getSettings, saveSettings, type ProgramSettings } from "@/lib/settings";
import { monthLabel, prettyDate, zonedToday, zonedWallToDate } from "@/lib/dates";
import { maybeAwardVisitPoints } from "@/lib/clock";
import { deleteStoredFile } from "@/lib/storage";
import type { ActionState } from "@/lib/utils";

const str = (v: FormDataEntryValue | null) => (typeof v === "string" ? v.trim() : "");
const opt = (v: FormDataEntryValue | null) => str(v) || null;
const ROLES = ["student", "tutor", "admin"] as const;

async function studentEmail(userId: string) {
  const u = await db.query.user.findFirst({ where: eq(user.id, userId) });
  return u ? { email: u.email, first: u.name.split(" ")[0], name: u.name } : null;
}

/* ───────────────────────── Users ───────────────────────── */

export async function inviteUserAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const { user: me } = await requireAdmin();
  const parsed = z
    .object({
      name: z.string().trim().min(2, "Enter their full name."),
      email: z.string().trim().email("Enter a valid email."),
      role: z.enum(ROLES),
    })
    .safeParse({ name: fd.get("name"), email: fd.get("email"), role: fd.get("role") || "student" });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const res = await inviteUser({ ...parsed.data, cohortId: opt(fd.get("cohortId")), createdBy: me.id });
  if (!res.ok) return { error: res.error };
  await audit(me.id, "user.invite", { type: "user", id: res.userId }, { email: parsed.data.email, role: parsed.data.role });
  revalidatePath("/admin/users");
  return {
    ok: true,
    message: res.emailed ? `Invite emailed to ${parsed.data.email}.` : `Account created. Email not delivered — share this link: ${res.link}`,
  };
}

export async function bulkInviteAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const { user: me } = await requireAdmin();
  const lines = str(fd.get("csv"))
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .filter((l) => !/^name\s*,\s*email/i.test(l));
  if (!lines.length) return { error: "Paste at least one line: Full Name, email" };
  if (lines.length > 200) return { error: "Max 200 at a time." };
  const cohortId = opt(fd.get("cohortId"));
  let ok = 0;
  const problems: string[] = [];
  for (const line of lines) {
    const [name, email] = line.split(/[,\t;]/).map((s) => s?.trim());
    if (!name || !email || !z.string().email().safeParse(email).success) {
      problems.push(`“${line}” (format)`);
      continue;
    }
    const res = await inviteUser({ name, email, role: "student", cohortId, createdBy: me.id });
    if (res.ok) ok++;
    else problems.push(`${email} (${res.error})`);
  }
  await audit(me.id, "user.bulk_invite", undefined, { count: ok });
  revalidatePath("/admin/users");
  if (problems.length) return { ok: ok > 0, error: `Invited ${ok}. Skipped: ${problems.slice(0, 5).join("; ")}${problems.length > 5 ? "…" : ""}` };
  return { ok: true, message: `Invited ${ok} student${ok === 1 ? "" : "s"}. 🎉` };
}

export async function resendInviteAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const { user: me } = await requireAdmin();
  const userId = str(fd.get("userId"));
  const res = await resendInvite(userId, me.id);
  if (!res.ok) return { error: res.error };
  await audit(me.id, "user.reinvite", { type: "user", id: userId });
  return { ok: true, message: res.emailed ? "New invite sent." : `Email not delivered — share this link: ${res.link}` };
}

export async function sendResetAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const { user: me } = await requireAdmin();
  const target = await studentEmail(str(fd.get("userId")));
  if (!target) return { error: "User not found." };
  await auth.api.requestPasswordReset({ body: { email: target.email }, headers: await headers() });
  await audit(me.id, "user.password_reset_sent", { type: "user", id: str(fd.get("userId")) });
  return { ok: true, message: `Reset link sent to ${target.email}.` };
}

export async function updateUserAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const { user: me } = await requireAdmin();
  const userId = str(fd.get("userId"));
  const role = str(fd.get("role")) as Role;
  if (!ROLES.includes(role)) return { error: "Invalid role." };
  if (userId === me.id && role !== "admin") return { error: "You can't remove your own admin role." };
  const name = str(fd.get("name"));
  await db
    .update(user)
    .set({ role, ...(name.length >= 2 ? { name } : {}), updatedAt: new Date() })
    .where(eq(user.id, userId));
  const override = str(fd.get("eligibilityOverride"));
  await db
    .insert(profile)
    .values({ userId })
    .onConflictDoNothing();
  await db
    .update(profile)
    .set({
      cohortId: opt(fd.get("cohortId")),
      eligibilityOverride: override === "eligible" || override === "on_hold" ? override : null,
      updatedAt: new Date(),
    })
    .where(eq(profile.userId, userId));
  await audit(me.id, "user.update", { type: "user", id: userId }, { role, override: override || null });
  revalidatePath("/admin", "layout");
  return { ok: true, message: "Saved." };
}

export async function banUserAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const { user: me } = await requireAdmin();
  const userId = str(fd.get("userId"));
  if (userId === me.id) return { error: "You can't pause your own account." };
  await auth.api.banUser({
    body: { userId, banReason: opt(fd.get("reason")) ?? undefined },
    headers: await headers(),
  });
  await audit(me.id, "user.pause", { type: "user", id: userId }, { reason: opt(fd.get("reason")) });
  revalidatePath("/admin", "layout");
  return { ok: true, message: "Account paused and signed out everywhere." };
}

export async function unbanUserAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const { user: me } = await requireAdmin();
  const userId = str(fd.get("userId"));
  await auth.api.unbanUser({ body: { userId }, headers: await headers() });
  await audit(me.id, "user.unpause", { type: "user", id: userId });
  revalidatePath("/admin", "layout");
  return { ok: true, message: "Account re-activated." };
}

export async function removeUserAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const { user: me } = await requireAdmin();
  const userId = str(fd.get("userId"));
  if (userId === me.id) return { error: "You can't delete yourself." };
  if (str(fd.get("confirm")).toUpperCase() !== "DELETE") return { error: "Type DELETE to confirm." };
  const target = await studentEmail(userId);
  // Remove their private uploads too (minors' documents shouldn't linger).
  const [cards, checks, claims, prof] = await Promise.all([
    db.select({ k: reportCard.fileKey }).from(reportCard).where(eq(reportCard.userId, userId)),
    db.select({ k: attendanceCheckin.proofKey }).from(attendanceCheckin).where(eq(attendanceCheckin.userId, userId)),
    db.select({ k: badgeClaim.proofKey }).from(badgeClaim).where(eq(badgeClaim.userId, userId)),
    db.select({ k: profile.avatarKey }).from(profile).where(eq(profile.userId, userId)),
  ]);
  await Promise.all([...cards, ...checks, ...claims, ...prof].map((r) => deleteStoredFile(r.k)));
  await auth.api.removeUser({ body: { userId }, headers: await headers() });
  await audit(me.id, "user.delete", { type: "user", id: userId }, { email: target?.email });
  redirect("/admin/users");
}

export async function impersonateAction(fd: FormData) {
  const { user: me } = await requireAdmin();
  const userId = str(fd.get("userId"));
  await auth.api.impersonateUser({ body: { userId }, headers: await headers() });
  await audit(me.id, "user.impersonate", { type: "user", id: userId });
  redirect("/home");
}

export async function stopImpersonatingAction() {
  await auth.api.stopImpersonating({ headers: await headers() });
  redirect("/admin/users");
}

export async function adjustPointsAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const { user: me } = await requireAdmin();
  const userId = str(fd.get("userId"));
  const points = Number(str(fd.get("points")));
  const reason = str(fd.get("reason"));
  if (!Number.isInteger(points) || points === 0 || Math.abs(points) > 500) return { error: "Enter a whole number (±500)." };
  if (!reason) return { error: "Add a reason." };
  await awardPoints(userId, points, reason, "manual");
  if (points > 0) await notify(userId, `+${points} points ⭐`, reason, "/leaderboard");
  await audit(me.id, "points.adjust", { type: "user", id: userId }, { points, reason });
  revalidatePath("/admin", "layout");
  return { ok: true, message: `${points > 0 ? "+" : ""}${points} points recorded.` };
}

/* ───────────────────────── Reviews ───────────────────────── */

const decisionSchema = z.enum(["approved", "rejected"]);

async function reviewMeta(fd: FormData) {
  const decision = decisionSchema.parse(fd.get("decision"));
  const note = opt(fd.get("note"));
  if (decision === "rejected" && !note) throw new Error("Add a short note so the student knows what to fix.");
  return { decision, note };
}

export async function reviewReportCardAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const { user: me } = await requireAdmin();
  let meta;
  try {
    meta = await reviewMeta(fd);
  } catch (e) {
    return { error: (e as Error).message };
  }
  const id = str(fd.get("id"));
  const card = await db.query.reportCard.findFirst({ where: eq(reportCard.id, id) });
  if (!card) return { error: "Not found." };
  const passingField = str(fd.get("allPassing"));
  const allPassing = passingField === "yes" ? true : passingField === "no" ? false : card.allPassing;
  await db
    .update(reportCard)
    .set({ status: meta.decision, reviewNote: meta.note, reviewedBy: me.id, reviewedAt: new Date(), allPassing })
    .where(eq(reportCard.id, id));

  const target = await studentEmail(card.userId);
  if (meta.decision === "approved" && card.status !== "approved") {
    const s = await getSettings();
    await awardPoints(card.userId, s.points.reportCard, "Report card approved", "report_card");
    if (allPassing) await awardPoints(card.userId, s.points.allPassing, "Passing every class", "report_card");
    await notify(card.userId, "Report card approved ✅", meta.note ?? "Nice work — points added!", "/school");
  } else if (meta.decision === "rejected") {
    await notify(card.userId, "Report card needs another look", meta.note ?? undefined, "/school");
  }
  if (target)
    await trySendEmail({
      to: target.email,
      subject: meta.decision === "approved" ? "Your report card was approved ✅" : "Your report card needs another upload",
      preview: meta.note ?? "Open IGNITE for details.",
      heading: meta.decision === "approved" ? `Nice work, ${target.first}!` : `Quick fix needed, ${target.first}`,
      paragraphs:
        meta.decision === "approved"
          ? ["Your report card was approved and points were added to your Scholar of the Month total.", ...(meta.note ? [`Staff note: ${meta.note}`] : [])]
          : [`Staff note: ${meta.note}`, "Please upload a clearer or updated copy in the School tab."],
      cta: { label: "Open School", href: `${appUrl()}/school` },
    });
  await audit(me.id, `report_card.${meta.decision}`, { type: "report_card", id }, { note: meta.note });
  revalidatePath("/admin", "layout");
  return { ok: true, message: meta.decision === "approved" ? "Approved." : "Sent back to student." };
}

export async function reviewCheckinAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const { user: me } = await requireAdmin();
  let meta;
  try {
    meta = await reviewMeta(fd);
  } catch (e) {
    return { error: (e as Error).message };
  }
  const id = str(fd.get("id"));
  const c = await db.query.attendanceCheckin.findFirst({ where: eq(attendanceCheckin.id, id) });
  if (!c) return { error: "Not found." };
  await db
    .update(attendanceCheckin)
    .set({ status: meta.decision, reviewNote: meta.note, reviewedBy: me.id, reviewedAt: new Date() })
    .where(eq(attendanceCheckin.id, id));
  if (meta.decision === "approved" && c.status !== "approved") {
    const s = await getSettings();
    await awardPoints(c.userId, s.points.checkin, `Attendance week of ${prettyDate(c.weekOf, "MMM d")}`, "checkin");
    if (c.daysLate === 0) await awardPoints(c.userId, s.points.onTimeWeek, "On time all week", "checkin");
    await notify(c.userId, "Check-in approved 🔥", `Week of ${prettyDate(c.weekOf, "MMM d")}`, "/school#attendance");
  } else if (meta.decision === "rejected") {
    await notify(c.userId, "Check-in needs another look", meta.note ?? undefined, "/school#attendance");
  }
  await audit(me.id, `checkin.${meta.decision}`, { type: "checkin", id }, { note: meta.note });
  revalidatePath("/admin", "layout");
  return { ok: true, message: meta.decision === "approved" ? "Approved." : "Sent back." };
}

async function grantBadge(userId: string, badgeId: string, awardedBy: string, note: string | null) {
  const b = await db.query.badge.findFirst({ where: eq(badge.id, badgeId) });
  if (!b) throw new Error("Badge not found.");
  await db.insert(userBadge).values({ userId, badgeId, awardedBy, note });
  await awardPoints(userId, b.points, `Badge: ${b.name}`, "badge");
  await notify(userId, `You earned a badge: ${b.emoji} ${b.name}`, note ?? b.description, "/awards");
  const target = await studentEmail(userId);
  if (target)
    await trySendEmail({
      to: target.email,
      subject: `${b.emoji} You earned the “${b.name}” badge!`,
      preview: b.description,
      heading: `${b.emoji} Badge unlocked, ${target.first}!`,
      paragraphs: [`You earned “${b.name}”: ${b.description}`, `+${b.points} points toward Scholar of the Month.`],
      cta: { label: "See your trophy case", href: `${appUrl()}/awards` },
      accent: "gold",
    });
  return b;
}

export async function reviewClaimAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const { user: me } = await requireAdmin();
  let meta;
  try {
    meta = await reviewMeta(fd);
  } catch (e) {
    return { error: (e as Error).message };
  }
  const id = str(fd.get("id"));
  const c = await db.query.badgeClaim.findFirst({ where: eq(badgeClaim.id, id) });
  if (!c || c.status !== "pending") return { error: "This claim was already reviewed." };
  await db
    .update(badgeClaim)
    .set({ status: meta.decision, reviewNote: meta.note, reviewedBy: me.id, reviewedAt: new Date() })
    .where(eq(badgeClaim.id, id));
  if (meta.decision === "approved") await grantBadge(c.userId, c.badgeId, me.id, meta.note);
  else await notify(c.userId, "Badge claim not approved yet", meta.note ?? undefined, "/awards");
  await audit(me.id, `badge_claim.${meta.decision}`, { type: "badge_claim", id });
  revalidatePath("/admin", "layout");
  return { ok: true, message: meta.decision === "approved" ? "Badge awarded! ⭐" : "Claim declined." };
}

export async function awardBadgeAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const { user: me } = await requireAdmin();
  const userId = str(fd.get("userId"));
  const badgeId = str(fd.get("badgeId"));
  if (!userId || !badgeId) return { error: "Pick a student and a badge." };
  const b = await grantBadge(userId, badgeId, me.id, opt(fd.get("note")));
  await audit(me.id, "badge.award", { type: "user", id: userId }, { badge: b.slug });
  revalidatePath("/admin", "layout");
  return { ok: true, message: `${b.emoji} ${b.name} awarded.` };
}

export async function saveBadgeAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const { user: me } = await requireAdmin();
  const name = str(fd.get("name"));
  const description = str(fd.get("description"));
  if (name.length < 2 || description.length < 3) return { error: "Add a name and description." };
  const values = {
    name,
    description,
    emoji: str(fd.get("emoji")) || "⭐",
    color: ["gold", "green", "blue", "purple"].includes(str(fd.get("color"))) ? str(fd.get("color")) : "gold",
    points: Math.max(0, Math.min(500, Number(str(fd.get("points"))) || 0)),
    claimable: fd.get("claimable") === "on",
    active: fd.get("active") !== null ? fd.get("active") === "on" : true,
  };
  const id = str(fd.get("id"));
  if (id) await db.update(badge).set(values).where(eq(badge.id, id));
  else
    await db.insert(badge).values({
      ...values,
      slug: `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${crypto.randomUUID().slice(0, 4)}`,
    });
  await audit(me.id, id ? "badge.update" : "badge.create", id ? { type: "badge", id } : undefined, { name });
  revalidatePath("/admin/awards");
  return { ok: true, message: "Badge saved." };
}

/* ───────────────────────── Counselor verification ───────────────────────── */

export async function sendCounselorVerificationAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const { user: me } = await requireAdmin();
  const userId = str(fd.get("userId"));
  const [p, u] = await Promise.all([
    db.query.profile.findFirst({ where: eq(profile.userId, userId) }),
    db.query.user.findFirst({ where: eq(user.id, userId) }),
  ]);
  if (!p?.counselorEmail || !u) return { error: "This student has no counselor email on file." };
  const token = Buffer.from(crypto.getRandomValues(new Uint8Array(24))).toString("base64url");
  await db.insert(counselorVerification).values({
    userId,
    token,
    counselorName: p.counselorName,
    counselorEmail: p.counselorEmail,
    createdBy: me.id,
    expiresAt: new Date(Date.now() + 21 * 86_400_000),
  });
  const res = await sendEmail({
    to: p.counselorEmail,
    subject: `Quick verification for ${u.name} — IGNITE Academy`,
    preview: "Three yes/no questions. Takes 30 seconds.",
    heading: `Hello${p.counselorName ? ` ${p.counselorName}` : ""},`,
    paragraphs: [
      `${u.name} is a participant in IGNITE Academy, a youth program run by Community Matters 2. To stay in the program, students must be enrolled, attending on time, and passing their classes.`,
      "Could you confirm their status? It's three quick questions — no account or login needed.",
    ],
    cta: { label: "Verify student status", href: `${appUrl()}/verify/${token}` },
    footnote: "This secure link expires in 21 days. Questions? Reply to this email.",
  });
  await audit(me.id, "counselor.request", { type: "user", id: userId }, { to: p.counselorEmail });
  revalidatePath(`/admin/users/${userId}`);
  if (!res.ok || "dev" in res) return { ok: true, message: `Created. Email not delivered — link: ${appUrl()}/verify/${token}` };
  return { ok: true, message: `Verification request sent to ${p.counselorEmail}.` };
}

/* ───────────────────────── Help center ───────────────────────── */

export async function saveSessionAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const { user: me } = await requireStaff();
  const parsed = z
    .object({
      title: z.string().trim().min(2, "Add a title."),
      subject: z.string().trim().min(2, "Add a subject."),
      startsAt: z.string().min(1, "Pick a date and time."),
      durationMin: z.coerce.number().int().min(15).max(240),
      meetingUrl: z.string().trim().url("Meeting link must be a full URL (https://…).").or(z.literal("")),
      capacity: z.coerce.number().int().min(0).max(500),
      repeatWeeks: z.coerce.number().int().min(1).max(16),
    })
    .safeParse({
      title: fd.get("title"),
      subject: fd.get("subject"),
      startsAt: fd.get("startsAt"),
      durationMin: fd.get("durationMin") || 60,
      meetingUrl: fd.get("meetingUrl") ?? "",
      capacity: fd.get("capacity") || 0,
      repeatWeeks: fd.get("repeatWeeks") || 1,
    });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  // datetime-local has no zone; the browser sends its UTC offset alongside.
  const offset = Number(str(fd.get("tzOffset")) || "0");
  const base = new Date(`${parsed.data.startsAt}:00Z`).getTime() + offset * 60_000;
  if (Number.isNaN(base)) return { error: "Invalid date." };
  const common = {
    title: parsed.data.title,
    subject: parsed.data.subject,
    durationMin: parsed.data.durationMin,
    meetingUrl: parsed.data.meetingUrl || null,
    capacity: parsed.data.capacity || null,
    tutorName: opt(fd.get("tutorName")),
    provider: opt(fd.get("provider")) ?? "ORBIT",
    description: opt(fd.get("description")),
  };
  const id = str(fd.get("id"));
  if (id) {
    await db.update(tutorSession).set({ ...common, startsAt: new Date(base) }).where(eq(tutorSession.id, id));
  } else {
    await db.insert(tutorSession).values(
      Array.from({ length: parsed.data.repeatWeeks }, (_, i) => ({
        ...common,
        startsAt: new Date(base + i * 7 * 86_400_000),
        createdBy: me.id,
      })),
    );
  }
  await audit(me.id, id ? "session.update" : "session.create", id ? { type: "session", id } : undefined, {
    title: common.title,
    repeat: parsed.data.repeatWeeks,
  });
  revalidatePath("/admin/sessions");
  return { ok: true, message: id ? "Session updated." : `Created ${parsed.data.repeatWeeks} session(s).` };
}

export async function deleteSessionAction(fd: FormData) {
  const { user: me } = await requireStaff();
  const id = str(fd.get("id"));
  await db.delete(tutorSession).where(eq(tutorSession.id, id));
  await audit(me.id, "session.delete", { type: "session", id });
  redirect("/admin/sessions");
}

export async function markAttendanceAction(fd: FormData) {
  const { user: me } = await requireStaff();
  const sessionId = str(fd.get("sessionId"));
  const userId = str(fd.get("userId"));
  const attended = str(fd.get("attended")) === "yes";
  const row = await db.query.sessionSignup.findFirst({
    where: and(eq(sessionSignup.sessionId, sessionId), eq(sessionSignup.userId, userId)),
  });
  if (!row) return;
  await db
    .update(sessionSignup)
    .set({ attended })
    .where(and(eq(sessionSignup.sessionId, sessionId), eq(sessionSignup.userId, userId)));
  if (attended && row.attended !== true) {
    const s = await getSettings();
    const session = await db.query.tutorSession.findFirst({ where: eq(tutorSession.id, sessionId) });
    await awardPoints(userId, s.points.tutoring, `Tutoring: ${session?.title ?? "session"}`, "tutoring");
  }
  await audit(me.id, "session.attendance", { type: "session", id: sessionId }, { userId, attended });
  revalidatePath(`/admin/sessions/${sessionId}`);
}

export async function resolveHelpRequestAction(fd: FormData) {
  const { user: me } = await requireStaff();
  const id = str(fd.get("id"));
  await db.update(helpRequest).set({ status: "resolved" }).where(eq(helpRequest.id, id));
  await audit(me.id, "help_request.resolve", { type: "help_request", id });
  revalidatePath("/admin/sessions");
}

/* ───────────────────────── Scholar of the month ───────────────────────── */

export async function crownScholarAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const { user: me } = await requireAdmin();
  const month = str(fd.get("month"));
  const userId = str(fd.get("userId"));
  if (!/^\d{4}-\d{2}$/.test(month) || !userId) return { error: "Pick a student." };
  const note = opt(fd.get("note"));
  await db
    .insert(scholarOfMonth)
    .values({ month, userId, note, crownedBy: me.id })
    .onConflictDoUpdate({ target: scholarOfMonth.month, set: { userId, note, crownedBy: me.id, createdAt: new Date() } });
  const target = await studentEmail(userId);
  if (fd.get("announce") === "on" && target) {
    await db.insert(announcement).values({
      title: `👑 ${monthLabel(month)} Scholar of the Month: ${target.name.split(" ")[0]} ${target.name.split(" ").slice(-1)[0][0]}.`,
      body: note ?? "Congratulations on an incredible month! Keep shining. 🔥",
      pinned: true,
      createdBy: me.id,
    });
  }
  await notify(userId, `👑 You're ${monthLabel(month)} Scholar of the Month!`, note ?? undefined, "/leaderboard");
  if (target)
    await trySendEmail({
      to: target.email,
      subject: `👑 You're the IGNITE Scholar of the Month!`,
      preview: `${monthLabel(month)} — congratulations!`,
      heading: `Congratulations, ${target.first}! 👑`,
      paragraphs: [
        `You've been named IGNITE Academy's Scholar of the Month for ${monthLabel(month)}.`,
        note ?? "Your hard work in school and at IGNITE did not go unnoticed. We're so proud of you.",
      ],
      cta: { label: "See the leaderboard", href: `${appUrl()}/leaderboard` },
      accent: "gold",
    });
  await audit(me.id, "scholar.crown", { type: "user", id: userId }, { month });
  revalidatePath("/admin", "layout");
  return { ok: true, message: "Crowned! 👑" };
}

/* ───────────────────────── Ideas ───────────────────────── */

export async function updateIdeaAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const { user: me } = await requireAdmin();
  const id = str(fd.get("id"));
  const status = z.enum(["new", "reviewing", "planned", "done", "declined"]).parse(fd.get("status"));
  const row = await db.query.idea.findFirst({ where: eq(idea.id, id) });
  if (!row) return { error: "Not found." };
  await db.update(idea).set({ status, adminNote: opt(fd.get("adminNote")) }).where(eq(idea.id, id));
  if (status === "done" && row.status !== "done") {
    const s = await getSettings();
    await awardPoints(row.userId, s.points.ideaShipped, `Idea shipped: ${row.title}`, "idea");
    await notify(row.userId, "Your idea is happening! 💡", row.title, "/voice");
  } else if (status !== row.status) {
    await notify(row.userId, `Idea update: ${status}`, row.title, "/voice");
  }
  await audit(me.id, "idea.update", { type: "idea", id }, { status });
  revalidatePath("/admin/ideas");
  return { ok: true, message: "Idea updated." };
}

export async function deleteIdeaAction(fd: FormData) {
  const { user: me } = await requireAdmin();
  const id = str(fd.get("id"));
  await db.delete(idea).where(eq(idea.id, id));
  await audit(me.id, "idea.delete", { type: "idea", id });
  revalidatePath("/admin/ideas");
}

/* ───────────────────────── Forms ───────────────────────── */

const fieldSchema = z.object({
  id: z.string().min(1),
  type: z.enum(["text", "textarea", "choice", "checkbox", "date"]),
  label: z.string().trim().min(1, "Every field needs a label."),
  required: z.boolean(),
  options: z.array(z.string().trim().min(1)).optional(),
});

export async function saveFormAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const { user: me } = await requireAdmin();
  const title = str(fd.get("title"));
  if (title.length < 2) return { error: "Give the form a title." };
  let fields: FormField[];
  try {
    fields = z.array(fieldSchema).min(1, "Add at least one field.").parse(JSON.parse(str(fd.get("fields")) || "[]"));
  } catch (e) {
    return { error: e instanceof z.ZodError ? e.issues[0].message : "Fields are invalid." };
  }
  if (fields.some((f) => f.type === "choice" && !f.options?.length)) return { error: "Choice fields need options." };
  const values = {
    title,
    description: opt(fd.get("description")),
    fields,
    requireSignature: fd.get("requireSignature") === "on",
    audience: str(fd.get("audience")) || "all",
    dueDate: opt(fd.get("dueDate")),
    status: (str(fd.get("status")) || "draft") as "draft" | "published" | "closed",
  };
  const id = str(fd.get("id"));
  let formId = id;
  if (id) await db.update(form).set(values).where(eq(form.id, id));
  else {
    const [row] = await db.insert(form).values({ ...values, createdBy: me.id }).returning({ id: form.id });
    formId = row.id;
  }
  if (values.status === "published" && fd.get("notify") === "on") {
    const recipients = await db
      .select({ id: user.id, email: user.email })
      .from(user)
      .leftJoin(profile, eq(profile.userId, user.id))
      .where(
        and(
          eq(user.role, "student"),
          or(eq(user.banned, false), isNull(user.banned)),
          values.audience === "all" ? undefined : eq(profile.cohortId, values.audience),
        ),
      );
    for (const r of recipients) await notify(r.id, `New form: ${title}`, values.dueDate ? `Due ${prettyDate(values.dueDate)}` : undefined, `/forms/${formId}`);
    await sendEmailToMany(
      recipients.map((r) => r.email),
      {
        subject: `New form to fill: ${title}`,
        preview: "Takes a minute on your phone.",
        heading: "You have a new form 📝",
        paragraphs: [`“${title}” is waiting for you in IGNITE.`, ...(values.dueDate ? [`Due ${prettyDate(values.dueDate)}.`] : [])],
        cta: { label: "Fill it out", href: `${appUrl()}/forms/${formId}` },
      },
    );
  }
  await audit(me.id, id ? "form.update" : "form.create", { type: "form", id: formId }, { status: values.status });
  revalidatePath("/admin/forms");
  if (!id) redirect(`/admin/forms/${formId}`);
  return { ok: true, message: "Form saved." };
}

export async function deleteFormAction(fd: FormData) {
  const { user: me } = await requireAdmin();
  const id = str(fd.get("id"));
  await db.delete(form).where(eq(form.id, id));
  await audit(me.id, "form.delete", { type: "form", id });
  redirect("/admin/forms");
}

/* ───────────────────────── Announcements ───────────────────────── */

export async function createAnnouncementAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const { user: me } = await requireAdmin();
  const title = str(fd.get("title"));
  const body = str(fd.get("body"));
  if (!title || !body) return { error: "Add a title and message." };
  const emailIt = fd.get("email") === "on";
  await db.insert(announcement).values({ title, body, pinned: fd.get("pinned") === "on", emailed: emailIt, createdBy: me.id });
  let sent = 0;
  if (emailIt) {
    const recipients = await db
      .select({ email: user.email })
      .from(user)
      .where(and(eq(user.role, "student"), or(eq(user.banned, false), isNull(user.banned))));
    const res = await sendEmailToMany(
      recipients.map((r) => r.email),
      {
        subject: `📣 ${title}`,
        preview: body.slice(0, 90),
        heading: title,
        paragraphs: body.split(/\n{2,}/),
        cta: { label: "Open IGNITE", href: `${appUrl()}/home` },
      },
    );
    sent = res.sent;
  }
  await audit(me.id, "announcement.create", undefined, { title, emailed: sent });
  revalidatePath("/admin/announcements");
  revalidatePath("/home");
  return { ok: true, message: emailIt ? `Posted and emailed to ${sent} students.` : "Posted." };
}

export async function announcementToggleAction(fd: FormData) {
  const { user: me } = await requireAdmin();
  const id = str(fd.get("id"));
  const op = str(fd.get("op"));
  if (op === "delete") await db.delete(announcement).where(eq(announcement.id, id));
  else if (op === "pin" || op === "unpin") await db.update(announcement).set({ pinned: op === "pin" }).where(eq(announcement.id, id));
  await audit(me.id, `announcement.${op}`, { type: "announcement", id });
  revalidatePath("/admin/announcements");
}

export async function hideWishAction(fd: FormData) {
  const { user: me } = await requireAdmin();
  const id = str(fd.get("id"));
  await db.update(birthdayWish).set({ hidden: true }).where(eq(birthdayWish.id, id));
  await audit(me.id, "birthday_wish.hide", { type: "birthday_wish", id });
  revalidatePath("/admin/birthdays");
}

/* ───────────────────────── Settings ───────────────────────── */

export async function saveSettingsAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const { user: me } = await requireAdmin();
  const n = (k: string, d: number) => {
    const v = Number(str(fd.get(k)));
    return Number.isFinite(v) && v >= 0 ? Math.round(v) : d;
  };
  const cur = await getSettings();
  const next: ProgramSettings = {
    minCheckins: Math.min(4, n("minCheckins", cur.minCheckins)),
    requireReportCard: fd.get("requireReportCard") === "on",
    requireCounselor: fd.get("requireCounselor") === "on",
    points: {
      reportCard: n("p_reportCard", cur.points.reportCard),
      allPassing: n("p_allPassing", cur.points.allPassing),
      checkin: n("p_checkin", cur.points.checkin),
      onTimeWeek: n("p_onTimeWeek", cur.points.onTimeWeek),
      tutoring: n("p_tutoring", cur.points.tutoring),
      ideaShipped: n("p_ideaShipped", cur.points.ideaShipped),
      birthday: n("p_birthday", cur.points.birthday),
      clockVisit: n("p_clockVisit", cur.points.clockVisit),
    },
    clock: cur.clock,
  };
  await saveSettings(next);
  await audit(me.id, "settings.update", undefined, next as unknown as Record<string, unknown>);
  revalidatePath("/admin", "layout");
  return { ok: true, message: "Settings saved." };
}

export async function saveClockSettingsAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const { user: me } = await requireAdmin();
  const latRaw = str(fd.get("lat"));
  const lngRaw = str(fd.get("lng"));
  const lat = latRaw ? Number(latRaw) : null;
  const lng = lngRaw ? Number(lngRaw) : null;
  if ((lat == null) !== (lng == null)) return { error: "Enter both latitude and longitude (or neither)." };
  if (lat != null && (!Number.isFinite(lat) || Math.abs(lat) > 90)) return { error: "Latitude must be between -90 and 90." };
  if (lng != null && (!Number.isFinite(lng) || Math.abs(lng) > 180)) return { error: "Longitude must be between -180 and 180." };
  const radiusM = Math.round(Number(str(fd.get("radiusM"))));
  if (!Number.isFinite(radiusM) || radiusM < 25 || radiusM > 2000) return { error: "Distance must be between 25 and 2000 meters." };
  const minMinutes = Math.round(Number(str(fd.get("minMinutes"))));
  if (!Number.isFinite(minMinutes) || minMinutes < 0 || minMinutes > 600) return { error: "Minimum visit must be 0–600 minutes." };

  const cur = await getSettings();
  const next: ProgramSettings = {
    ...cur,
    clock: {
      enabled: fd.get("enabled") === "on",
      siteName: str(fd.get("siteName")).slice(0, 60) || "IGNITE Academy",
      lat: lat == null ? null : Math.round(lat * 1e6) / 1e6,
      lng: lng == null ? null : Math.round(lng * 1e6) / 1e6,
      radiusM,
      minMinutes,
    },
  };
  await saveSettings(next);
  await audit(me.id, "settings.clock", undefined, next.clock as unknown as Record<string, unknown>);
  revalidatePath("/", "layout");
  return { ok: true, message: "Clock-in location saved." };
}

/* ───────────────────────── Clock in / out (staff) ───────────────────────── */

function readWallTime(fd: FormData, key: string) {
  const v = str(fd.get(key));
  return v ? zonedWallToDate(v) : null;
}

function validateVisitTimes(clockInAt: Date | null, clockOutAt: Date | null): string | null {
  if (!clockInAt) return "Enter a clock-in time.";
  if (clockInAt.getTime() > Date.now() + 5 * 60_000) return "Clock-in can't be in the future.";
  if (clockOutAt) {
    if (clockOutAt <= clockInAt) return "Clock-out must be after clock-in.";
    if (clockOutAt.getTime() > Date.now() + 5 * 60_000) return "Clock-out can't be in the future.";
    if (clockOutAt.getTime() - clockInAt.getTime() > 16 * 3_600_000) return "A visit can't be longer than 16 hours.";
  }
  return null;
}

const OPEN_CONFLICT = "This student already has an open visit that day.";

function revalidateClock(userId: string) {
  revalidatePath("/admin/clock");
  revalidatePath(`/admin/users/${userId}`);
  revalidatePath("/home");
  revalidatePath("/clock");
}

/** Edit a visit's times (also how staff close a visit someone forgot to clock out of). */
export async function saveVisitAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const { user: me } = await requireAdmin();
  const row = await db.query.clockSession.findFirst({ where: eq(clockSession.id, str(fd.get("id"))) });
  if (!row) return { error: "Visit not found." };
  const clockInAt = readWallTime(fd, "clockInAt");
  const clockOutAt = readWallTime(fd, "clockOutAt");
  const invalid = validateVisitTimes(clockInAt, clockOutAt);
  if (invalid) return { error: invalid };
  const day = zonedToday(clockInAt!).iso;
  if (!clockOutAt && day !== zonedToday().iso) return { error: "Add a clock-out time for a past day." };

  let updated;
  try {
    [updated] = await db
      .update(clockSession)
      .set({ clockInAt: clockInAt!, clockOutAt, day, editedBy: me.id, staffNote: opt(fd.get("note")) })
      .where(eq(clockSession.id, row.id))
      .returning();
  } catch {
    return { error: OPEN_CONFLICT };
  }
  const pts = await maybeAwardVisitPoints(updated, await getSettings());
  await audit(me.id, "clock.edit", { type: "user", id: row.userId }, {
    visitId: row.id,
    from: { in: row.clockInAt, out: row.clockOutAt },
    to: { in: clockInAt, out: clockOutAt },
  });
  revalidateClock(row.userId);
  return { ok: true, message: pts ? `Visit saved. +${pts} points awarded.` : "Visit saved." };
}

/** Add a visit by hand (e.g. the student's phone died). */
export async function addVisitAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const { user: me } = await requireAdmin();
  const student = await db.query.user.findFirst({ where: eq(user.id, str(fd.get("userId"))) });
  if (!student || student.role !== "student") return { error: "Pick a student." };
  const clockInAt = readWallTime(fd, "clockInAt");
  const clockOutAt = readWallTime(fd, "clockOutAt");
  if (!clockOutAt) return { error: "Enter a clock-out time." };
  const invalid = validateVisitTimes(clockInAt, clockOutAt);
  if (invalid) return { error: invalid };

  const [row] = await db
    .insert(clockSession)
    .values({
      userId: student.id,
      day: zonedToday(clockInAt!).iso,
      clockInAt: clockInAt!,
      clockOutAt,
      editedBy: me.id,
      staffNote: opt(fd.get("note")),
    })
    .returning();
  const pts = await maybeAwardVisitPoints(row, await getSettings());
  await audit(me.id, "clock.add", { type: "user", id: student.id }, { visitId: row.id, in: clockInAt, out: clockOutAt });
  revalidateClock(student.id);
  return { ok: true, message: pts ? `Visit added. +${pts} points awarded.` : "Visit added." };
}

export async function deleteVisitAction(fd: FormData) {
  const { user: me } = await requireAdmin();
  const row = await db.query.clockSession.findFirst({ where: eq(clockSession.id, str(fd.get("id"))) });
  if (!row) return;
  await db.delete(clockSession).where(eq(clockSession.id, row.id));
  if (row.pointsAwarded > 0) await awardPoints(row.userId, -row.pointsAwarded, "Visit removed by staff", "clock");
  await audit(me.id, "clock.delete", { type: "user", id: row.userId }, { visitId: row.id, in: row.clockInAt, out: row.clockOutAt });
  revalidateClock(row.userId);
}

export async function createTermAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const { user: me } = await requireAdmin();
  const name = str(fd.get("name"));
  const startsOn = str(fd.get("startsOn"));
  const endsOn = str(fd.get("endsOn"));
  if (!name || !startsOn || !endsOn) return { error: "Name, start and end are required." };
  if (endsOn < startsOn) return { error: "End date is before start date." };
  const makeCurrent = fd.get("isCurrent") === "on";
  if (makeCurrent) await db.update(term).set({ isCurrent: false });
  await db.insert(term).values({ name, startsOn, endsOn, isCurrent: makeCurrent });
  await audit(me.id, "term.create", undefined, { name });
  revalidatePath("/admin/settings");
  return { ok: true, message: "Grading period added." };
}

export async function termOpAction(fd: FormData) {
  const { user: me } = await requireAdmin();
  const id = str(fd.get("id"));
  const op = str(fd.get("op"));
  if (op === "current") {
    await db.update(term).set({ isCurrent: false }).where(ne(term.id, id));
    await db.update(term).set({ isCurrent: true }).where(eq(term.id, id));
  } else if (op === "delete") {
    await db.delete(term).where(eq(term.id, id));
  }
  await audit(me.id, `term.${op}`, { type: "term", id });
  revalidatePath("/admin/settings");
}

export async function createCohortAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const { user: me } = await requireAdmin();
  const name = str(fd.get("name"));
  if (!name) return { error: "Name the group." };
  await db.insert(cohort).values({ name });
  await audit(me.id, "cohort.create", undefined, { name });
  revalidatePath("/admin/settings");
  return { ok: true, message: "Group added." };
}

export async function deleteCohortAction(fd: FormData) {
  const { user: me } = await requireAdmin();
  const id = str(fd.get("id"));
  await db.delete(cohort).where(eq(cohort.id, id));
  await audit(me.id, "cohort.delete", { type: "cohort", id });
  revalidatePath("/admin/settings");
}

/** Bulk-approve several pending items of one kind from the review queue. */
export async function bulkApproveAction(fd: FormData) {
  const { user: me } = await requireAdmin();
  const kind = str(fd.get("kind"));
  const ids = fd.getAll("ids").map(String).filter(Boolean);
  if (!ids.length) return;
  const s = await getSettings();
  if (kind === "checkin") {
    const rows = await db
      .select()
      .from(attendanceCheckin)
      .where(and(inArray(attendanceCheckin.id, ids), eq(attendanceCheckin.status, "pending")));
    for (const c of rows) {
      await db
        .update(attendanceCheckin)
        .set({ status: "approved", reviewedBy: me.id, reviewedAt: new Date() })
        .where(eq(attendanceCheckin.id, c.id));
      await awardPoints(c.userId, s.points.checkin, `Attendance week of ${prettyDate(c.weekOf, "MMM d")}`, "checkin");
      if (c.daysLate === 0) await awardPoints(c.userId, s.points.onTimeWeek, "On time all week", "checkin");
      await notify(c.userId, "Check-in approved 🔥", `Week of ${prettyDate(c.weekOf, "MMM d")}`, "/school#attendance");
    }
    await audit(me.id, "checkin.bulk_approve", undefined, { count: rows.length });
  }
  revalidatePath("/admin", "layout");
}
