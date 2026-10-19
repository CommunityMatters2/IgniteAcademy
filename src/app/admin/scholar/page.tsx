import Link from "next/link";
import type { Metadata } from "next";
import { desc, eq } from "drizzle-orm";
import { Crown } from "lucide-react";
import { AdminForm } from "@/components/admin/admin-forms";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Field, SubmitButton, Switch, Textarea } from "@/components/ui/form";
import { Card, EmptyState, PageHeader, Pill, SectionTitle } from "@/components/ui/primitives";
import { Sheet } from "@/components/ui/sheet";
import { db } from "@/db";
import { scholarOfMonth, user } from "@/db/schema";
import { crownScholarAction } from "@/actions/admin";
import { currentMonth, monthLabel, shiftMonth } from "@/lib/dates";
import { getLeaderboard } from "@/lib/leaderboard";
import { requireAdmin } from "@/lib/session";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Scholar of the Month" };

export default async function ScholarAdmin({ searchParams }: PageProps<"/admin/scholar">) {
  await requireAdmin();
  const sp = await searchParams;
  const cur = currentMonth();
  const month = typeof sp.m === "string" && /^\d{4}-\d{2}$/.test(sp.m) && sp.m <= cur ? sp.m : cur;
  const [board, history] = await Promise.all([
    getLeaderboard(month, 20),
    db
      .select({ s: scholarOfMonth, name: user.name })
      .from(scholarOfMonth)
      .innerJoin(user, eq(user.id, scholarOfMonth.userId))
      .orderBy(desc(scholarOfMonth.month))
      .limit(12),
  ]);
  const winner = history.find((h) => h.s.month === month);

  return (
    <div className="animate-rise">
      <PageHeader title="Scholar of the Month" subtitle="Rankings come from points. Crown the winner once a month — they get an email and a pinned shout-out." />
      <div className="mb-5 flex items-center gap-2">
        {[shiftMonth(cur, -2), shiftMonth(cur, -1), cur].map((m) => (
          <Link
            key={m}
            href={`/admin/scholar?m=${m}`}
            className={cn(
              "rounded-full border px-4 py-2 text-sm font-semibold",
              m === month ? "border-gold bg-gold-soft text-fg" : "border-border text-muted",
            )}
          >
            {monthLabel(m)}
          </Link>
        ))}
      </div>

      {winner && (
        <Card className="mb-5 flex items-center gap-3 border-gold/40 glow-gold">
          <Crown className="size-6 fill-gold text-gold" />
          <p>
            <b>{winner.name}</b> is {monthLabel(month)}&apos;s Scholar of the Month.
          </p>
        </Card>
      )}

      {board.length ? (
        <Card className="divide-y divide-border p-0">
          {board.map((r, i) => (
            <div key={r.userId} className="flex items-center gap-3 px-5 py-3">
              <span className={cn("w-6 text-center font-display font-bold", i < 5 ? "text-gold" : "text-muted")}>{i + 1}</span>
              <Avatar name={r.name} avatarKey={r.avatarKey} size={36} />
              <Link href={`/admin/users/${r.userId}`} className="flex-1 truncate font-semibold hover:underline">
                {r.name}
              </Link>
              <span className="font-display font-bold tabular-nums">{r.points}</span>
              {winner?.s.userId === r.userId ? (
                <Pill tone="gold">👑 Crowned</Pill>
              ) : (
                <Sheet
                  title={`Crown ${r.name.split(" ")[0]}?`}
                  description={`${monthLabel(month)} Scholar of the Month`}
                  trigger={
                    <Button size="sm" variant={i === 0 ? "gold" : "secondary"}>
                      <Crown /> Crown
                    </Button>
                  }
                >
                  <AdminForm action={crownScholarAction} className="space-y-4">
                    <input type="hidden" name="month" value={month} />
                    <input type="hidden" name="userId" value={r.userId} />
                    <Field label="Shout-out message">
                      <Textarea name="note" rows={3} placeholder="Went from a D to a B in Algebra and never missed a check-in!" />
                    </Field>
                    <Switch name="announce" defaultChecked label="Post a pinned announcement" description="Everyone sees it on their Home screen." />
                    <SubmitButton block variant="gold">
                      Crown 👑
                    </SubmitButton>
                  </AdminForm>
                </Sheet>
              )}
            </div>
          ))}
        </Card>
      ) : (
        <EmptyState icon="📊" title="No points for this month yet" />
      )}

      {history.length > 0 && (
        <>
          <SectionTitle>Past winners</SectionTitle>
          <div className="flex flex-wrap gap-2">
            {history.map(({ s, name }) => (
              <Pill key={s.month} tone="gold">
                👑 {monthLabel(s.month)} · {name}
              </Pill>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
