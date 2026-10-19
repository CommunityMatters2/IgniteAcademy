import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import { FormBuilder } from "@/components/admin/form-builder";
import { Card, PageHeader } from "@/components/ui/primitives";
import { getCohorts } from "@/lib/admin-data";
import { requireAdmin } from "@/lib/session";

export const metadata: Metadata = { title: "New form" };

export default async function NewFormPage() {
  await requireAdmin();
  const cohorts = await getCohorts();
  return (
    <div className="mx-auto max-w-2xl animate-rise">
      <Link href="/admin/forms" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-fg">
        <ArrowLeft className="size-4" /> Forms
      </Link>
      <PageHeader title="New form" />
      <Card>
        <FormBuilder cohorts={cohorts} />
      </Card>
    </div>
  );
}
