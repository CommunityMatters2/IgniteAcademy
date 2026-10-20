"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, count, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import {
  attendanceCheckin,
  badge,
  badgeClaim,
  birthdayWish,
  clockSession,
  form,
  formResponse,
  grade,
  helpRequest,
  idea,
  ideaVote,
  notification,
  profile,
  reportCard,
  sessionSignup,
  term,
  tutorSession,
  user,
} from "@/db/schema";
import { requireStudent, requireUser } from "@/lib/session";
import { saveFile, deleteStoredFile, UploadError, validateUpload } from "@/lib/storage";
import { trySendEmail } from "@/lib/email";
import { appUrl } from "@/lib/env";
import { formatMinutes, weekOf, zonedDateTime, zonedTime, zonedToday } from "@/lib/dates";
import { checkLocation, getOpenToday, maybeAwardVisitPoints, visitMinutes } from "@/lib/clock";
import { getSettings } from "@/lib/settings";
import type { ActionState } from "@/lib/utils";

const str = (v: FormDataEntryValue | null) => (typeof v === "string" ? v.trim() : "");
const opt = (v: FormDataEntryValue | null) => str(v) || null;

function fail(err: unknown): ActionState {
  if (err instanceof UploadError) return { error: err.message };
  if (err instanceof z.ZodError) return { error: err.issues[0]?.message ?? "Check the form and try again." };
  console.error(err);
  return { error: "Something went wrong. Please try again." };
}

/* ───────────────────────── Profile & onboarding ───────────────────────── */

const profileSchema = z.object({
  preferredName: z.string().max(40).nullable(),
  birthday: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Add your birthday.")
    .refine((d) => d < zonedToday().iso && d > "1990-01-01", "Check your birthday."),
  phone: z.string().max(30).nullable(),
  school: z.string().min(2, "Which school do you go to?").max(120),
  gradeLevel: z.string().min(1, "Pick your grade."),
  guardianName: z.string().max(80).nullable(),
  guardianPhone: z.string().max(30).nullable(),
  guardianEmail: z.string().email("Guardian email looks off.").nullable().or(z.literal(null)),
  counselorName: z.string().max(80).nullable(),
  counselorEmail: z.string().email("Counselor email looks off.").nullable().or(z.literal(null)),
  counselorPhone: z.string().max(30).nullable(),
  tshirtSize: z.string().max(8).nullable(),
});

function readProfile(fd: FormData) {
  return profileSchema.parse({
    preferredName: opt(fd.get("preferredName")),
    birthday: str(fd.get("birthday")),
    phone: opt(fd.get("phone")),
    school: str(fd.get("school")),
    gradeLevel: str(fd.get("gradeLevel")),
    guardianName: opt(fd.get("guardianName")),
    guardianPhone: opt(fd.get("guardianPhone")),
    guardianEmail: opt(fd.get("guardianEmail")),
    counselorName: opt(fd.get("counselorName")),
    counselorEmail: opt(fd.get("counselorEmail")),
    counselorPhone: opt(fd.get("counselorPhone")),
    tshirtSize: opt(fd.get("tshirtSize")),
  });
}

async function maybeSaveAvatar(userId: string, fd: FormData, previous?: string | null) {
  const file = validateUpload(fd.get("avatar") as File | null, { required: false });
  if (!file) return undefined;
  if (!file.type.startsWith("image/")) throw new UploadError("Profile photo must be an image.");
  const saved = await saveFile(file, `avatars/${userId}`);
  await deleteStoredFile(previous);
  return saved.key;
}

export async function completeOnboardingAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const { user: me } = await requireUser();
  try {
    const data = readProfile(fd);
    const existing = await db.query.profile.findFirst({ where: eq(profile.userId, me.id) });
    const avatarKey = await maybeSaveAvatar(me.id, fd, existing?.avatarKey);
    const values = {
      ...data,
      ...(avatarKey ? { avatarKey } : {}),
      onboardedAt: new Date(),
      updatedAt: new Date(),
    };
    await db
      .insert(profile)
      .values({ userId: me.id, ...values })
      .onConflictDoUpdate({ target: profile.userId, set: values });
  } catch (err) {
    return fail(err);
  }
  redirect("/home?welcome=1");
}

export async function updateProfileAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const { user: me, profile: p } = await requireStudent();
  try {
    const data = readProfile(fd);
    const avatarKey = await maybeSaveAvatar(me.id, fd, p.avatarKey);
    await db
      .update(profile)
      .set({
        ...data,
        ...(avatarKey ? { avatarKey } : {}),
        showOnLeaderboard: fd.get("showOnLeaderboard") === "on",
        updatedAt: new Date(),
      })
      .where(eq(profile.userId, me.id));
  } catch (err) {
    return fail(err);
  }
  revalidatePath("/", "layout");
  return { ok: true, message: "Profile saved." };
}

