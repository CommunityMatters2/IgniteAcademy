import Link from "next/link";
import type { Metadata } from "next";
import { asc, desc, eq, gte, lte, and } from "drizzle-orm";
import { ArrowRight, CalendarClock, Inbox, UserPlus } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { buttonVariants } from "@/components/ui/button";
import { Card, PageHeader, Pill, SectionTitle, Stat } from "@/components/ui/primitives";
import { db } from "@/db";
import { auditLog, tutorSession, user } from "@/db/schema";
import { getPendingCounts, getStudents } from "@/lib/admin-data";
import { currentMonth, monthLabel, nowMs, prettyDate, zonedDateTime } from "@/lib/dates";
import { getEligibilityMap } from "@/lib/eligibility";
import { getLeaderboard } from "@/lib/leaderboard";
import { requireStaff } from "@/lib/session";
import { getUpcomingBirthdays } from "@/lib/student-data";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Admin" };

export default async function AdminDashboard() {
  const { user: me } = await requireStaff();
  if (me.role === "tutor") redirect("/admin/sessions");
  const month = currentMonth();
  const all = await getStudents();
  const students = all.filter((s) => s.role === "student" && !s.banned);
  const [pending, elig, top, birthdays, sessions, activity] = await Promise.all([
    getPendingCounts(),
    getEligibilityMap(students.map((s) => s.id)),
    getLeaderboard(month, 5),
    getUpcomingBirthdays(7),
    db
      .select()
      .from(tutorSession)
      .where(and(gte(tutorSession.startsAt, new Date()), lte(tutorSession.startsAt, new Date(nowMs() + 7 * 86_400_000))))
      .orderBy(asc(tutorSession.startsAt))
      .limit(5),
    db
      .select({ a: auditLog, actor: user.name })
      .from(auditLog)
      .leftJoin(user, eq(user.id, auditLog.actorId))
      .orderBy(desc(auditLog.createdAt))
      .limit(8),
  ]);
  const counts = { eligible: 0, needs_action: 0, on_hold: 0 };
  for (const e of elig.values()) counts[e.status]++;
  const notActivated = students.filter((s) => !s.onboardedAt).length;

  return (
    <div className="animate-rise">
      <PageHeader
        eyebrow={prettyDate(new Date(), "EEEE, MMMM d")}
        title={`Hi ${me.name.split(" ")[0]} 👋`}
        subtitle="Here's how IGNITE is doing."
        action={
          <Link href="/admin/users?invite=1" className={buttonVariants({ size: "sm" })}>
            <UserPlus /> Invite
          </Link>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Active students" value={students.length} hint={notActivated ? `${notActivated} not activated yet` : "All activated"} />
        <Stat label="Eligible" value={counts.eligible} tone="green" hint={`${students.length ? Math.round((counts.eligible / students.length) * 100) : 0}% of students`} />
        <Stat label="Needs action" value={counts.needs_action} tone="gold" />
        <Stat label="On hold" value={counts.on_hold} tone="red" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="flex size-11 items-center justify-center rounded-2xl bg-gold-soft text-gold">
                  <Inbox className="size-5" />
                </span>
                <div>
                  <p className="font-display text-lg font-semibold">Review queue</p>
                  <p className="text-sm text-muted">{pending.total ? `${pending.total} items waiting` : "All clear ✨"}</p>
                </div>
              </div>
              <Link href="/admin/reviews" className={buttonVariants({ size: "sm", variant: pending.total ? "gold" : "secondary" })}>
                Review <ArrowRight />
              </Link>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                ["Report cards", pending.cards, "/admin/reviews?tab=cards"],
                ["Check-ins", pending.checkins, "/admin/reviews?tab=checkins"],
                ["Badge claims", pending.claims, "/admin/reviews?tab=claims"],
                ["Help requests", pending.help, "/admin/sessions#requests"],
              ].map(([label, n, href]) => (
                <Link key={label as string} href={href as string} className="rounded-2xl bg-surface-2 px-3 py-3 hover:bg-surface-3">
                  <p className="font-display text-2xl font-bold tabular-nums">{n}</p>
                  <p className="text-xs text-muted">{label}</p>
                </Link>
              ))}
            </div>
          </Card>

          <div>
            <SectionTitle className="mt-0" action={<Link href="/admin/sessions" className="text-sm font-semibold text-brand">All sessions</Link>}>
              Tutoring this week
            </SectionTitle>
            {sessions.length ? (
              <Card className="divide-y divide-border p-0">
                {sessions.map((s) => (
                  <Link key={s.id} href={`/admin/sessions/${s.id}`} className="flex items-center gap-3 px-5 py-3.5 hover:bg-surface-2">
                    <CalendarClock className="size-5 text-info" />
                    <span className="flex-1 truncate font-medium">{s.title}</span>
                    <Pill tone="blue">{s.subject}</Pill>
                    <span className="hidden text-sm text-muted sm:block">{zonedDateTime(s.startsAt)}</span>
                  </Link>
                ))}
              </Card>
            ) : (
              <p className="text-sm text-muted">No sessions in the next 7 days.</p>
            )}
          </div>

          <div>
            <SectionTitle className="mt-0" action={<Link href="/admin/audit" className="text-sm font-semibold text-brand">Audit log</Link>}>
              Recent activity
            </SectionTitle>
            <Card className="divide-y divide-border p-0 text-sm">
              {activity.length ? (
                activity.map(({ a, actor }) => (
                  <div key={a.id} className="flex items-center justify-between gap-3 px-5 py-3">
                    <span className="truncate">
                      <b>{actor ?? "System"}</b> <span className="text-muted">{a.action.replace(/[._]/g, " ")}</span>
                    </span>
                    <span className="shrink-0 text-xs text-muted">{prettyDate(a.createdAt, "MMM d, h:mm a")}</span>
                  </div>
                ))
              ) : (
                <p className="px-5 py-4 text-muted">No activity yet.</p>
              )}
            </Card>
          </div>
        </div>

        <div className="space-y-6">
          <Card>
            <div className="flex items-center justify-between">
              <p className="font-display text-lg font-semibold">Top 5 · {monthLabel(month).split(" ")[0]}</p>
              <Link href="/admin/scholar" className="text-sm font-semibold text-brand">Crown</Link>
            </div>
            <ol className="mt-3 space-y-2">
              {top.length ? (
                top.map((r, i) => (
                  <li key={r.userId} className="flex items-center gap-3">
                    <span className="w-4 text-center text-sm font-bold text-muted">{i + 1}</span>
                    <Avatar name={r.name} avatarKey={r.avatarKey} size={32} ring={i === 0 ? "gold" : undefined} />
                    <Link href={`/admin/users/${r.userId}`} className="flex-1 truncate text-sm font-medium hover:underline">
                      {r.name}
                    </Link>
                    <span className="text-sm font-bold tabular-nums">{r.points}</span>
                  </li>
                ))
              ) : (
                <p className="text-sm text-muted">No points yet this month.</p>
              )}
            </ol>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <p className="font-display text-lg font-semibold">🎂 Birthdays · 7 days</p>
              <Link href="/admin/birthdays" className="text-sm font-semibold text-brand">All</Link>
            </div>
            <ul className="mt-3 space-y-2">
              {birthdays.length ? (
                birthdays.map((b) => (
                  <li key={b.userId} className="flex items-center gap-3">
                    <Avatar name={b.name} avatarKey={b.avatarKey} size={32} ring={b.daysAway === 0 ? "gold" : undefined} />
                    <span className="flex-1 truncate text-sm font-medium">{b.name}</span>
                    <span className={b.daysAway === 0 ? "text-sm font-bold text-gold" : "text-sm text-muted"}>
                      {b.daysAway === 0 ? "Today!" : prettyDate(b.birthday, "MMM d")}
                    </span>
                  </li>
                ))
              ) : (
                <p className="text-sm text-muted">None this week.</p>
              )}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
