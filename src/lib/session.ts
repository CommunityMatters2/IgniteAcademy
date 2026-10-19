import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { profile } from "@/db/schema";

export type Role = "student" | "admin" | "tutor";

export const getSession = cache(async () => {
  return auth.api.getSession({ headers: await headers() });
});

export async function requireUser() {
  const s = await getSession();
  if (!s) redirect("/login");
  return { user: { ...s.user, role: (s.user.role ?? "student") as Role }, session: s.session };
}

/** Youth app gate: must be signed in and onboarded. Staff are sent to the admin console. */
export const requireStudent = cache(async () => {
  const { user, session } = await requireUser();
  if (user.role === "admin" || user.role === "tutor") redirect("/admin");
  const p = await db.query.profile.findFirst({ where: eq(profile.userId, user.id) });
  if (!p?.onboardedAt) redirect("/welcome");
  return { user, session, profile: p, impersonating: Boolean(session.impersonatedBy) };
});

/** Admin + tutors. Tutors are limited to the help-center pages (checked per page with requireAdmin). */
export const requireStaff = cache(async () => {
  const { user, session } = await requireUser();
  if (user.role !== "admin" && user.role !== "tutor") redirect("/home");
  return { user, session };
});

export const requireAdmin = cache(async () => {
  const { user, session } = await requireUser();
  if (user.role !== "admin") redirect(user.role === "tutor" ? "/admin/sessions" : "/home");
  return { user, session };
});
