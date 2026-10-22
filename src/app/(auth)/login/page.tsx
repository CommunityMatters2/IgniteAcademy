import { Suspense } from "react";
import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/forms";
import { LogoFull } from "@/components/brand/logo";
import { Skeleton } from "@/components/ui/primitives";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <div className="animate-rise">
      <LogoFull size={120} className="mx-auto mb-8" />
      <h1 className="font-display text-4xl font-bold tracking-tight">
        Welcome <span className="text-brand">back</span>.
      </h1>
      <p className="mt-2 mb-8 text-muted">Sign in to your IGNITE Academy account.</p>
      <Suspense fallback={<Skeleton className="h-72" />}>
        <LoginFormWithParams searchParams={searchParams} />
      </Suspense>
      <p className="mt-8 text-center text-xs text-muted">
        IGNITE accounts are invite-only. Accepted but no invite yet? Ask program staff.
      </p>
    </div>
  );
}

async function LoginFormWithParams({ searchParams }: { searchParams: PageProps<"/login">["searchParams"] }) {
  const sp = await searchParams;
  const next = typeof sp.next === "string" ? sp.next : undefined;
  return <LoginForm next={next} reset={sp.reset === "1"} />;
}