/* ───────────────────────── School ───────────────────────── */

export async function submitReportCardAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const { user: me } = await requireStudent();
  try {
    const file = validateUpload(fd.get("file") as File | null)!;
    const current = await db.query.term.findFirst({ where: eq(term.isCurrent, true) });
    const termId = opt(fd.get("termId")) ?? current?.id ?? null;
    const passing = str(fd.get("allPassing"));
    const subjects = fd.getAll("subject").map(String);
    const marks = fd.getAll("mark").map(String);
    const failing = new Set(fd.getAll("failing").map(String));

    const saved = await saveFile(file, `u/${me.id}/report-cards`);
    const [card] = await db
      .insert(reportCard)
      .values({
        userId: me.id,
        termId,
        fileKey: saved.key,
        fileName: file.name,
        contentType: saved.contentType,
        gpa: opt(fd.get("gpa")),
        allPassing: passing === "yes" ? true : passing === "no" ? false : null,
        note: opt(fd.get("note")),
      })
      .returning({ id: reportCard.id });

    const rows = subjects
      .map((s, i) => ({ subject: s.trim(), mark: (marks[i] ?? "").trim(), idx: String(i) }))
      .filter((r) => r.subject && r.mark)
      .map((r) => ({ reportCardId: card.id, subject: r.subject, mark: r.mark, passing: !failing.has(r.idx) }));
    if (rows.length) await db.insert(grade).values(rows);
  } catch (err) {
    return fail(err);
  }
  revalidatePath("/school");
  revalidatePath("/home");
  return { ok: true, message: "Report card sent for review. 🙌" };
}

export async function submitCheckinAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const { user: me } = await requireStudent();
  try {
    const week = weekOf(str(fd.get("weekOf")) || zonedToday().iso);
    if (week > weekOf(zonedToday().iso)) return { error: "You can't check in for a future week." };
    const daysPresent = z.coerce.number().int().min(0).max(7).parse(fd.get("daysPresent"));
    const daysLate = z.coerce.number().int().min(0).max(7).parse(fd.get("daysLate"));
    if (daysLate > daysPresent) return { error: "Late days can't be more than days present." };
    const file = validateUpload(fd.get("proof") as File | null)!;

    const existing = await db.query.attendanceCheckin.findFirst({
      where: and(eq(attendanceCheckin.userId, me.id), eq(attendanceCheckin.weekOf, week)),
    });
    if (existing?.status === "approved") return { error: "That week is already approved. ✅" };

    const saved = await saveFile(file, `u/${me.id}/attendance`);
    const values = {
      proofKey: saved.key,
      contentType: saved.contentType,
      daysPresent,
      daysLate,
      note: opt(fd.get("note")),
      status: "pending" as const,
      reviewNote: null,
      reviewedAt: null,
      reviewedBy: null,
    };
    if (existing) {
      await deleteStoredFile(existing.proofKey);
      await db.update(attendanceCheckin).set(values).where(eq(attendanceCheckin.id, existing.id));
    } else {
      await db.insert(attendanceCheckin).values({ userId: me.id, weekOf: week, ...values });
    }
  } catch (err) {
    return fail(err);
  }
  revalidatePath("/school");
  revalidatePath("/home");
  return { ok: true, message: "Check-in submitted. Keep that streak alive! 🔥" };
}

/* ───────────────────────── Clock in / out ───────────────────────── */

function readPosition(fd: FormData) {
  // Missing values become NaN (not 0) so checkLocation rejects them.
  const num = (k: string) => (str(fd.get(k)) === "" ? NaN : Number(str(fd.get(k))));
  return { lat: num("lat"), lng: num("lng"), accuracy: num("accuracy") };
}

export async function clockInAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const { user: me } = await requireStudent();
  const settings = await getSettings();
  if (!settings.clock.enabled) return { error: "Clock-in is turned off right now." };
  const pos = readPosition(fd);
  const check = checkLocation(settings.clock, pos.lat, pos.lng, pos.accuracy);
  if (!check.ok) return { error: check.error };

  if (await getOpenToday(me.id)) return { error: "You're already clocked in." };
  try {
    await db.insert(clockSession).values({
      userId: me.id,
      day: zonedToday().iso,
      clockInAt: new Date(),
      inDistanceM: check.distanceM,
      inAccuracyM: check.accuracyM,
    });
  } catch {
    // The unique index allows one open visit per day; a double tap lands here.
    return { error: "You're already clocked in." };
  }
  revalidatePath("/home");
  revalidatePath("/clock");
  return { ok: true, message: `Clocked in at ${zonedTime(new Date())}. Welcome! 👋` };
}

