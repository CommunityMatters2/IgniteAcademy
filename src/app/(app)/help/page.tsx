import type { Metadata } from "next";
import { and, asc, count, desc, eq, gte, sql } from "drizzle-orm";
import { Clock, HandHelping, Users, Video } from "lucide-react";
import { HelpRequestForm, SignupButton } from "@/components/app/mini-forms";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, EmptyState, PageHeader, Pill, SectionTitle } from "@/components/ui/primitives";
import { Sheet } from "@/components/ui/sheet";
import { db } from "@/db";
import { helpRequest, sessionSignup, tutorSession } from "@/db/schema";
import { nowMs, zonedDateTime } from "@/lib/dates";
import { requireStudent } from "@/lib/session";

export const metadata: Metadata = { title: "Help Center" };

export default async function HelpPage() {
  const { user } = await requireStudent();
  const [sessions, counts, mine, requests] = await Promise.all([
    db
      .select()
      .from(tutorSession)
      .where(gte(tutorSession.startsAt, sql`now() - (${tutorSession.durationMin} * interval '1 minute')`))
      .orderBy(asc(tutorSession.startsAt))
      .limit(40),
    db.select({ sessionId: sessionSignup.sessionId, n: count() }).from(sessionSignup).groupBy(sessionSignup.sessionId),
    db.select({ sessionId: sessionSignup.sessionId }).from(sessionSignup).where(eq(sessionSignup.userId, user.id)),
    db
      .select()
      .from(helpRequest)
      .where(and(eq(helpRequest.userId, user.id)))
      .orderBy(desc(helpRequest.createdAt))
      .limit(3),
  ]);
  const countMap = new Map(counts.map((c) => [c.sessionId, c.n]));
  const mineSet = new Set(mine.map((m) => m.sessionId));
  const now = nowMs();
  const subjects = [...new Set(sessions.map((s) => s.subject))];

  return (
    <div className="animate-rise">
      <PageHeader
        eyebrow="Academic help"
        title="Help Center"
        subtitle="Free tutoring with ORBIT and IGNITE tutors. Grab a seat, then join on Zoom."
      />

      <div className="mb-2 flex flex-wrap gap-2">
        {subjects.map((s) => (
          <Pill key={s} tone="blue">
            {s}
          </Pill>
        ))}
      </div>

      <SectionTitle className="mt-4">Upcoming sessions</SectionTitle>
      {sessions.length ? (
        <div className="space-y-3">
          {sessions.map((s) => {
            const signedUp = mineSet.has(s.id);
            const taken = countMap.get(s.id) ?? 0;
            const full = s.capacity != null && taken >= s.capacity;
            const live = s.startsAt.getTime() - 15 * 60_000 <= now && now <= s.startsAt.getTime() + s.durationMin * 60_000;
            return (
              <Card key={s.id} className={signedUp ? "border-brand/50 p-4" : "p-4"}>
                <div className="flex items-start gap-3">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-info-soft text-info">
                    <Video className="size-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Pill tone="blue">{s.subject}</Pill>
                      <Pill>{s.provider}</Pill>
                      {live && <Pill tone="red">● Live</Pill>}
                    </div>
                    <p className="mt-1.5 font-semibold">{s.title}</p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                      <span className="flex items-center gap-1">
                        <Clock className="size-3.5" />
                        {zonedDateTime(s.startsAt)} · {s.durationMin} min
                      </span>
                      {s.tutorName && <span>with {s.tutorName}</span>}
                      {s.capacity != null && (
                        <span className="flex items-center gap-1">
                          <Users className="size-3.5" />
                          {Math.max(0, s.capacity - taken)} spots left
                        </span>
                      )}
                    </p>
                    {s.description && <p className="mt-2 text-sm text-muted">{s.description}</p>}
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-end gap-2">
                  {signedUp && s.meetingUrl && (
                    <a
                      href={s.meetingUrl}
                      target="_blank"
                      rel="noreferrer"
                      className={buttonVariants({ size: "sm", variant: live ? "primary" : "outline" })}
                    >
                      <Video /> Join Zoom
                    </a>
                  )}
                  <SignupButton sessionId={s.id} signedUp={signedUp} full={full} />
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <EmptyState icon="📚" title="No sessions scheduled" body="New tutoring sessions show up here. Need help now? Send a request." />
      )}

      <SectionTitle>Need something specific?</SectionTitle>
      <Card className="flex items-center gap-4">
        <HandHelping className="size-8 shrink-0 text-gold" />
        <div className="flex-1">
          <p className="font-semibold">Request help</p>
          <p className="text-sm text-muted">Tell staff what you&apos;re stuck on and we&apos;ll match you.</p>
        </div>
        <Sheet title="Request help" trigger={<Button size="sm" variant="gold">Ask</Button>}>
          <HelpRequestForm />
        </Sheet>
      </Card>
      {requests.length > 0 && (
        <ul className="mt-3 space-y-2">
          {requests.map((r) => (
            <li key={r.id} className="flex items-center justify-between rounded-2xl bg-surface-2 px-4 py-3 text-sm">
              <span className="truncate">
                <b>{r.subject}</b> · {r.message}
              </span>
              <Pill tone={r.status === "resolved" ? "green" : "gold"}>{r.status === "resolved" ? "Handled" : "Open"}</Pill>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
