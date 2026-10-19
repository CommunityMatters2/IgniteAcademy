"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { APIError } from "better-auth/api";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { acceptInvite } from "@/lib/invites";
import type { ActionState } from "@/lib/utils";

function safeNext(next: FormDataEntryValue | null) {
  const n = typeof next === "string" ? next : "";
  return n.startsWith("/") && !n.startsWith("//") ? n : "/home";
}

const credentials = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email."),
  password: z.string().min(1, "Enter your password."),
});

export async function signInAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = credentials.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  let role: string | null | undefined;
  try {
    const res = await auth.api.signInEmail({ body: parsed.data, headers: await headers() });
    role = (res.user as { role?: string | null }).role;
  } catch (err) {
    if (err instanceof APIError) {
      if (err.status === "FORBIDDEN") return { error: err.message || "Your account is paused. Please talk to staff." };
      if (err.status === "TOO_MANY_REQUESTS") return { error: "Too many attempts. Wait a minute and try again." };
      return { error: "That email and password don't match." };
    }
    throw err;
  }
  const next = safeNext(formData.get("next"));
  redirect(role === "admin" || role === "tutor" ? (next === "/home" ? "/admin" : next) : next);
}

export async function signOutAction() {
  await auth.api.signOut({ headers: await headers() });
  redirect("/login");
}

export async function requestResetAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const email = z.string().trim().toLowerCase().email().safeParse(formData.get("email"));
  if (!email.success) return { error: "Enter a valid email." };
  try {
    await auth.api.requestPasswordReset({ body: { email: email.data }, headers: await headers() });
  } catch (err) {
    if (err instanceof APIError && err.status === "TOO_MANY_REQUESTS")
      return { error: "Too many requests. Try again in a few minutes." };
    console.error(err);
  }
  // Same response whether or not the account exists.
  return { ok: true, message: "If that email has an IGNITE account, a reset link is on its way." };
}

const newPassword = z
  .object({
    password: z.string().min(8, "Use at least 8 characters."),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { message: "Passwords don't match.", path: ["confirm"] });

export async function resetPasswordAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = newPassword.safeParse({ password: formData.get("password"), confirm: formData.get("confirm") });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const token = String(formData.get("token") ?? "");
  try {
    await auth.api.resetPassword({ body: { newPassword: parsed.data.password, token } });
  } catch {
    return { error: "This reset link is invalid or expired. Request a new one." };
  }
  redirect("/login?reset=1");
}

export async function acceptInviteAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = newPassword.safeParse({ password: formData.get("password"), confirm: formData.get("confirm") });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const result = await acceptInvite(String(formData.get("token") ?? ""), parsed.data.password);
  if (!result.ok) return { error: result.error };
  await auth.api.signInEmail({
    body: { email: result.email, password: parsed.data.password },
    headers: await headers(),
  });
  redirect("/welcome");
}
