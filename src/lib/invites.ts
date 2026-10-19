import "server-only";
import { and, eq, gt, isNull } from "drizzle-orm";
import { db } from "@/db";
import { invite, profile, user } from "@/db/schema";
import { auth } from "@/lib/auth";
import { sendEmail } from "@/lib/email";
import { appUrl } from "@/lib/env";
import type { Role } from "@/lib/session";

const INVITE_DAYS = 14;

function token() {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return Buffer.from(bytes).toString("base64url");
}

async function issueInvite(userId: string, createdBy: string | null) {
  const t = token();
  await db.insert(invite).values({
    userId,
    token: t,
    createdBy,
    expiresAt: new Date(Date.now() + INVITE_DAYS * 86_400_000),
  });
  return `${appUrl()}/invite/${t}`;
}

async function emailInvite(to: string, name: string, link: string, role: Role) {
  return sendEmail({
    to,
    subject: role === "student" ? "You're in — welcome to IGNITE Academy 🔥" : "Your IGNITE Academy staff account",
    preview: "Set your password to activate your account.",
    heading: role === "student" ? `Welcome to IGNITE, ${name.split(" ")[0]}!` : `Hi ${name.split(" ")[0]}`,
    paragraphs:
      role === "student"
        ? [
            "You've been accepted into IGNITE Academy by Community Matters 2. Getting in is a privilege — and we're excited to have you.",
            "Tap the button to set your password and finish your profile. It takes about 2 minutes.",
          ]
        : ["An IGNITE Academy staff account was created for you. Set your password to get started."],
    cta: { label: "Activate my account", href: link },
    footnote: `This link expires in ${INVITE_DAYS} days.`,
  });
}

export async function inviteUser(input: {
  name: string;
  email: string;
  role: Role;
  cohortId?: string | null;
  createdBy: string;
}) {
  const email = input.email.trim().toLowerCase();
  const existing = await db.query.user.findFirst({ where: eq(user.email, email) });
  if (existing) return { ok: false as const, error: `${email} already has an account.` };

  // Server-side call (no request headers) is allowed by the admin plugin; the caller is
  // already authorized as an admin in the server action.
  const created = await auth.api.createUser({
    body: { email, name: input.name.trim() },
  });
  const userId = created.user.id;
  // Roles are stored as plain strings ("student" | "tutor" | "admin").
  await db.update(user).set({ role: input.role }).where(eq(user.id, userId));
  await db.insert(profile).values({ userId, cohortId: input.cohortId || null });
  const link = await issueInvite(userId, input.createdBy);
  const mail = await emailInvite(email, input.name, link, input.role);
  return { ok: true as const, userId, link, emailed: mail.ok && !("dev" in mail) };
}

export async function resendInvite(userId: string, createdBy: string) {
  const u = await db.query.user.findFirst({ where: eq(user.id, userId) });
  if (!u) return { ok: false as const, error: "User not found." };
  const link = await issueInvite(userId, createdBy);
  const mail = await emailInvite(u.email, u.name, link, (u.role ?? "student") as Role);
  return { ok: true as const, link, emailed: mail.ok && !("dev" in mail) };
}

export async function findValidInvite(t: string) {
  const row = await db.query.invite.findFirst({
    where: and(eq(invite.token, t), isNull(invite.acceptedAt), gt(invite.expiresAt, new Date())),
  });
  if (!row) return null;
  const u = await db.query.user.findFirst({ where: eq(user.id, row.userId) });
  if (!u || u.banned) return null;
  return { invite: row, user: u };
}

/** Sets the user's password from a valid invite and marks the invite used. */
export async function acceptInvite(t: string, password: string) {
  const found = await findValidInvite(t);
  if (!found) return { ok: false as const, error: "This invite link is invalid or has expired." };
  const ctx = await auth.$context;
  const hash = await ctx.password.hash(password);
  const existing = await ctx.internalAdapter.findCredentialAccount(found.user.id);
  if (existing) await ctx.internalAdapter.updatePassword(found.user.id, hash);
  else
    await ctx.internalAdapter.linkAccount({
      userId: found.user.id,
      providerId: "credential",
      accountId: found.user.id,
      password: hash,
    });
  await db.update(user).set({ emailVerified: true, updatedAt: new Date() }).where(eq(user.id, found.user.id));
  await db.update(invite).set({ acceptedAt: new Date() }).where(eq(invite.userId, found.user.id));
  return { ok: true as const, email: found.user.email };
}
