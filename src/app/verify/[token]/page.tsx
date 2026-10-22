import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { and, eq, gt } from "drizzle-orm";
import { Glow, Logo, Wordmark } from "@/components/brand/logo";
import { VerifyForm } from "@/components/app/verify-form";
import { Skeleton } from "@/components/ui/primitives";
import { db } from "@/db";
import { counselorVerification, profile, user } from "@/db/schema";

export const metadata: Metadata = { title: "Counselor verification", robots: { index: false } };

export default function VerifyPage({ params }: PageProps<"/verify/[token]">) {
  return (
    <div className="relative flex min-h-dvh flex-col px-5">
      <Glow />
      <header className="relative z-10 flex items-center gap-2.5 py-5">
        <Logo size={40} />
        <Wordmark height={13} />
      </header>
      <main className="relative z-10 mx-auto w-full max-w-md flex-1 pt-6 pb-16">
        <Suspense fallback={<Skeleton className="h-96" />}>
          <Body params={params} />
        </Suspense>
      </main>
    </div>
  );
}

async function Body({ params }: { params: PageProps<"/verify/[token]">["params"] }) {
  await connection();
  const { token } = await params;
  const row = await db
    .select({ v: counselorVerification, name: user.name, school: profile.school, grade: profile.gradeLevel })
    .from(counselorVerification)
    .innerJoin(user, eq(user.id, counselorVerification.userId))
    .leftJoin(profile, eq(profile.userId, user.id))
    .where(and(eq(counselorVerification.token, token), gt(counselorVerification.expiresAt, new Date())))
    .limit(1)
    .then((r) => r[0]);

  if (!row)
    return (
      <div className="text-center">
        <h1 className="font-display text-3xl font-bold">Link expired</h1>
        <p className="mt-2 text-muted">This verification link is invalid or has expired. IGNITE staff can send a new one.</p>
      </div>
    );
  if (row.v.status === "completed")
    return (
      <div className="text-center">
        <p className="text-5xl">✅</p>
        <h1 className="mt-4 font-display text-3xl font-bold">Thank you!</h1>
        <p className="mt-2 text-muted">Your response for {row.name} was recorded.</p>
      </div>
    );
  return (
    <div className="animate-rise">
      <p className="text-xs font-semibold tracking-widest text-muted uppercase">Student status verification</p>
      <h1 className="mt-1 font-display text-3xl font-bold tracking-tight">{row.name}</h1>
      <p className="mt-1 text-muted">{[row.grade && `${row.grade} grade`, row.school].filter(Boolean).join(" · ")}</p>
      <p className="mt-4 rounded-2xl bg-surface-2 p-4 text-sm text-muted">
        IGNITE Academy (a Community Matters 2 youth program) requires participants to be enrolled, attending on time and passing. Your
        answers are only shared with IGNITE program staff.
      </p>
      <VerifyForm token={token} />
    </div>
  );
}
