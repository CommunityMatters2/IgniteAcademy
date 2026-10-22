import { Suspense } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { and, count, eq, isNull } from "drizzle-orm";
import { Logo, Wordmark } from "@/components/brand/logo";
import { BottomNav, BottomNavView, QuickActions, SideNav, SideNavView } from "@/components/app/nav";
import { ImpersonationBanner } from "@/components/app/impersonation-banner";
import { db } from "@/db";
import { notification } from "@/db/schema";
import { getSession } from "@/lib/session";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh">
      <Suspense fallback={null}>
        <ImpersonationBanner />
      </Suspense>
      <header className="glass sticky top-0 z-30 border-b border-border/60 pt-safe md:hidden">
        <div className="mx-auto flex h-14 max-w-lg items-center justify-between px-5">
          <Link href="/home" className="flex items-center gap-2.5">
            <Logo size={32} />
            <Wordmark height={11} />
          </Link>
          <Link
            href="/notifications"
            aria-label="Notifications"
            className="relative flex size-10 items-center justify-center rounded-full hover:bg-surface-2"
          >
            <Bell className="size-5" />
            <Suspense fallback={null}>
              <UnreadDot />
            </Suspense>
          </Link>
        </div>
      </header>

      <div className="mx-auto flex max-w-6xl gap-8 md:px-6 md:pt-6">
        <aside className="nav-panel sticky top-6 hidden h-[calc(100dvh-3rem)] w-64 shrink-0 flex-col rounded-3xl p-4 shadow-card md:flex">
          <Link href="/home" className="mb-6 flex items-center gap-3 px-2 py-1">
            <Logo size={44} on="dark" />
            <Wordmark variant="stacked" height={30} on="dark" />
          </Link>
          <div className="no-scrollbar -mx-1 flex-1 overflow-y-auto px-1">
            <Suspense fallback={<SideNavView pathname="" />}>
              <SideNav />
            </Suspense>
          </div>
          <Link
            href="/notifications"
            className="mt-3 flex items-center gap-3 rounded-xl border-t border-nav-border px-3 pt-4 pb-2.5 text-[15px] font-semibold text-nav-muted hover:text-nav-fg"
          >
            <Bell className="size-5" /> Notifications
          </Link>
        </aside>
        <main className="min-w-0 flex-1 px-5 pt-5 pb-36 md:px-0 md:pb-16">
          <div className="mx-auto max-w-2xl">{children}</div>
        </main>
      </div>

      <QuickActions />
      <Suspense fallback={<BottomNavView pathname="" />}>
        <BottomNav />
      </Suspense>
    </div>
  );
}

async function UnreadDot() {
  const s = await getSession();
  if (!s) return null;
  const [row] = await db
    .select({ n: count() })
    .from(notification)
    .where(and(eq(notification.userId, s.user.id), isNull(notification.readAt)));
  if (!row?.n) return null;
  return (
    <span className="absolute top-1.5 right-1.5 flex min-w-4 items-center justify-center rounded-full bg-gold px-1 text-[10px] font-bold text-gold-fg">
      {row.n > 9 ? "9+" : row.n}
    </span>
  );
}
