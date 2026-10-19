import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { asc, eq } from "drizzle-orm";
import { ArrowLeft, Check, Pencil, Trash2, Video, X } from "lucide-react";
import { SessionForm } from "@/components/admin/session-form";
import { Avatar } from "@/components/ui/avatar";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, EmptyState, PageHeader, Pill, SectionTitle } from "@/components/ui/primitives";
import { Sheet } from "@/components/ui/sheet";
import { db } from "@/db";
import { sessionSignup, tutorSession, user } from "@/db/schema";
import { deleteSessionAction, markAttendanceAction } from "@/actions/admin";
import { nowMs, zonedDateTime } from "@/lib/dates";
import { requireStaff } from "@/lib/session";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Session" };

export default async function SessionDetail({ params }: PageProps<"/admin/sessions/[id]">) {
  await requireStaff();
  const { id } = await params;
  const s = await db.query.tutorSession.findFirst({ where: eq(tutorSession.id, id) });
  if (!s) notFound();
  const signups = await db
    .select({ su: sessionSignup, name: user.name, email: user.email })
    .from(sessionSignup)
    .innerJoin(user, eq(user.id, sessionSignup.userId))
    .where(eq(sessionSignup.sessionId, id))
    .orderBy(asc(user.name));
  const started = s.startsAt.getTime() <= nowMs();

  return (
    <div className="animate-rise">
      <Link href="/admin/sessions" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-fg">
        <ArrowLeft className="size-4" /> Help Center
      </Link>
      <PageHeader
        eyebrow={`${s.provider} · ${s.subject}`}
        title={s.title}
        subtitle={`${zonedDateTime(s.startsAt, { year: "numeric" })} · ${s.durationMin} min${s.tutorName ? ` · ${s.tutorName}` : ""}`}
      />
      <div className="mb-6 flex flex-wrap gap-2">
        {s.meetingUrl && (
          <a href={s.meetingUrl} target="_blank" rel="noreferrer" className={buttonVariants({ size: "sm" })}>
            <Video /> Open meeting
          </a>
        )}
        <Sheet title="Edit session" trigger={<Button size="sm" variant="secondary"><Pencil /> Edit</Button>}>
          <SessionForm
            d={{
              ...s,
              startsAt: s.startsAt.toISOString(),
            }}
          />
        </Sheet>
        <Sheet
          title="Delete this session?"
          description={`${signups.length} student(s) signed up will lose their spot.`}
          trigger={<Button size="sm" variant="danger-ghost"><Trash2 /> Delete</Button>}
        >
          <form action={deleteSessionAction}>
            <input type="hidden" name="id" value={s.id} />
            <Button variant="danger" block>
              Delete session
            </Button>
          </form>
        </Sheet>
      </div>

      <SectionTitle className="mt-0">
        Signed up · {signups.length}
        {s.capacity ? ` / ${s.capacity}` : ""}
      </SectionTitle>
      {signups.length ? (
        <Card className="divide-y divide-border p-0">
          {signups.map(({ su, name, email }) => (
            <div key={su.userId} className="flex items-center gap-3 px-5 py-3">
              <Avatar name={name} size={36} />
              <div className="min-w-0 flex-1">
                <Link href={`/admin/users/${su.userId}`} className="block truncate font-semibold hover:underline">
                  {name}
                </Link>
                <p className="truncate text-xs text-muted">{email}</p>
              </div>
              {started ? (
                <div className="flex gap-1.5">
                  {(["yes", "no"] as const).map((v) => (
                    <form key={v} action={markAttendanceAction}>
                      <input type="hidden" name="sessionId" value={s.id} />
                      <input type="hidden" name="userId" value={su.userId} />
                      <input type="hidden" name="attended" value={v} />
                      <button
                        aria-label={v === "yes" ? "Attended" : "Absent"}
                        className={cn(
                          "flex size-9 items-center justify-center rounded-full border",
                          v === "yes" && su.attended === true && "border-brand bg-brand text-brand-fg",
                          v === "no" && su.attended === false && "border-danger bg-danger text-white",
                          su.attended === null || (v === "yes" ? su.attended !== true : su.attended !== false)
                            ? "border-border text-muted hover:text-fg"
                            : "",
                        )}
                      >
                        {v === "yes" ? <Check className="size-4" /> : <X className="size-4" />}
                      </button>
                    </form>
                  ))}
                </div>
              ) : (
                <Pill>Signed up</Pill>
              )}
            </div>
          ))}
        </Card>
      ) : (
        <EmptyState icon="🪑" title="No sign-ups yet" />
      )}
      {started && <p className="mt-3 text-xs text-muted">Marking “attended” awards tutoring points automatically.</p>}
    </div>
  );
}
