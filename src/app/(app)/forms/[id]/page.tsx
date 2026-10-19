import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { and, eq } from "drizzle-orm";
import { ArrowLeft } from "lucide-react";
import { FillForm } from "@/components/app/fill-form";
import { PageHeader } from "@/components/ui/primitives";
import { db } from "@/db";
import { form, formResponse } from "@/db/schema";
import { prettyDate } from "@/lib/dates";
import { requireStudent } from "@/lib/session";

export const metadata: Metadata = { title: "Form" };

export default async function FormPage({ params }: PageProps<"/forms/[id]">) {
  const { user, profile } = await requireStudent();
  const { id } = await params;
  const f = await db.query.form.findFirst({ where: eq(form.id, id) });
  if (!f || f.status !== "published" || (f.audience !== "all" && f.audience !== profile.cohortId)) notFound();
  const prev = await db.query.formResponse.findFirst({
    where: and(eq(formResponse.formId, id), eq(formResponse.userId, user.id)),
  });

  return (
    <div className="animate-rise">
      <Link href="/forms" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-fg">
        <ArrowLeft className="size-4" /> Forms
      </Link>
      <PageHeader
        title={f.title}
        subtitle={
          <>
            {f.description && <span className="block whitespace-pre-line">{f.description}</span>}
            {f.dueDate && <span className="mt-1 block text-xs">Due {prettyDate(f.dueDate)}</span>}
          </>
        }
      />
      {prev && (
        <p className="mb-5 rounded-2xl bg-brand-soft px-4 py-3 text-sm text-brand">
          Submitted {prettyDate(prev.submittedAt, "MMM d, h:mm a")}. You can update your answers below.
        </p>
      )}
      <FillForm formId={f.id} fields={f.fields} requireSignature={f.requireSignature} previous={prev?.answers} />
    </div>
  );
}
