import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { connection } from "next/server";
import { InviteForm } from "@/components/auth/forms";
import { Skeleton } from "@/components/ui/primitives";
import { findValidInvite } from "@/lib/invites";
import { firstName } from "@/lib/utils";

export const metadata: Metadata = { title: "Activate your account" };

export default function InvitePage({ params }: PageProps<"/invite/[token]">) {
  return (
    <Suspense fallback={<Skeleton className="h-96" />}>
      <InviteBody params={params} />
    </Suspense>
  );
}

async function InviteBody({ params }: { params: PageProps<"/invite/[token]">["params"] }) {
  await connection();
  const { token } = await params;
  const found = await findValidInvite(token);
  if (!found)
    return (
      <div className="animate-rise text-center">
        <p className="text-5xl">⏳</p>
        <h1 className="mt-4 font-display text-3xl font-bold tracking-tight">Link expired</h1>
        <p className="mt-2 text-muted">
          This invite was already used or has expired. Ask IGNITE staff to send a new one.
        </p>
        <Link href="/login" className="mt-6 inline-block font-semibold text-brand">
          Go to sign in
        </Link>
      </div>
    );
  return (
    <div className="animate-rise">
      <p className="mb-3 inline-flex rounded-full bg-gold-soft px-3 py-1 text-xs font-bold text-gold">
        🔥 You&apos;re in
      </p>
      <h1 className="font-display text-4xl font-bold tracking-tight">
        Hey {firstName(found.user.name)}, welcome to <span className="text-brand">IGNITE</span>.
      </h1>
      <p className="mt-2 mb-8 text-muted">Set a password to activate your account.</p>
      <InviteForm token={token} email={found.user.email} />
    </div>
  );
}
