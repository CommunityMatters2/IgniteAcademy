import type { Metadata } from "next";
import { desc, eq } from "drizzle-orm";
import { Crown } from "lucide-react";
import { Podium } from "@/components/app/podium";
import { Avatar } from "@/components/ui/avatar";
import { Card, PageHeader, SectionTitle } from "@/components/ui/primitives";
import { db } from "@/db";
import { profile, scholarOfMonth, user } from "@/db/schema";
import { currentMonth, monthLabel } from "@/lib/dates";
import { getLeaderboard, type LeaderRow } from "@/lib/leaderboard";
import { requireStudent } from "@/lib/session";
import { cn, shortName } from "@/lib/utils";

export const metadata: Metadata = { title: "Leaderboard" };

function displayName(r: LeaderRow, meId: string) {
  if (r.userId === meId) return "You";
  return r.showOnLeaderboard ? shortName(r.name, r.preferredName) : "IGNITE Scholar";
}

export default async function LeaderboardPage() {
  const { user: me } = await requireStudent();
  const month = currentMonth();
  const [board, winners] = await Promise.all([
    getLeaderboard(month, 50),
    db
      .select({
        month: scholarOfMonth.month,
        name: user.name,
        preferredName: profile.preferredName,
        avatarKey: profile.avatarKey,
        showOnLeaderboard: profile.showOnLeaderboard,
      })
      .from(scholarOfMonth)
      .innerJoin(user, eq(user.id, scholarOfMonth.userId))
      .leftJoin(profile, eq(profile.userId, user.id))
      .orderBy(desc(scholarOfMonth.month))
      .limit(6),
  ]);
  const top = board.slice(0, 5);
  const meIdx = board.findIndex((r) => r.userId === me.id);

  return (
    <div className="animate-rise">
      <PageHeader
        eyebrow={monthLabel(month)}
        title={
          <>
            Scholar of the <span className="text-gold">Month</span>
          </>
        }
        subtitle="Earn points for approved report cards, on-time weeks, tutoring and badges. #1 gets crowned."
      />

      {top.length ? (
        <Podium
          rows={top.slice(0, 3).map((r) => ({
            id: r.userId,
            name: displayName(r, me.id),
            fullName: r.name,
            avatarKey: r.showOnLeaderboard || r.userId === me.id ? r.avatarKey : null,
            points: r.points,
          }))}
        />
      ) : (
        <Card className="text-center">
          <p className="text-4xl">🏁</p>
          <p className="mt-2 font-display font-semibold">The race just started</p>
          <p className="text-sm text-muted">Be the first on the board this month.</p>
        </Card>
      )}

      {top.length > 0 && (
        <>
          <SectionTitle>Top 5</SectionTitle>
          <ol className="space-y-2">
            {top.map((r, i) => (
              <li
                key={r.userId}
                className={cn(
                  "flex items-center gap-3 rounded-2xl border px-3.5 py-3",
                  r.userId === me.id ? "border-brand/50 bg-brand-soft" : "border-border bg-surface",
                )}
              >
                <span className={cn("w-6 text-center font-display font-bold", i === 0 ? "text-gold" : "text-muted")}>
                  {i + 1}
                </span>
                <Avatar
                  name={r.name}
                  avatarKey={r.showOnLeaderboard || r.userId === me.id ? r.avatarKey : null}
                  size={36}
                />
                <span className="flex-1 truncate font-semibold">{displayName(r, me.id)}</span>
                <span className="font-display font-bold tabular-nums">{r.points}</span>
                <span className="text-xs text-muted">pts</span>
              </li>
            ))}
          </ol>
        </>
      )}

      {meIdx >= 5 && (
        <p className="mt-3 rounded-2xl bg-surface-2 px-4 py-3 text-center text-sm">
          You&apos;re <b>#{meIdx + 1}</b> with <b>{board[meIdx].points}</b> pts — {board[4].points - board[meIdx].points + 1} more to crack the top 5!
        </p>
      )}
      {meIdx < 0 && (
        <p className="mt-3 rounded-2xl bg-surface-2 px-4 py-3 text-center text-sm text-muted">
          You don&apos;t have points this month yet. Submit a check-in to get on the board!
        </p>
      )}

      <SectionTitle>How to earn</SectionTitle>
      <div className="grid grid-cols-2 gap-2 text-sm">
        {[
          ["📄", "Approved report card"],
          ["✅", "Passing every class"],
          ["⏰", "On-time week check-ins"],
          ["📚", "Attending tutoring"],
          ["⭐", "Earning badges"],
          ["💡", "Ideas that ship"],
        ].map(([e, t]) => (
          <div key={t} className="flex items-center gap-2 rounded-2xl bg-surface-2 px-3 py-2.5">
            <span>{e}</span>
            <span>{t}</span>
          </div>
        ))}
      </div>

      {winners.length > 0 && (
        <>
          <SectionTitle>Hall of fame</SectionTitle>
          <div className="space-y-2">
            {winners.map((w) => (
              <Card key={w.month} className="flex items-center gap-3 p-3.5">
                <Crown className="size-5 text-gold" />
                <Avatar name={w.name} avatarKey={w.showOnLeaderboard !== false ? w.avatarKey : null} size={36} ring="gold" />
                <span className="flex-1 font-semibold">
                  {w.showOnLeaderboard !== false ? shortName(w.name, w.preferredName) : "IGNITE Scholar"}
                </span>
                <span className="text-xs text-muted">{monthLabel(w.month)}</span>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
