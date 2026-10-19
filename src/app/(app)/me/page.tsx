import Link from "next/link";
import type { Metadata } from "next";
import { Bell, Cake, ChevronRight, ClipboardCheck, Crown, KeyRound, Lightbulb, LogOut, UserRound } from "lucide-react";
import { signOutAction } from "@/app/(auth)/actions";
import { Avatar } from "@/components/ui/avatar";
import { Card } from "@/components/ui/primitives";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { STATUS_META, getEligibility } from "@/lib/eligibility";
import { getUserTotalPoints } from "@/lib/leaderboard";
import { requireStudent } from "@/lib/session";
import { getBadgeCount } from "@/lib/student-data";
import { cn, firstName } from "@/lib/utils";

export const metadata: Metadata = { title: "Me" };

const links = [
  { href: "/me/profile", label: "Edit profile", icon: UserRound },
  { href: "/notifications", label: "Notifications", icon: Bell },
  { href: "/leaderboard", label: "Leaderboard", icon: Crown },
  { href: "/voice", label: "Ideas board", icon: Lightbulb },
  { href: "/forms", label: "Forms", icon: ClipboardCheck },
  { href: "/birthdays", label: "Birthdays", icon: Cake },
  { href: "/forgot", label: "Change password", icon: KeyRound },
];

export default async function MePage() {
  const { user, profile } = await requireStudent();
  const [elig, points, badges] = await Promise.all([
    getEligibility(user.id),
    getUserTotalPoints(user.id),
    getBadgeCount(user.id),
  ]);
  const status = STATUS_META[elig.status];

  return (
    <div className="animate-rise">
      <div className="flex flex-col items-center pt-2 text-center">
        <Avatar name={user.name} avatarKey={profile.avatarKey} size={96} ring="brand" />
        <h1 className="mt-4 font-display text-2xl font-bold tracking-tight">
          {firstName(user.name, profile.preferredName)}
          {profile.preferredName && <span className="text-muted"> · {user.name}</span>}
        </h1>
        <p className="text-sm text-muted">
          {[profile.gradeLevel && `${profile.gradeLevel} grade`, profile.school].filter(Boolean).join(" · ")}
        </p>
        <span
          className={cn(
            "mt-3 rounded-full px-3 py-1 text-xs font-bold",
            status.tone === "green" && "bg-brand-soft text-brand",
            status.tone === "gold" && "bg-gold-soft text-gold",
            status.tone === "red" && "bg-danger-soft text-danger",
          )}
        >
          {status.label}
        </span>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <Card className="p-4 text-center">
          <p className="font-display text-2xl font-bold">{points}</p>
          <p className="text-xs text-muted">lifetime stars</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="font-display text-2xl font-bold">{badges}</p>
          <p className="text-xs text-muted">badges</p>
        </Card>
      </div>

      <Card className="mt-4 p-2">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="flex items-center gap-3 rounded-2xl px-4 py-3.5 text-[15px] font-medium hover:bg-surface-2"
          >
            <l.icon className="size-5 text-muted" />
            <span className="flex-1">{l.label}</span>
            <ChevronRight className="size-4 text-muted" />
          </Link>
        ))}
        <ThemeToggle />
      </Card>

      <form action={signOutAction} className="mt-4">
        <button className="flex w-full items-center justify-center gap-2 rounded-2xl border border-border py-3.5 text-[15px] font-semibold text-danger hover:bg-danger-soft">
          <LogOut className="size-5" /> Sign out
        </button>
      </form>
      <p className="mt-6 text-center text-xs text-muted">{user.email}</p>
    </div>
  );
}
