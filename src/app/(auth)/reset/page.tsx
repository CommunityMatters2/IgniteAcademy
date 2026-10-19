import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { ResetForm } from "@/components/auth/forms";
import { Skeleton } from "@/components/ui/primitives";

export const metadata: Metadata = { title: "Choose a new password" };

export default function ResetPage({ searchParams }: PageProps<"/reset">) {
  return (
    <div className="animate-rise">
      <h1 className="font-display text-4xl font-bold tracking-tight">New password</h1>
      <p className="mt-2 mb-8 text-muted">Choose something you&apos;ll remember.</p>
      <Suspense fallback={<Skeleton className="h-60" />}>
        <ResetBody searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function ResetBody({ searchParams }: { searchParams: PageProps<"/reset">["searchParams"] }) {
  const { token } = await searchParams;
  if (typeof token !== "string" || !token)
    return (
      <p className="text-sm text-muted">
        This link is missing its token.{" "}
        <Link href="/forgot" className="font-semibold text-brand">
          Request a new one
        </Link>
        .
      </p>
    );
  return <ResetForm token={token} />;
}
