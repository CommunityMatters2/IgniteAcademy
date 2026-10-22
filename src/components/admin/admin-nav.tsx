"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Award,
  BookOpen,
  Cake,
  ClipboardList,
  Clock,
  Crown,
  Inbox,
  LayoutDashboard,
  Lightbulb,
  Megaphone,
  Menu,
  ScrollText,
  Settings,
  Users,
} from "lucide-react";
import { Sheet, useSheet } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

type NavLink = { href: string; label: string; icon: typeof LayoutDashboard; exact?: boolean };

/** Grouped so day-to-day work sits at the top and support/settings at the bottom. */
export const adminGroups: { title: string; links: NavLink[] }[] = [
  {
    title: "Daily",
    links: [
      { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
      { href: "/admin/reviews", label: "Review queue", icon: Inbox },
      { href: "/admin/clock", label: "Clock-ins", icon: Clock },
      { href: "/admin/users", label: "Students & staff", icon: Users },
    ],
  },
  {
    title: "Recognition",
    links: [
      { href: "/admin/awards", label: "Awards", icon: Award },
      { href: "/admin/scholar", label: "Scholar of the Month", icon: Crown },
      { href: "/admin/birthdays", label: "Birthdays", icon: Cake },
    ],
  },
  {
    title: "Communicate",
    links: [
      { href: "/admin/announcements", label: "Announcements", icon: Megaphone },
      { href: "/admin/forms", label: "Forms", icon: ClipboardList },
    ],
  },
  {
    title: "Support & settings",
    links: [
      { href: "/admin/sessions", label: "Help Center", icon: BookOpen },
      { href: "/admin/ideas", label: "Ideas", icon: Lightbulb },
      { href: "/admin/settings", label: "Settings", icon: Settings },
      { href: "/admin/audit", label: "Audit log", icon: ScrollText },
    ],
  },
];

export const adminLinks = adminGroups.flatMap((g) => g.links);

function isActive(pathname: string, href: string, exact?: boolean) {
  return exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

function NavList({ onNavigate, dark }: { onNavigate?: () => void; dark?: boolean }) {
  return <NavListView pathname={usePathname()} onNavigate={onNavigate} dark={dark} />;
}

/** dark = rendered on the forest-green sidebar panel; otherwise on a normal surface (mobile sheet). */
export function NavListView({ pathname, onNavigate, dark }: { pathname: string; onNavigate?: () => void; dark?: boolean }) {
  return (
    <div className="space-y-5">
      {adminGroups.map((g) => (
        <div key={g.title}>
          <p className={cn("mb-1.5 px-3 text-[10px] font-bold tracking-[0.16em] uppercase", dark ? "text-nav-label" : "text-muted")}>
            {g.title}
          </p>
          <ul className="space-y-0.5">
            {g.links.map((l) => {
              const active = isActive(pathname, l.href, l.exact);
              return (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors",
                      active
                        ? "bg-brand text-white shadow-[0_8px_20px_-8px_var(--brand)]"
                        : dark
                          ? "text-nav-muted hover:bg-nav-hover hover:text-nav-fg"
                          : "text-muted hover:bg-surface-2 hover:text-fg",
                    )}
                  >
                    <l.icon className={cn("size-[18px]", !active && dark && "text-nav-muted group-hover:text-gold")} />
                    <span className="flex-1">{l.label}</span>
                    {active && <span className="size-1.5 rounded-full bg-gold" />}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}

export function AdminSideNav() {
  return <NavList dark />;
}

function SheetNav() {
  const sheet = useSheet();
  return <NavList onNavigate={() => sheet?.close()} />;
}

export function AdminBottomNav() {
  return <AdminBottomNavView pathname={usePathname()} />;
}

export function AdminBottomNavView({ pathname }: { pathname: string }) {
  const main = adminLinks.slice(0, 4);
  return (
    <nav className="glass fixed inset-x-0 bottom-0 z-40 border-t border-border pb-safe lg:hidden" aria-label="Admin">
      <ul className="grid grid-cols-5 px-2 pt-2">
        {main.map((l) => {
          const active = isActive(pathname, l.href, l.exact);
          return (
            <li key={l.href}>
              <Link
                href={l.href}
                className={cn(
                  "flex flex-col items-center gap-1 py-1.5 text-[11px] font-semibold",
                  active ? "text-fg" : "text-muted",
                )}
              >
                <l.icon className={cn("size-[22px]", active && "text-brand")} />
                {l.label.split(" ")[0]}
              </Link>
            </li>
          );
        })}
        <li>
          <Sheet
            title="Admin"
            trigger={
              <button type="button" className="flex w-full flex-col items-center gap-1 py-1.5 text-[11px] font-semibold text-muted">
                <Menu className="size-[22px]" />
                More
              </button>
            }
          >
            <SheetNav />
          </Sheet>
        </li>
      </ul>
    </nav>
  );
}
