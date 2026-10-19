import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { desc, eq } from "drizzle-orm";
import { ArrowLeft, Download, Trash2 } from "lucide-react";
import { FormBuilder } from "@/components/admin/form-builder";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, EmptyState, PageHeader, Pill, SectionTitle } from "@/components/ui/primitives";
import { Sheet } from "@/components/ui/sheet";
import { db } from "@/db";
import { form, formResponse, user } from "@/db/schema";
import { deleteFormAction } from "@/actions/admin";
import { getCohorts, getStudents } from "@/lib/admin-data";
import { prettyDate } from "@/lib/dates";
import { requireAdmin } from "@/lib/session";

export const metadata: Metadata = { title: "Form" };

export default async function FormDetail({ params }: PageProps<"/admin/forms/[id]">) {
  await requireAdmin();
  const { id } = await params;
  const f = await db.query.form.findFirst({ where: eq(form.id, id) });
  if (!f) notFound();
  const [cohorts, responses, students] = await Promise.all([
    getCohorts(),
    db
      .select({ r: formResponse, name: user.name })
      .from(formResponse)
      .innerJoin(user, eq(user.id, formResponse.userId))
      .where(eq(formResponse.formId, id))
      .orderBy(desc(formResponse.submittedAt)),
    getStudents(),
  ]);
  const assigned = students.filter(
    (s) => s.role === "student" && !s.banned && s.onboardedAt && (f.audience === "all" || s.cohortId === f.audience),
  );
  const done = new Set(responses.map((r) => r.r.userId));
  const missing = assigned.filter((s) => !done.has(s.id));

  return (
    <div className="animate-rise">
      <Link href="/admin/forms" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-fg">
        <ArrowLeft className="size-4" /> Forms
      </Link>
      <PageHeader
        title={f.title}
        subtitle={`${responses.length} of ${assigned.length} assigned students responded`}
        action={
          <div className="flex gap-2">
            <a href={`/admin/forms/${f.id}/export`} className={buttonVariants({ size: "sm", variant: "secondary" })}>
              <Download /> CSV
            </a>
            <Sheet title="Delete this form?" description="All responses will be deleted too." trigger={<Button size="icon-sm" variant="danger-ghost" aria-label="Delete form"><Trash2 /></Button>}>
              <form action={deleteFormAction}>
                <input type="hidden" name="id" value={f.id} />
                <Button variant="danger" block>
                  Delete form
                </Button>
              </form>
            </Sheet>
          </div>
        }
      />
      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <Card>
            <FormBuilder
              cohorts={cohorts}
              initial={{
                id: f.id,
                title: f.title,
                description: f.description,
                fields: f.fields,
                requireSignature: f.requireSignature,
                audience: f.audience,
                dueDate: f.dueDate,
                status: f.status,
              }}
            />
          </Card>
        </div>
        <div className="space-y-6 lg:col-span-2">
          <div>
            <SectionTitle className="mt-0">Responses</SectionTitle>
            {responses.length ? (
              <div className="space-y-2">
                {responses.map(({ r, name }) => (
                  <details key={r.id} className="group rounded-2xl border border-border bg-surface">
                    <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3">
                      <span className="font-semibold">{name}</span>
                      <span className="text-xs text-muted">{prettyDate(r.submittedAt, "MMM d")}</span>
                    </summary>
                    <dl className="space-y-2 border-t border-border px-4 py-3 text-sm">
                      {f.fields.map((field) => (
                        <div key={field.id}>
                          <dt className="text-xs text-muted">{field.label}</dt>
                          <dd>{typeof r.answers[field.id] === "boolean" ? (r.answers[field.id] ? "✅ Yes" : "—") : String(r.answers[field.id] ?? "—")}</dd>
                        </div>
                      ))}
                      {r.signatureData && (
                        <div>
                          <dt className="text-xs text-muted">Signed by {r.signatureName}</dt>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={r.signatureData} alt={`Signature of ${r.signatureName}`} className="mt-1 h-16 rounded-lg bg-white p-1" />
                        </div>
                      )}
                    </dl>
                  </details>
                ))}
              </div>
            ) : (
              <EmptyState icon="📭" title="No responses yet" />
            )}
          </div>
          {f.status === "published" && missing.length > 0 && (
            <div>
              <SectionTitle className="mt-0">Still waiting on · {missing.length}</SectionTitle>
              <div className="flex flex-wrap gap-1.5">
                {missing.map((s) => (
                  <Link key={s.id} href={`/admin/users/${s.id}`}>
                    <Pill>{s.name}</Pill>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
