import "server-only";
import { and, desc, eq, gte, inArray } from "drizzle-orm";
import { db } from "@/db";
import { attendanceCheckin, profile, reportCard, term } from "@/db/schema";
import { addDaysIso, weekOf, zonedToday } from "@/lib/dates";
import { getSettings, type ProgramSettings } from "@/lib/settings";

export type EligibilityStatus = "eligible" | "needs_action" | "on_hold";
export type CheckState = "done" | "pending" | "missing" | "failed";
export type Check = { key: string; label: string; state: CheckState; hint: string; href: string };
export type Eligibility = { status: EligibilityStatus; checks: Check[]; overridden: boolean };

type Inputs = {
  profile: { counselorEmail: string | null; counselorName: string | null; eligibilityOverride: string | null } | undefined;
  latestCard: { status: string; allPassing: boolean | null } | undefined;
  checkins: { status: string }[];
  currentTermName: string | null;
};

export function evaluate(i: Inputs, s: ProgramSettings): Eligibility {
  const checks: Check[] = [];

  if (s.requireReportCard) {
    const c = i.latestCard;
    const termLabel = i.currentTermName ? ` for ${i.currentTermName}` : "";
    let state: CheckState = "missing";
    let hint = `Upload your report card${termLabel}.`;
    if (c?.status === "pending") {
      state = "pending";
      hint = "Submitted — staff are reviewing it.";
    } else if (c?.status === "rejected") {
      state = "missing";
      hint = "Needs a new upload — check the note from staff.";
    } else if (c?.status === "approved" && c.allPassing === false) {
      state = "failed";
      hint = "Not all classes are passing yet. Let's get you tutoring support.";
    } else if (c?.status === "approved") {
      state = "done";
      hint = "Approved. Great work!";
    }
    checks.push({ key: "report", label: "Report card", state, hint, href: "/school" });
  }

  {
    const approved = i.checkins.filter((c) => c.status === "approved").length;
    const pending = i.checkins.filter((c) => c.status === "pending").length;
    const state: CheckState =
      approved >= s.minCheckins ? "done" : approved + pending >= s.minCheckins ? "pending" : "missing";
    checks.push({
      key: "attendance",
      label: "School attendance",
      state,
      hint:
        state === "done"
          ? `${approved} approved check-ins in the last 4 weeks.`
          : `${approved}/${s.minCheckins} approved weekly check-ins in the last 4 weeks.`,
      href: "/school#attendance",
    });
  }

  if (s.requireCounselor) {
    const ok = Boolean(i.profile?.counselorEmail && i.profile?.counselorName);
    checks.push({
      key: "counselor",
      label: "Guidance counselor",
      state: ok ? "done" : "missing",
      hint: ok ? "Counselor contact on file." : "Add your guidance counselor's name and email.",
      href: "/me/profile",
    });
  }

  const override = i.profile?.eligibilityOverride;
  if (override === "eligible" || override === "on_hold") {
    return { status: override, checks, overridden: true };
  }
  let status: EligibilityStatus = "eligible";
  if (checks.some((c) => c.state === "failed")) status = "on_hold";
  else if (checks.some((c) => c.state !== "done")) status = "needs_action";
  return { status, checks, overridden: false };
}

async function loadContext() {
  const [settings, current] = await Promise.all([
    getSettings(),
    db.query.term.findFirst({ where: eq(term.isCurrent, true) }),
  ]);
  const since = addDaysIso(weekOf(zonedToday().iso), -21);
  return { settings, current, since };
}

export async function getEligibility(userId: string): Promise<Eligibility> {
  const { settings, current, since } = await loadContext();
  const [p, cards, checkins] = await Promise.all([
    db.query.profile.findFirst({ where: eq(profile.userId, userId) }),
    db
      .select({ status: reportCard.status, allPassing: reportCard.allPassing })
      .from(reportCard)
      .where(
        current
          ? and(eq(reportCard.userId, userId), eq(reportCard.termId, current.id))
          : eq(reportCard.userId, userId),
      )
      .orderBy(desc(reportCard.createdAt))
      .limit(1),
    db
      .select({ status: attendanceCheckin.status })
      .from(attendanceCheckin)
      .where(and(eq(attendanceCheckin.userId, userId), gte(attendanceCheckin.weekOf, since))),
  ]);
  return evaluate(
    { profile: p, latestCard: cards[0], checkins, currentTermName: current?.name ?? null },
    settings,
  );
}

/** Bulk evaluation for admin views. */
export async function getEligibilityMap(userIds: string[]) {
  const map = new Map<string, Eligibility>();
  if (!userIds.length) return map;
  const { settings, current, since } = await loadContext();
  const [profiles, cards, checkins] = await Promise.all([
    db.select().from(profile).where(inArray(profile.userId, userIds)),
    db
      .select({
        userId: reportCard.userId,
        status: reportCard.status,
        allPassing: reportCard.allPassing,
        createdAt: reportCard.createdAt,
      })
      .from(reportCard)
      .where(
        current
          ? and(inArray(reportCard.userId, userIds), eq(reportCard.termId, current.id))
          : inArray(reportCard.userId, userIds),
      )
      .orderBy(desc(reportCard.createdAt)),
    db
      .select({ userId: attendanceCheckin.userId, status: attendanceCheckin.status })
      .from(attendanceCheckin)
      .where(and(inArray(attendanceCheckin.userId, userIds), gte(attendanceCheckin.weekOf, since))),
  ]);
  for (const id of userIds) {
    map.set(
      id,
      evaluate(
        {
          profile: profiles.find((p) => p.userId === id),
          latestCard: cards.find((c) => c.userId === id),
          checkins: checkins.filter((c) => c.userId === id),
          currentTermName: current?.name ?? null,
        },
        settings,
      ),
    );
  }
  return map;
}

export const STATUS_META: Record<EligibilityStatus, { label: string; tone: "green" | "gold" | "red" }> = {
  eligible: { label: "Eligible", tone: "green" },
  needs_action: { label: "Needs action", tone: "gold" },
  on_hold: { label: "On hold", tone: "red" },
};
