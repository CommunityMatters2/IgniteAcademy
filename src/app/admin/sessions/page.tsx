import Link from "next/link";
import type { Metadata } from "next";
import { asc, count, desc, eq, gte, lt } from "drizzle-orm";
import { CalendarPlus, Check, ChevronRight } from "lucide-react";
import { SessionForm } from "@/components/admin/session-form";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, EmptyState, PageHeader, Pill, SectionTitle } from "@/components/ui/primitives";
import { Sheet } from "@/components/ui/sheet";
import { db } from "@/db";
import { helpRequest, sessionSignup, tutorSession, user } from "@/db/schema";
import { resolveHelpRequestAction } from "@/actions/admin";
import { prettyDate, zonedDateTime } from "@/lib/dates";
import { requireStaff } from "@/lib/session";

export const metadata: Metadata = { title: "Help Center" };

type SessionRow = typeof tutorSession.$inferSelect;

function Row({ s, signups }: { s: SessionRow; signups: number }) {
  return (
    <Link href={`/admin/sessions/${s.id}`} className="flex items-center gap-3 px-5 py-3.5 hover:bg-surface-2">
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">{s.title}</p>
        <p className="text-xs text-muted">
          {zonedDateTime(s.startsAt)} · {s.tutorName ?? s.provider}
        </p>
      </div>
      <Pill tone="blue">{s.subject}</Pill>
      <span className="w-14 text-right text-sm text-muted tabular-nums">
        {signups}
        {s.capacity ? `/${s.capacity}` : ""}
      </span>
      <ChevronRight className="size-4 text-muted" />
    </Link>
  );
}

export default async function SessionsAdmin() {
  await requireStaff();
  const now = new Date();
  const [upcoming, past, counts, requests] = await Promise.all([
    db.select().from(tutorSession).where(gte(tutorSession.startsAt, now)).orderBy(asc(tutorSession.startsAt)).limit(60),
    db.select().from(tutorSession).where(lt(tutorSession.startsAt, now)).orderBy(desc(tutorSession.startsAt)).limit(15),
    db.select({ id: sessionSignup.sessionId, n: count() }).from(sessionSignup).groupBy(sessionSignup.sessionId),
    db
      .select({ r: helpRequest, name: user.name })
      .from(helpRequest)
      .innerJoin(user, eq(user.id, helpRequest.userId))
      .where(eq(helpRequest.status, "open"))
      .orderBy(asc(helpRequest.createdAt)),
  ]);
  const countMap = new Map(counts.map((c) => [c.id, c.n]));

  return (
    <div className="animate-rise">
      <PageHeader
        title="Help Center"
        subtitle="ORBIT tutoring sessions, sign-ups and attendance."
        action={
          <Sheet
            title="New tutoring session"
            trigger={
              <Button size="sm">
                <CalendarPlus /> New
              </Button>
            }
          >
            <SessionForm />
          </Sheet>
        }
      />

      <SectionTitle className="mt-0">Upcoming</SectionTitle>
      {upcoming.length ? (
        <Card className="divide-y divide-border p-0">
          {upcoming.map((s) => (
            <Row key={s.id} s={s} signups={countMap.get(s.id) ?? 0} />
          ))}
        </Card>
      ) : (
        <EmptyState icon="📅" title="No upcoming sessions" body="Create one — use “Repeat weekly” for recurring ORBIT sessions." />
      )}

      <div id="requests" className="scroll-mt-20" />
      <SectionTitle>Open help requests</SectionTitle>
      {requests.length ? (
        <div className="space-y-2">
          {requests.map(({ r, name }) => (
            <Card key={r.id} className="flex items-start gap-3 p-4">
              <Avatar name={name} size={36} />
              <div className="min-w-0 flex-1">
                <p className="text-sm">
                  <b>{name}</b> · <Pill tone="blue">{r.subject}</Pill>
                </p>
                <p className="mt-1 text-sm text-muted">{r.message}</p>
                <p className="mt-1 text-xs text-muted">{prettyDate(r.createdAt, "MMM d, h:mm a")}</p>
              </div>
              <form action={resolveHelpRequestAction}>
                <input type="hidden" name="id" value={r.id} />
                <Button size="sm" variant="secondary">
                  <Check /> Done
                </Button>
              </form>
            </Card>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted">No open requests.</p>
      )}

      {past.length > 0 && (
        <>
          <SectionTitle>Recent (mark attendance)</SectionTitle>
          <Card className="divide-y divide-border p-0">
            {past.map((s) => (
              <Row key={s.id} s={s} signups={countMap.get(s.id) ?? 0} />
            ))}
          </Card>
        </>
      )}
    </div>
  );
}
