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
      <aside className="nav-panel sticky top-0 hidden h-dvh w-68 shrink-0 flex-col p-4 lg:flex">
        <Link href="/admin" className="mb-6 flex items-center gap-3 px-2 py-1">
          <Logo size={50} on="dark" />
          <span className="flex flex-col gap-1.5">
            <Wordmark variant="stacked" height={38} on="dark" />
            <span className="w-fit rounded-full bg-gold px-2 py-0.5 text-[9px] font-extrabold tracking-[0.18em] text-gold-fg uppercase">
              Admin
            </span>
          </span>
        </Link>
        <div className="no-scrollbar -mx-1 flex-1 overflow-y-auto px-1">
          <Suspense fallback={<NavListView pathname="" dark />}>
            <AdminSideNav />
          </Suspense>
        </div>
        <div className="mt-4 border-t border-nav-border pt-3">
          <ThemeToggle dark />
          <Suspense fallback={null}>
            <Me />
          </Suspense>
        </div>
      </aside>

      <header className="nav-panel sticky top-0 z-30 flex h-14 items-center justify-between px-5 pt-safe lg:hidden">
        <Link href="/admin" className="flex items-center gap-2.5">
          <Logo size={32} on="dark" />
          <Wordmark height={11} on="dark" />
          <span className="rounded-full bg-gold px-2 py-0.5 text-[9px] font-extrabold tracking-wider text-gold-fg uppercase">Admin</span>
        </Link>
        <form action={signOutAction}>
          <button aria-label="Sign out" className="flex size-10 items-center justify-center rounded-full text-nav-muted hover:bg-nav-hover hover:text-nav-fg">
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
    <div className="mt-2 flex items-center gap-3 rounded-2xl bg-nav-hover px-3 py-2.5">
      <Avatar name={s.user.name} size={32} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-nav-fg">{s.user.name}</p>
        <p className="truncate text-xs text-nav-muted capitalize">{s.user.role}</p>
      </div>
      <form action={signOutAction}>
        <button aria-label="Sign out" className="rounded-full p-2 text-nav-muted hover:bg-nav-hover hover:text-nav-fg">
          <LogOut className="size-4" />
        </button>
      </form>
    </div>
  );
}
