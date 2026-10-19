import Link from "next/link";
import type { Metadata } from "next";
import { asc, eq } from "drizzle-orm";
import { ReviewActions } from "@/components/admin/admin-forms";
import { FilePreview } from "@/components/admin/file-preview";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, EmptyState, PageHeader, Pill } from "@/components/ui/primitives";
import { db } from "@/db";
import { attendanceCheckin, badgeClaim, reportCard } from "@/db/schema";
import { bulkApproveAction, reviewCheckinAction, reviewClaimAction, reviewReportCardAction } from "@/actions/admin";
import { getPendingCounts } from "@/lib/admin-data";
import { prettyDate } from "@/lib/dates";
import { requireAdmin } from "@/lib/session";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Review queue" };

const TABS = [
  { key: "cards", label: "Report cards" },
  { key: "checkins", label: "Check-ins" },
  { key: "claims", label: "Badge claims" },
] as const;

function Student({ id, name, avatarKey, sub }: { id: string; name: string; avatarKey?: string | null; sub: string }) {
  return (
    <Link href={`/admin/users/${id}`} className="flex items-center gap-3">
      <Avatar name={name} avatarKey={avatarKey} size={40} />
      <span className="min-w-0">
        <span className="block truncate font-semibold hover:underline">{name}</span>
        <span className="block text-xs text-muted">{sub}</span>
      </span>
    </Link>
  );
}

export default async function ReviewsPage({ searchParams }: PageProps<"/admin/reviews">) {
  await requireAdmin();
  const sp = await searchParams;
  const tab = TABS.some((t) => t.key === sp.tab) ? (sp.tab as (typeof TABS)[number]["key"]) : "cards";
  const counts = await getPendingCounts();
  const countFor = { cards: counts.cards, checkins: counts.checkins, claims: counts.claims };

  return (
    <div className="animate-rise">
      <PageHeader title="Review queue" subtitle="Approve submissions to award points and keep eligibility current." />
      <div className="no-scrollbar mb-6 flex gap-2 overflow-x-auto">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/admin/reviews?tab=${t.key}`}
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold",
              tab === t.key ? "border-brand bg-brand-soft text-fg" : "border-border text-muted hover:text-fg",
            )}
          >
            {t.label}
            {countFor[t.key] > 0 && (
              <span className="rounded-full bg-gold px-1.5 text-[11px] font-bold text-gold-fg">{countFor[t.key]}</span>
            )}
          </Link>
        ))}
      </div>
      {tab === "cards" && <ReportCards />}
      {tab === "checkins" && <Checkins />}
      {tab === "claims" && <Claims />}
    </div>
  );
}

async function ReportCards() {
  const items = await db.query.reportCard.findMany({
    where: eq(reportCard.status, "pending"),
    orderBy: asc(reportCard.createdAt),
    with: { user: { with: { profile: true } }, term: true, grades: true },
  });
  if (!items.length) return <EmptyState icon="✨" title="No report cards waiting" />;
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {items.map((c) => (
        <Card key={c.id} className="space-y-4">
          <Student
            id={c.userId}
            name={c.user.name}
            avatarKey={c.user.profile?.avatarKey}
            sub={`${c.term?.name ?? "No term"} · sent ${prettyDate(c.createdAt, "MMM d")}`}
          />
          <FilePreview fileKey={c.fileKey} contentType={c.contentType} />
          <div className="flex flex-wrap gap-1.5 text-xs">
            {c.gpa && <Pill>GPA {c.gpa}</Pill>}
            <Pill tone={c.allPassing === true ? "green" : c.allPassing === false ? "red" : "neutral"}>
              Student says: {c.allPassing === true ? "passing all" : c.allPassing === false ? "not all passing" : "not sure"}
            </Pill>
            {c.grades.map((g) => (
              <Pill key={g.id} tone={g.passing ? "neutral" : "red"}>
                {g.subject}: {g.mark}
              </Pill>
            ))}
          </div>
          {c.note && <p className="rounded-2xl bg-surface-2 px-3 py-2 text-sm">“{c.note}”</p>}
          <ReviewActions
            action={reviewReportCardAction}
            id={c.id}
            extra={
              <label className="flex items-center justify-between gap-3 text-sm">
                <span className="text-muted">Verified passing all classes?</span>
                <select
                  name="allPassing"
                  defaultValue={c.allPassing === true ? "yes" : c.allPassing === false ? "no" : ""}
                  className="h-9 rounded-xl border border-border bg-surface-2 px-2 text-sm"
                >
                  <option value="">Unknown</option>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
              </label>
            }
          />
        </Card>
      ))}
    </div>
  );
}

async function Checkins() {
  const items = await db.query.attendanceCheckin.findMany({
    where: eq(attendanceCheckin.status, "pending"),
    orderBy: asc(attendanceCheckin.createdAt),
    with: { user: { with: { profile: true } } },
  });
  if (!items.length) return <EmptyState icon="✨" title="No check-ins waiting" />;
  return (
    <>
      <form action={bulkApproveAction} id="bulk" className="mb-4 flex items-center justify-between rounded-2xl bg-surface-2 px-4 py-3">
        <input type="hidden" name="kind" value="checkin" />
        <span className="text-sm text-muted">Tick check-ins below, then approve them together.</span>
        <Button size="sm">Approve selected</Button>
      </form>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {items.map((c) => (
          <Card key={c.id} className="space-y-3">
            <div className="flex items-start justify-between gap-2">
              <Student
                id={c.userId}
                name={c.user.name}
                avatarKey={c.user.profile?.avatarKey}
                sub={`Week of ${prettyDate(c.weekOf, "MMM d")}`}
              />
              <input form="bulk" type="checkbox" name="ids" value={c.id} className="mt-2 size-5 accent-[var(--brand)]" aria-label="Select for bulk approve" />
            </div>
            <div className="flex gap-2 text-xs">
              <Pill tone="green">{c.daysPresent} days present</Pill>
              <Pill tone={c.daysLate ? "gold" : "green"}>{c.daysLate} late</Pill>
            </div>
            <FilePreview fileKey={c.proofKey} contentType={c.contentType} />
            {c.note && <p className="rounded-2xl bg-surface-2 px-3 py-2 text-sm">“{c.note}”</p>}
            <ReviewActions action={reviewCheckinAction} id={c.id} />
          </Card>
        ))}
      </div>
    </>
  );
}

async function Claims() {
  const items = await db.query.badgeClaim.findMany({
    where: eq(badgeClaim.status, "pending"),
    orderBy: asc(badgeClaim.createdAt),
    with: { user: true, badge: true },
  });
  if (!items.length) return <EmptyState icon="✨" title="No badge claims waiting" />;
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {items.map((c) => (
        <Card key={c.id} className="space-y-3">
          <Student id={c.userId} name={c.user.name} sub={`Sent ${prettyDate(c.createdAt, "MMM d")}`} />
          <div className="flex items-center gap-3 rounded-2xl bg-gold-soft p-3">
            <span className="text-3xl">{c.badge.emoji}</span>
            <span>
              <span className="block font-semibold">{c.badge.name}</span>
              <span className="block text-xs text-muted">
                {c.badge.description} · +{c.badge.points} pts
              </span>
            </span>
          </div>
          {c.proofKey && <FilePreview fileKey={c.proofKey} contentType={c.contentType} />}
          {c.note && <p className="rounded-2xl bg-surface-2 px-3 py-2 text-sm">“{c.note}”</p>}
          <ReviewActions action={reviewClaimAction} id={c.id} />
        </Card>
      ))}
    </div>
  );
}
