import { getSession } from "@/lib/session";
import { stopImpersonatingAction } from "@/actions/admin";

export async function ImpersonationBanner() {
  const s = await getSession();
  if (!s?.session.impersonatedBy) return null;
  return (
    <div className="sticky top-0 z-50 flex items-center justify-center gap-3 bg-gold px-4 py-2 pt-safe text-sm font-semibold text-gold-fg">
      Viewing as {s.user.name}
      <form action={stopImpersonatingAction}>
        <button className="rounded-full bg-black/85 px-3 py-1 text-xs text-white">Exit</button>
      </form>
    </div>
  );
}
