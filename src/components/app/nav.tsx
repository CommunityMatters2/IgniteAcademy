"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import {
  Award,
  BookOpen,
  ClipboardCheck,
  GraduationCap,
  House,
  Lightbulb,
  Plus,
  UserRound,
  CalendarCheck,
  Clock,
  Sparkles,
} from "lucide-react";
import { Sheet, useSheet } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/home", label: "Home", icon: House },
  { href: "/school", label: "School", icon: GraduationCap },
  { href: "/help", label: "Help", icon: BookOpen },
  { href: "/awards", label: "Awards", icon: Award },
  { href: "/me", label: "Me", icon: UserRound },
];

const quick = [
  { href: "/clock", label: "Clock in / out", body: "Log your time at IGNITE", icon: Clock, tone: "bg-brand text-brand-fg" },
  { href: "/school?add=report", label: "Upload report card", body: "Photo or PDF from this grading period", icon: GraduationCap, tone: "bg-brand text-brand-fg" },
  { href: "/school?add=checkin", label: "Weekly attendance check-in", body: "Prove you're showing up on time", icon: CalendarCheck, tone: "bg-info text-white" },
  { href: "/awards?claim=1", label: "Claim a badge", body: "Got your license? Passed a class? Show us", icon: Sparkles, tone: "bg-gold text-gold-fg" },
  { href: "/voice?add=1", label: "Share an idea", body: "Help shape what IGNITE does next", icon: Lightbulb, tone: "bg-[#c084fc] text-black" },
  { href: "/forms", label: "My forms", body: "Permission slips & sign-offs", icon: ClipboardCheck, tone: "bg-surface-3 text-fg" },
];

export function BottomNav() {
  return <BottomNavView pathname={usePathname()} />;
}

/** Hook-free render used as the Suspense fallback on dynamic routes. */
export function BottomNavView({ pathname }: { pathname: string }) {
  return (
    <nav
      aria-label="Main"
      className="glass fixed inset-x-0 bottom-0 z-40 border-t border-border pb-safe md:hidden"
    >
      <ul className="mx-auto grid max-w-lg grid-cols-5 px-2 pt-2">
        {tabs.map((t, i) => {
          const active = pathname === t.href || pathname.startsWith(`${t.href}/`);
          return (
            <li key={t.href} className={cn(i === 2 && "relative")}>
              <Link
                href={t.href}
                className={cn(
                  "relative flex flex-col items-center gap-1 rounded-2xl py-1.5 text-[11px] font-semibold transition-colors",
                  active ? "text-fg" : "text-muted",
                )}
              >
                {active && (
                  <motion.span
                    layoutId="nav-pill"
                    className="absolute inset-x-3 top-0 h-8 rounded-full bg-brand-soft"
                    transition={{ type: "spring", stiffness: 500, damping: 40 }}
                  />
                )}
                <t.icon className={cn("relative size-[22px]", active && "text-brand")} strokeWidth={active ? 2.4 : 2} />
                <span className="relative">{t.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function SideNav() {
  return <SideNavView pathname={usePathname()} />;
}

export function SideNavView({ pathname }: { pathname: string }) {
  const extra = [
    { href: "/clock", label: "My hours", icon: Clock },
    { href: "/leaderboard", label: "Leaderboard", icon: Award },
    { href: "/voice", label: "Ideas", icon: Lightbulb },
    { href: "/forms", label: "Forms", icon: ClipboardCheck },
  ];
  return (
    <nav aria-label="Main" className="hidden md:block">
      <ul className="space-y-1">
        {[...tabs, ...extra].map((t) => {
          const active = pathname === t.href || pathname.startsWith(`${t.href}/`);
          return (
            <li key={t.href}>
              <Link
                href={t.href}
                className={cn(
                  "flex items-center gap-3 rounded-2xl px-4 py-3 text-[15px] font-medium transition-colors",
                  active ? "bg-brand-soft text-fg" : "text-muted hover:bg-surface-2 hover:text-fg",
                )}
              >
                <t.icon className={cn("size-5", active && "text-brand")} />
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function QuickActions() {
  return (
    <Sheet
      title="Quick actions"
      description="What do you want to do?"
      trigger={
        <button
          type="button"
          aria-label="Quick actions"
          className="fixed right-5 bottom-[calc(env(safe-area-inset-bottom)+5.5rem)] z-40 flex size-14 items-center justify-center rounded-full bg-gold text-gold-fg shadow-[0_10px_30px_-6px_var(--gold)] transition-transform active:scale-90 md:bottom-8"
        >
          <Plus className="size-7" strokeWidth={2.6} />
        </button>
      }
    >
      <QuickList />
    </Sheet>
  );
}

function QuickList() {
  const sheet = useSheet();
  return (
      <ul className="space-y-2">
        {quick.map((q) => (
          <li key={q.href}>
            <Link
              href={q.href}
              onClick={() => sheet?.close()}
              className="flex items-center gap-4 rounded-2xl border border-border bg-surface-2 p-3.5 transition-colors hover:border-brand"
            >
              <span className={cn("flex size-11 shrink-0 items-center justify-center rounded-2xl", q.tone)}>
                <q.icon className="size-5" />
              </span>
              <span>
                <span className="block font-semibold">{q.label}</span>
                <span className="block text-sm text-muted">{q.body}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
  );
}
