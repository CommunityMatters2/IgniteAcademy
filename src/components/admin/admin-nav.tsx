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

export const adminLinks = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/reviews", label: "Review queue", icon: Inbox },
  { href: "/admin/clock", label: "Clock-ins", icon: Clock },
  { href: "/admin/users", label: "Students & staff", icon: Users },
  { href: "/admin/sessions", label: "Help Center", icon: BookOpen },
  { href: "/admin/awards", label: "Awards", icon: Award },
  { href: "/admin/scholar", label: "Scholar of the Month", icon: Crown },
  { href: "/admin/ideas", label: "Ideas", icon: Lightbulb },
  { href: "/admin/forms", label: "Forms", icon: ClipboardList },
  { href: "/admin/announcements", label: "Announcements", icon: Megaphone },
  { href: "/admin/birthdays", label: "Birthdays", icon: Cake },
  { href: "/admin/settings", label: "Settings", icon: Settings },
  { href: "/admin/audit", label: "Audit log", icon: ScrollText },
];

function isActive(pathname: string, href: string, exact?: boolean) {
  return exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  return <NavListView pathname={usePathname()} onNavigate={onNavigate} />;
}

export function NavListView({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <ul className="space-y-0.5">
      {adminLinks.map((l) => {
        const active = isActive(pathname, l.href, l.exact);
        return (
          <li key={l.href}>
            <Link
              href={l.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                active ? "bg-brand-soft text-fg" : "text-muted hover:bg-surface-2 hover:text-fg",
              )}
            >
              <l.icon className={cn("size-[18px]", active && "text-brand")} />
              {l.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export function AdminSideNav() {
  return <NavList />;
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
