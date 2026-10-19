import { Suspense } from "react";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { OnboardingForm } from "@/components/app/profile-form";
import { Skeleton } from "@/components/ui/primitives";
import { db } from "@/db";
import { profile } from "@/db/schema";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Welcome" };

export default function WelcomePage() {
  return (
    <Suspense fallback={<Skeleton className="h-[480px]" />}>
      <Welcome />
    </Suspense>
  );
}

async function Welcome() {
  const { user } = await requireUser();
  if (user.role === "admin" || user.role === "tutor") redirect("/admin");
  const p = await db.query.profile.findFirst({ where: eq(profile.userId, user.id) });
  if (p?.onboardedAt) redirect("/home");
  return (
    <div className="animate-rise">
      <OnboardingForm defaults={{ name: user.name, ...p }} />
    </div>
  );
}
