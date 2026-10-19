import Link from "next/link";
import type { Metadata } from "next";
import { and, asc, desc, eq } from "drizzle-orm";
import { Crown, Sparkles, Star } from "lucide-react";
import { ClaimBadgeForm } from "@/components/app/mini-forms";
import { Button } from "@/components/ui/button";
import { Card, PageHeader, Pill, SectionTitle, reviewLabel, reviewTone } from "@/components/ui/primitives";
import { Sheet } from "@/components/ui/sheet";
import { db } from "@/db";
import { badge, badgeClaim, scholarOfMonth, userBadge } from "@/db/schema";
import { monthLabel, prettyDate } from "@/lib/dates";
import { getUserTotalPoints } from "@/lib/leaderboard";
import { requireStudent } from "@/lib/session";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Awards" };

const colorRing: Record<string, string> = {
  gold: "from-gold to-[#ffb84d]",
  green: "from-brand to-[#7cf0b0]",
  blue: "from-info to-[#a5c8ff]",
  purple: "from-[#c084fc] to-[#f0abfc]",
};

export default async function AwardsPage({ searchParams }: PageProps<"/awards">) {
  const { user } = await requireStudent();
  const [sp, badges, earned, claims, totalPoints, crowns] = await Promise.all([
    searchParams,
    db.select().from(badge).where(eq(badge.active, true)).orderBy(asc(badge.createdAt)),
    db.select().from(userBadge).where(eq(userBadge.userId, user.id)).orderBy(desc(userBadge.awardedAt)),
    db.query.badgeClaim.findMany({
      where: and(eq(badgeClaim.userId, user.id)),
      orderBy: desc(badgeClaim.createdAt),
      with: { badge: true },
      limit: 6,
    }),
    getUserTotalPoints(user.id),
    db.select().from(scholarOfMonth).where(eq(scholarOfMonth.userId, user.id)),
  ]);

  const earnedBy = new Map<string, { count: number; last: Date }>();
  for (const e of earned) {
    const cur = earnedBy.get(e.badgeId);
    earnedBy.set(e.badgeId, { count: (cur?.count ?? 0) + 1, last: cur?.last ?? e.awardedAt });
  }
  const claimable = badges.filter((b) => b.claimable);
  const sorted = [...badges].sort((a, b) => Number(earnedBy.has(b.id)) - Number(earnedBy.has(a.id)));

  return (
    <div className="animate-rise">
      <PageHeader
        eyebrow="Awards center"
        title="Your trophy case"
        subtitle="Every badge is a real-life win. We see you. 👀"
        action={
          <Sheet
            key={String(sp.claim)}
            defaultOpen={sp.claim === "1"}
            title="Claim a badge"
            description="Hit a milestone? Send proof and staff will award it."
            trigger={
              <Button size="sm" variant="gold">
                <Sparkles /> Claim
              </Button>
            }
          >
            <ClaimBadgeForm
              badges={claimable.map((b) => ({ id: b.id, name: b.name, emoji: b.emoji }))}
              defaultBadgeId={typeof sp.badge === "string" ? sp.badge : undefined}
            />
          </Sheet>
        }
      />

      <div className="grid grid-cols-3 gap-3">
        <Card className="p-4 text-center">
          <Star className="mx-auto size-5 fill-gold text-gold" />
          <p className="mt-1 font-display text-2xl font-bold tabular-nums">{totalPoints}</p>
          <p className="text-[11px] text-muted">lifetime stars</p>
        </Card>
        <Card className="p-4 text-center">
          <Sparkles className="mx-auto size-5 text-brand" />
          <p className="mt-1 font-display text-2xl font-bold tabular-nums">{earned.length}</p>
          <p className="text-[11px] text-muted">badges</p>
        </Card>
        <Link href="/leaderboard" className="rounded-3xl border border-border bg-surface p-4 text-center">
          <Crown className="mx-auto size-5 text-gold" />
          <p className="mt-1 font-display text-2xl font-bold tabular-nums">{crowns.length}</p>
          <p className="text-[11px] text-muted">scholar crowns</p>
        </Link>
      </div>

      {crowns.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {crowns.map((c) => (
            <Pill key={c.month} tone="gold">
              👑 Scholar of the Month · {monthLabel(c.month)}
            </Pill>
          ))}
        </div>
      )}

      <SectionTitle>Badges</SectionTitle>
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
        {sorted.map((b) => {
          const e = earnedBy.get(b.id);
          return (
            <Link
              key={b.id}
              href={e || !b.claimable ? "#" : `/awards?claim=1&badge=${b.id}`}
              className={cn(
                "group flex flex-col items-center rounded-3xl border p-3 text-center transition-colors",
                e ? "border-gold/40 bg-surface" : "border-border bg-surface/50",
              )}
            >
              <span
                className={cn(
                  "relative flex size-16 items-center justify-center rounded-full bg-gradient-to-br text-3xl",
                  e ? colorRing[b.color] ?? colorRing.gold : "from-surface-3 to-surface-2 grayscale",
                  e && "shadow-[0_8px_24px_-8px_var(--gold)]",
                )}
              >
                <span className={cn(!e && "opacity-40")}>{b.emoji}</span>
                {e && e.count > 1 && (
                  <span className="absolute -right-1 -bottom-1 rounded-full bg-fg px-1.5 text-[10px] font-bold text-bg">
                    ×{e.count}
                  </span>
                )}
              </span>
              <p className={cn("mt-2 text-xs leading-tight font-semibold", !e && "text-muted")}>{b.name}</p>
              <p className="mt-0.5 text-[10px] text-muted">
                {e ? prettyDate(e.last, "MMM d") : `+${b.points} pts`}
              </p>
            </Link>
          );
        })}
      </div>

      {claims.length > 0 && (
        <>
          <SectionTitle>Your claims</SectionTitle>
          <div className="space-y-2">
            {claims.map((c) => (
              <Card key={c.id} className="flex items-center gap-3 p-3.5">
                <span className="text-2xl">{c.badge.emoji}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{c.badge.name}</p>
                  {c.reviewNote ? (
                    <p className="truncate text-xs text-muted">Staff: {c.reviewNote}</p>
                  ) : (
                    <p className="text-xs text-muted">Sent {prettyDate(c.createdAt, "MMM d")}</p>
                  )}
                </div>
                <Pill tone={reviewTone(c.status)}>{reviewLabel(c.status)}</Pill>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
