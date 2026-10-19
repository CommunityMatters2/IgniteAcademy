import Link from "next/link";
import type { Metadata } from "next";
import { CheckCircle2, ChevronRight, ClipboardList } from "lucide-react";
import { Card, EmptyState, PageHeader, Pill, SectionTitle } from "@/components/ui/primitives";
import { prettyDate, zonedToday } from "@/lib/dates";
import { requireStudent } from "@/lib/session";
import { getOpenForms } from "@/lib/student-data";

export const metadata: Metadata = { title: "Forms" };

export default async function FormsPage() {
  const { user, profile } = await requireStudent();
  const { open, done } = await getOpenForms(user.id, profile.cohortId);
  const today = zonedToday().iso;

  return (
    <div className="animate-rise">
      <PageHeader eyebrow="Paperless" title="Forms" subtitle="Permission slips, sign-offs and surveys — right from your phone." />
      <SectionTitle className="mt-0">To do</SectionTitle>
      {open.length ? (
        <div className="space-y-2">
          {open.map((f) => {
            const overdue = f.dueDate && f.dueDate < today;
            return (
              <Link key={f.id} href={`/forms/${f.id}`} className="block">
                <Card className="flex items-center gap-3 p-4 transition-colors hover:border-brand/50">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-info-soft text-info">
                    <ClipboardList className="size-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{f.title}</p>
                    {f.dueDate && (
                      <p className="text-xs text-muted">
                        {overdue ? <Pill tone="red">Overdue</Pill> : `Due ${prettyDate(f.dueDate, "MMM d")}`}
                      </p>
                    )}
                  </div>
                  <ChevronRight className="size-5 text-muted" />
                </Card>
              </Link>
            );
          })}
        </div>
      ) : (
        <EmptyState icon="🎉" title="All caught up" body="No forms waiting on you." />
      )}
      {done.length > 0 && (
        <>
          <SectionTitle>Completed</SectionTitle>
          <div className="space-y-2">
            {done.map((f) => (
              <Link
                key={f.id}
                href={`/forms/${f.id}`}
                className="flex items-center gap-3 rounded-2xl bg-surface-2 px-4 py-3 text-sm"
              >
                <CheckCircle2 className="size-5 text-brand" />
                <span className="flex-1 truncate">{f.title}</span>
                <span className="text-xs text-muted">Edit</span>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