export async function clockOutAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const { user: me } = await requireStudent();
  const settings = await getSettings();
  const open = await getOpenToday(me.id);
  if (!open) return { error: "You're not clocked in today." };
  const pos = readPosition(fd);
  const check = checkLocation(settings.clock, pos.lat, pos.lng, pos.accuracy);
  if (!check.ok) return { error: check.error };

  const [closed] = await db
    .update(clockSession)
    .set({ clockOutAt: new Date(), outDistanceM: check.distanceM, outAccuracyM: check.accuracyM })
    .where(and(eq(clockSession.id, open.id), isNull(clockSession.clockOutAt)))
    .returning();
  if (!closed) return { error: "You're not clocked in today." };
  const pts = await maybeAwardVisitPoints(closed, settings);
  revalidatePath("/home");
  revalidatePath("/clock");
  const length = formatMinutes(visitMinutes(closed));
  return { ok: true, message: pts ? `Clocked out after ${length}. +${pts} points ⭐` : `Clocked out after ${length}. See you next time!` };
}

/* ───────────────────────── Help center ───────────────────────── */

export async function toggleSessionSignupAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const { user: me } = await requireStudent();
  const sessionId = str(fd.get("sessionId"));
  const s = await db.query.tutorSession.findFirst({ where: eq(tutorSession.id, sessionId) });
  if (!s) return { error: "Session not found." };
  if (s.startsAt.getTime() + s.durationMin * 60_000 < Date.now()) return { error: "This session already ended." };

  const existing = await db.query.sessionSignup.findFirst({
    where: and(eq(sessionSignup.sessionId, sessionId), eq(sessionSignup.userId, me.id)),
  });
  if (existing) {
    await db
      .delete(sessionSignup)
      .where(and(eq(sessionSignup.sessionId, sessionId), eq(sessionSignup.userId, me.id)));
    revalidatePath("/help");
    return { ok: true, message: "You're off the list." };
  }
  if (s.capacity) {
    const [{ n }] = await db.select({ n: count() }).from(sessionSignup).where(eq(sessionSignup.sessionId, sessionId));
    if (n >= s.capacity) return { error: "This session is full. Try another time." };
  }
  await db.insert(sessionSignup).values({ sessionId, userId: me.id });
  await trySendEmail({
    to: me.email,
    subject: `You're signed up: ${s.title}`,
    preview: `${s.subject} tutoring · ${zonedDateTime(s.startsAt)}`,
    heading: "You're in! 📚",
    paragraphs: [
      `${s.title} (${s.subject}) with ${s.tutorName ?? s.provider}.`,
      `When: ${zonedDateTime(s.startsAt)} · ${s.durationMin} minutes.`,
      "We'll send you a reminder email the morning of. The join link is in the Help Center.",
    ],
    cta: { label: "Open Help Center", href: `${appUrl()}/help` },
  });
  revalidatePath("/help");
  revalidatePath("/home");
  return { ok: true, message: "Signed up! Check your email for details." };
}

export async function helpRequestAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const { user: me } = await requireStudent();
  const subject = str(fd.get("subject"));
  const message = str(fd.get("message"));
  if (!subject || message.length < 5) return { error: "Tell us the subject and what you need help with." };
  await db.insert(helpRequest).values({ userId: me.id, subject, message: message.slice(0, 1000) });
  revalidatePath("/help");
  return { ok: true, message: "Request sent — staff will match you with help." };
}

/* ───────────────────────── Awards ───────────────────────── */

export async function claimBadgeAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const { user: me } = await requireStudent();
  try {
    const b = await db.query.badge.findFirst({ where: eq(badge.id, str(fd.get("badgeId"))) });
    if (!b || !b.active || !b.claimable) return { error: "Pick a badge to claim." };
    const pending = await db.query.badgeClaim.findFirst({
      where: and(eq(badgeClaim.userId, me.id), eq(badgeClaim.badgeId, b.id), eq(badgeClaim.status, "pending")),
    });
    if (pending) return { error: "You already have a pending claim for this badge." };
    const file = validateUpload(fd.get("proof") as File | null, { required: false });
    const saved = file ? await saveFile(file, `u/${me.id}/claims`) : null;
    await db.insert(badgeClaim).values({
      userId: me.id,
      badgeId: b.id,
      proofKey: saved?.key,
      contentType: saved?.contentType,
      note: opt(fd.get("note")),
    });
  } catch (err) {
    return fail(err);
  }
  revalidatePath("/awards");
  return { ok: true, message: "Claim sent! Staff will review it soon. ⭐" };
}

