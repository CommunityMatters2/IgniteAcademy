import Link from "next/link";
import type { Metadata } from "next";
import { desc, eq } from "drizzle-orm";
import { CalendarCheck, FileText, Flame, GraduationCap, Mail, Plus, ShieldCheck } from "lucide-react";
import { CheckinForm, ReportCardForm } from "@/components/app/school-forms";
import { Button } from "@/components/ui/button";
import { Card, EmptyState, PageHeader, Pill, SectionTitle, reviewLabel, reviewTone } from "@/components/ui/primitives";
import { Sheet } from "@/components/ui/sheet";
import { db } from "@/db";
import { attendanceCheckin, counselorVerification, reportCard, term } from "@/db/schema";
import { addDaysIso, prettyDate, weekOf, zonedToday } from "@/lib/dates";
import { requireStudent } from "@/lib/session";
import { getCheckinStreak } from "@/lib/student-data";
import { fileUrl } from "@/lib/storage";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "School" };

export default async function SchoolPage({ searchParams }: PageProps<"/school">) {
  const { user, profile } = await requireStudent();
  const [sp, terms, cards, checkins, verifications, streak] = await Promise.all([
    searchParams,
    db.select().from(term).orderBy(desc(term.startsOn)),
    db.query.reportCard.findMany({
      where: eq(reportCard.userId, user.id),
      orderBy: desc(reportCard.createdAt),
      with: { grades: true, term: true },
      limit: 20,
    }),
    db
      .select()
      .from(attendanceCheckin)
      .where(eq(attendanceCheckin.userId, user.id))
      .orderBy(desc(attendanceCheckin.weekOf))
      .limit(16),
    db
      .select()
      .from(counselorVerification)
      .where(eq(counselorVerification.userId, user.id))
      .orderBy(desc(counselorVerification.createdAt))
      .limit(1),
    getCheckinStreak(user.id),
  ]);

  const currentTerm = terms.find((t) => t.isCurrent);
  const thisWeek = weekOf(zonedToday().iso);
  const byWeek = new Map(checkins.map((c) => [c.weekOf, c]));
  const recentWeeks = Array.from({ length: 8 }, (_, i) => addDaysIso(thisWeek, -7 * (7 - i)));
  const weekOptions = Array.from({ length: 4 }, (_, i) => {
    const w = addDaysIso(thisWeek, -7 * i);
    const c = byWeek.get(w);
    return {
      value: w,
      label: `${i === 0 ? "This week" : i === 1 ? "Last week" : `Week of ${prettyDate(w, "MMM d")}`}${c ? ` · ${reviewLabel(c.status)}` : ""}`,
      disabled: c?.status === "approved",
    };
  });
  const verification = verifications[0];

  return (
    <div className="animate-rise">
      <PageHeader
        eyebrow="Grades & attendance"
        title="School"
        subtitle="IGNITE is a privilege: stay enrolled, on time and passing."
      />

      {/* Report cards */}
      <SectionTitle
        className="mt-2"
        action={
          <Sheet
            key={`report-${sp.add}`}
            defaultOpen={sp.add === "report"}
            title="Upload report card"
            description="Snap a clear photo of every page, or upload the PDF from your school portal."
            trigger={
              <Button size="sm">
                <Plus /> Upload
              </Button>
            }
          >
            <ReportCardForm terms={terms.map((t) => ({ id: t.id, name: t.name }))} currentTermId={currentTerm?.id} />
          </Sheet>
        }
      >
        Report cards
      </SectionTitle>
      {currentTerm && (
        <p className="-mt-1 mb-3 text-sm text-muted">
          Current grading period: <span className="font-semibold text-fg">{currentTerm.name}</span>
        </p>
      )}
      {cards.length ? (
        <div className="space-y-3">
          {cards.map((c) => (
            <Card key={c.id} className="p-4">
              <div className="flex items-start gap-3">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-brand-soft text-brand">
                  <GraduationCap className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate font-semibold">{c.term?.name ?? "Report card"}</p>
                    <Pill tone={reviewTone(c.status)}>{reviewLabel(c.status)}</Pill>
                  </div>
                  <p className="text-xs text-muted">
                    Sent {prettyDate(c.createdAt, "MMM d")}
                    {c.gpa ? ` · GPA ${c.gpa}` : ""}
                    {c.allPassing === true ? " · Passing all ✅" : c.allPassing === false ? " · Not all passing" : ""}
                  </p>
                </div>
              </div>
              {c.grades.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {c.grades.map((g) => (
                    <span
                      key={g.id}
                      className={cn(
                        "rounded-full px-2.5 py-1 text-xs font-medium",
                        g.passing ? "bg-surface-2 text-fg" : "bg-danger-soft text-danger",
                      )}
                    >
                      {g.subject}: <b>{g.mark}</b>
                    </span>
                  ))}
                </div>
              )}
              {c.reviewNote && (
                <p className="mt-3 rounded-2xl bg-surface-2 px-3 py-2 text-sm">
                  <span className="font-semibold">Staff: </span>
                  {c.reviewNote}
                </p>
              )}
              <a
                href={fileUrl(c.fileKey)!}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-brand"
              >
                <FileText className="size-4" /> View file
              </a>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          icon="📄"
          title="No report cards yet"
          body="Upload your latest report card to stay eligible."
        />
      )}

      {/* Attendance */}
      <div id="attendance" className="scroll-mt-20" />
      <SectionTitle
        action={
          <Sheet
            key={`checkin-${sp.add}`}
            defaultOpen={sp.add === "checkin"}
            title="Weekly check-in"
            description="Show you're going to school and on time."
            trigger={
              <Button size="sm">
                <CalendarCheck /> Check in
              </Button>
            }
          >
            <CheckinForm weeks={weekOptions} />
          </Sheet>
        }
      >
        Attendance
      </SectionTitle>
      <Card>
        <div className="flex items-center gap-3">
          <span
            className={cn(
              "flex size-12 items-center justify-center rounded-2xl",
              streak ? "bg-[#ff8a3d]/15 text-[#ff8a3d]" : "bg-surface-2 text-muted",
            )}
          >
            <Flame className="size-6" />
          </span>
          <div>
            <p className="font-display text-xl font-bold">
              {streak} week{streak === 1 ? "" : "s"} streak
            </p>
            <p className="text-sm text-muted">Check in every week to keep it going.</p>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-8 gap-1.5">
          {recentWeeks.map((w) => {
            const c = byWeek.get(w);
            const tone = !c
              ? "bg-surface-2"
              : c.status === "approved"
                ? c.daysLate === 0
                  ? "bg-brand"
                  : "bg-brand/60"
                : c.status === "pending"
                  ? "bg-gold"
                  : "bg-danger";
            return (
              <div key={w} className="text-center">
                <div className={cn("aspect-square rounded-xl", tone, w === thisWeek && "ring-2 ring-fg/30 ring-offset-2 ring-offset-surface")} />
                <p className="mt-1 text-[10px] text-muted">{prettyDate(w, "M/d")}</p>
              </div>
            );
          })}
        </div>
        <div className="mt-4 flex flex-wrap gap-3 text-[11px] text-muted">
          <span className="flex items-center gap-1"><i className="size-2.5 rounded-sm bg-brand" />On time</span>
          <span className="flex items-center gap-1"><i className="size-2.5 rounded-sm bg-brand/60" />Some late</span>
          <span className="flex items-center gap-1"><i className="size-2.5 rounded-sm bg-gold" />In review</span>
          <span className="flex items-center gap-1"><i className="size-2.5 rounded-sm bg-danger" />Needs redo</span>
        </div>
      </Card>
      {checkins.filter((c) => c.status === "rejected" && c.reviewNote).slice(0, 2).map((c) => (
        <p key={c.id} className="mt-3 rounded-2xl bg-danger-soft px-4 py-3 text-sm text-danger">
          Week of {prettyDate(c.weekOf, "MMM d")}: {c.reviewNote}
        </p>
      ))}

      {/* Counselor */}
      <SectionTitle>Guidance counselor</SectionTitle>
      <Card className="flex items-start gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-info-soft text-info">
          <ShieldCheck className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          {profile.counselorEmail ? (
            <>
              <p className="font-semibold">{profile.counselorName ?? "Counselor"}</p>
              <p className="flex items-center gap-1 truncate text-sm text-muted">
                <Mail className="size-3.5" /> {profile.counselorEmail}
              </p>
              {verification && (
                <p className="mt-2 text-sm">
                  {verification.status === "completed" ? (
                    <Pill tone="green">Verified {prettyDate(verification.respondedAt ?? verification.createdAt, "MMM d")}</Pill>
                  ) : (
                    <Pill tone="gold">Verification requested</Pill>
                  )}
                </p>
              )}
            </>
          ) : (
            <p className="text-sm text-muted">
              Add your counselor so staff can confirm you&apos;re enrolled and on track.
            </p>
          )}
          <Link href="/me/profile" className="mt-2 inline-block text-sm font-semibold text-brand">
            {profile.counselorEmail ? "Edit" : "Add counselor"}
          </Link>
        </div>
      </Card>
    </div>
  );
}
