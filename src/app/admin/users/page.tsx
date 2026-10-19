import Link from "next/link";
import type { Metadata } from "next";
import { ChevronRight, Search, UserPlus } from "lucide-react";
import { InviteForms } from "@/components/admin/invite-forms";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, EmptyState, PageHeader, Pill } from "@/components/ui/primitives";
import { Sheet } from "@/components/ui/sheet";
import { getCohorts, getStudents } from "@/lib/admin-data";
import { STATUS_META, getEligibilityMap } from "@/lib/eligibility";
import { requireAdmin } from "@/lib/session";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Students & staff" };

const FILTERS = [
  { key: "all", label: "All" },
  { key: "eligible", label: "Eligible" },
  { key: "needs_action", label: "Needs action" },
  { key: "on_hold", label: "On hold" },
  { key: "pending", label: "Not activated" },
  { key: "paused", label: "Paused" },
  { key: "staff", label: "Staff" },
];

export default async function UsersPage({ searchParams }: PageProps<"/admin/users">) {
  await requireAdmin();
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim().toLowerCase() : "";
  const filter = typeof sp.f === "string" ? sp.f : "all";
  const cohortFilter = typeof sp.c === "string" ? sp.c : "";
  const [all, cohorts] = await Promise.all([getStudents(), getCohorts()]);
  const elig = await getEligibilityMap(all.filter((u) => u.role === "student").map((u) => u.id));

  const rows = all.filter((u) => {
    if (q && !`${u.name} ${u.email} ${u.school ?? ""} ${u.preferredName ?? ""}`.toLowerCase().includes(q)) return false;
    if (cohortFilter && u.cohortId !== cohortFilter) return false;
    const e = elig.get(u.id);
    switch (filter) {
      case "eligible":
      case "needs_action":
      case "on_hold":
        return u.role === "student" && !u.banned && u.onboardedAt && e?.status === filter;
      case "pending":
        return !u.onboardedAt && u.role === "student";
      case "paused":
        return u.banned;
      case "staff":
        return u.role === "admin" || u.role === "tutor";
      default:
        return true;
    }
  });

  const qs = (patch: Record<string, string>) => {
    const p = new URLSearchParams({ ...(q && { q }), ...(filter !== "all" && { f: filter }), ...(cohortFilter && { c: cohortFilter }), ...patch });
    for (const [k, v] of [...p.entries()]) if (!v || v === "all") p.delete(k);
    return `/admin/users${p.size ? `?${p}` : ""}`;
  };

  return (
    <div className="animate-rise">
      <PageHeader
        title="Students & staff"
        subtitle={`${all.filter((u) => u.role === "student").length} students · ${all.filter((u) => u.role !== "student").length} staff`}
        action={
          <Sheet
            key={String(sp.invite)}
            defaultOpen={sp.invite === "1"}
            title="Invite to IGNITE"
            description="Accounts are invite-only."
            trigger={
              <Button size="sm">
                <UserPlus /> Invite
              </Button>
            }
          >
            <InviteForms cohorts={cohorts} />
          </Sheet>
        }
      />

      <form className="relative mb-3" action="/admin/users">
        <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted" />
        <input
          name="q"
          defaultValue={q}
          placeholder="Search name, email, school…"
          className="h-12 w-full rounded-2xl border border-border bg-surface-2 pr-4 pl-11 text-[16px] outline-none focus:border-brand"
        />
        {filter !== "all" && <input type="hidden" name="f" value={filter} />}
        {cohortFilter && <input type="hidden" name="c" value={cohortFilter} />}
      </form>
      <div className="no-scrollbar mb-5 flex gap-2 overflow-x-auto">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={qs({ f: f.key })}
            className={cn(
              "shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-medium",
              filter === f.key ? "border-brand bg-brand-soft text-fg" : "border-border text-muted hover:text-fg",
            )}
          >
            {f.label}
          </Link>
        ))}
        {cohorts.map((c) => (
          <Link
            key={c.id}
            href={qs({ c: cohortFilter === c.id ? "" : c.id })}
            className={cn(
              "shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-medium",
              cohortFilter === c.id ? "border-info bg-info-soft text-fg" : "border-dashed border-border text-muted",
            )}
          >
            {c.name}
          </Link>
        ))}
      </div>

      {rows.length ? (
        <Card className="divide-y divide-border p-0">
          {rows.map((u) => {
            const e = elig.get(u.id);
            const status = e ? STATUS_META[e.status] : null;
            return (
              <Link key={u.id} href={`/admin/users/${u.id}`} className="flex items-center gap-3 px-4 py-3.5 hover:bg-surface-2 sm:px-5">
                <Avatar name={u.name} avatarKey={u.avatarKey} size={40} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{u.name}</p>
                  <p className="truncate text-xs text-muted">
                    {[u.gradeLevel, u.school].filter(Boolean).join(" · ") || u.email}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap justify-end gap-1.5">
                  {u.banned ? (
                    <Pill tone="red">Paused</Pill>
                  ) : u.role !== "student" ? (
                    <Pill tone="blue">{u.role}</Pill>
                  ) : !u.onboardedAt ? (
                    <Pill>Not activated</Pill>
                  ) : (
                    status && <Pill tone={status.tone}>{status.label}</Pill>
                  )}
                </div>
                <ChevronRight className="size-4 shrink-0 text-muted" />
              </Link>
            );
          })}
        </Card>
      ) : (
        <EmptyState icon="🔎" title="No one matches" body="Try a different search or filter." />
      )}
    </div>
  );
}
