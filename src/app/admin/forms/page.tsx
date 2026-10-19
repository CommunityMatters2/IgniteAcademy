import Link from "next/link";
import type { Metadata } from "next";
import { count, desc } from "drizzle-orm";
import { ChevronRight, Plus } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card, EmptyState, PageHeader, Pill } from "@/components/ui/primitives";
import { db } from "@/db";
import { form, formResponse } from "@/db/schema";
import { prettyDate } from "@/lib/dates";
import { requireAdmin } from "@/lib/session";

export const metadata: Metadata = { title: "Forms" };

export default async function FormsAdmin() {
  await requireAdmin();
  const [forms, counts] = await Promise.all([
    db.select().from(form).orderBy(desc(form.createdAt)),
    db.select({ id: formResponse.formId, n: count() }).from(formResponse).groupBy(formResponse.formId),
  ]);
  const countMap = new Map(counts.map((c) => [c.id, c.n]));
  return (
    <div className="animate-rise">
      <PageHeader
        title="Forms"
        subtitle="Go paperless: permission slips, releases and surveys with e-signatures."
        action={
          <Link href="/admin/forms/new" className={buttonVariants({ size: "sm" })}>
            <Plus /> New form
          </Link>
        }
      />
      {forms.length ? (
        <Card className="divide-y divide-border p-0">
          {forms.map((f) => (
            <Link key={f.id} href={`/admin/forms/${f.id}`} className="flex items-center gap-3 px-5 py-4 hover:bg-surface-2">
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{f.title}</p>
                <p className="text-xs text-muted">
                  {f.fields.length} questions{f.dueDate ? ` · due ${prettyDate(f.dueDate, "MMM d")}` : ""}
                </p>
              </div>
              <Pill tone={f.status === "published" ? "green" : f.status === "closed" ? "red" : "neutral"}>{f.status}</Pill>
              <span className="w-20 text-right text-sm text-muted">{countMap.get(f.id) ?? 0} responses</span>
              <ChevronRight className="size-4 text-muted" />
            </Link>
          ))}
        </Card>
      ) : (
        <EmptyState
          icon="📝"
          title="No forms yet"
          body="Start from a template like a permission slip or feedback survey."
          action={
            <Link href="/admin/forms/new" className={buttonVariants({ size: "sm" })}>
              Create a form
            </Link>
          }
        />
      )}
    </div>
  );
}
