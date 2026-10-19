import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import { ProfileForm } from "@/components/app/profile-form";
import { PageHeader } from "@/components/ui/primitives";
import { requireStudent } from "@/lib/session";

export const metadata: Metadata = { title: "Edit profile" };

export default async function ProfilePage() {
  const { user, profile } = await requireStudent();
  return (
    <div className="animate-rise">
      <Link href="/me" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-fg">
        <ArrowLeft className="size-4" /> Me
      </Link>
      <PageHeader title="Edit profile" />
      <ProfileForm defaults={{ ...profile, name: user.name }} />
    </div>
  );
}
