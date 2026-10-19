import { Suspense } from "react";
import Link from "next/link";
import { LogOut } from "lucide-react";
import { signOutAction } from "@/app/(auth)/actions";
import { AdminBottomNav, AdminBottomNavView, AdminSideNav, NavListView } from "@/components/admin/admin-nav";
import { Logo, Wordmark } from "@/components/brand/logo";
import { Avatar } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { getSession } from "@/lib/session";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh lg:flex">
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-border bg-surface/50 p-4 lg:flex">
        <Link href="/admin" className="mb-6 flex items-center gap-2.5 px-2">
          <Logo size={34} />
          <span>
            <Wordmark className="block leading-none" />
            <span className="text-[11px] font-semibold tracking-wider text-muted uppercase">Admin</span>
          </span>
        </Link>
        <div className="flex-1 overflow-y-auto">
          <Suspense fallback={<NavListView pathname="" />}>
            <AdminSideNav />
          </Suspense>
        </div>
        <div className="mt-4 border-t border-border pt-3">
          <ThemeToggle />
          <Suspense fallback={null}>
            <Me />
          </Suspense>
        </div>
      </aside>

      <header className="glass sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border px-5 pt-safe lg:hidden">
        <Link href="/admin" className="flex items-center gap-2">
          <Logo size={28} />
          <Wordmark className="text-base" />
          <span className="rounded-full bg-gold-soft px-2 py-0.5 text-[10px] font-bold text-gold uppercase">Admin</span>
        </Link>
        <form action={signOutAction}>
          <button aria-label="Sign out" className="flex size-10 items-center justify-center rounded-full text-muted hover:bg-surface-2">
            <LogOut className="size-5" />
          </button>
        </form>
      </header>

      <main className="min-w-0 flex-1 px-5 pt-5 pb-32 lg:px-10 lg:pt-8 lg:pb-16">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
      <Suspense fallback={<AdminBottomNavView pathname="" />}>
        <AdminBottomNav />
      </Suspense>
    </div>
  );
}

async function Me() {
  const s = await getSession();
  if (!s) return null;
  return (
    <div className="flex items-center gap-3 px-2 pt-2">
      <Avatar name={s.user.name} size={32} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{s.user.name}</p>
        <p className="truncate text-xs text-muted">{s.user.role}</p>
      </div>
      <form action={signOutAction}>
        <button aria-label="Sign out" className="rounded-full p-2 text-muted hover:bg-surface-2 hover:text-fg">
          <LogOut className="size-4" />
        </button>
      </form>
    </div>
  );
}