/* ───────────────────────── Voice ───────────────────────── */

export async function submitIdeaAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const { user: me } = await requireStudent();
  const title = str(fd.get("title"));
  const body = str(fd.get("body"));
  if (title.length < 3) return { error: "Give your idea a short title." };
  if (body.length < 10) return { error: "Tell us a bit more (at least a sentence)." };
  await db.insert(idea).values({
    userId: me.id,
    title: title.slice(0, 100),
    body: body.slice(0, 2000),
    category: str(fd.get("category")) || "Program",
    anonymous: fd.get("anonymous") === "on",
  });
  revalidatePath("/voice");
  return { ok: true, message: "Idea shared. Thanks for speaking up! 💡" };
}

export async function toggleVoteAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const { user: me } = await requireStudent();
  const ideaId = str(fd.get("ideaId"));
  const existing = await db.query.ideaVote.findFirst({
    where: and(eq(ideaVote.ideaId, ideaId), eq(ideaVote.userId, me.id)),
  });
  if (existing) await db.delete(ideaVote).where(and(eq(ideaVote.ideaId, ideaId), eq(ideaVote.userId, me.id)));
  else await db.insert(ideaVote).values({ ideaId, userId: me.id }).onConflictDoNothing();
  revalidatePath("/voice");
  return { ok: true };
}

/* ───────────────────────── Forms ───────────────────────── */

export async function submitFormAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const { user: me, profile: p } = await requireStudent();
  const f = await db.query.form.findFirst({ where: eq(form.id, str(fd.get("formId"))) });
  if (!f || f.status !== "published") return { error: "This form isn't open." };
  if (f.audience !== "all" && f.audience !== p.cohortId) return { error: "This form isn't assigned to you." };

  const answers: Record<string, string | boolean> = {};
  for (const field of f.fields) {
    if (field.type === "checkbox") {
      const v = fd.get(`f_${field.id}`) === "on";
      if (field.required && !v) return { error: `Please check “${field.label}”.` };
      answers[field.id] = v;
    } else {
      const v = str(fd.get(`f_${field.id}`)).slice(0, 4000);
      if (field.required && !v) return { error: `“${field.label}” is required.` };
      if (field.type === "choice" && v && !field.options?.includes(v)) return { error: `Pick an option for “${field.label}”.` };
      answers[field.id] = v;
    }
  }
  const signatureName = opt(fd.get("signatureName"));
  const signatureData = opt(fd.get("signatureData"));
  if (f.requireSignature && (!signatureName || !signatureData)) return { error: "Type your name and sign to submit." };
  if (signatureData && (!signatureData.startsWith("data:image/png;base64,") || signatureData.length > 300_000))
    return { error: "Signature couldn't be read. Try signing again." };

  await db
    .insert(formResponse)
    .values({ formId: f.id, userId: me.id, answers, signatureName, signatureData })
    .onConflictDoUpdate({
      target: [formResponse.formId, formResponse.userId],
      set: { answers, signatureName, signatureData, submittedAt: new Date() },
    });
  revalidatePath("/forms");
  return { ok: true, message: "Form submitted. Paperless high-five ✋" };
}

/* ───────────────────────── Birthdays & notifications ───────────────────────── */

export async function sendWishAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const { user: me } = await requireStudent();
  const toUserId = str(fd.get("toUserId"));
  const message = str(fd.get("message"));
  if (!message) return { error: "Write a quick message first." };
  if (toUserId === me.id) return { error: "Nice try 😄 — you can't wish yourself." };
  const target = await db.query.user.findFirst({ where: eq(user.id, toUserId) });
  if (!target) return { error: "Couldn't find that person." };
  await db.insert(birthdayWish).values({
    toUserId,
    fromUserId: me.id,
    message: message.slice(0, 280),
    year: zonedToday().y,
  });
  await db.insert(notification).values({
    userId: toUserId,
    title: `🎂 ${me.name.split(" ")[0]} sent you a birthday wish`,
    body: message.slice(0, 140),
    href: "/birthdays",
  });
  revalidatePath("/birthdays");
  return { ok: true, message: "Wish sent! 🎉" };
}

export async function markAllReadAction() {
  const { user: me } = await requireUser();
  await db
    .update(notification)
    .set({ readAt: new Date() })
    .where(and(eq(notification.userId, me.id), isNull(notification.readAt)));
  revalidatePath("/", "layout");
}
