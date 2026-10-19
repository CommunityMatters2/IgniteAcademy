import Link from "next/link";
import type { Metadata } from "next";
import { desc, eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { EyeOff } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, EmptyState, PageHeader, Pill, SectionTitle } from "@/components/ui/primitives";
import { db } from "@/db";
import { birthdayWish, user } from "@/db/schema";
import { hideWishAction } from "@/actions/admin";
import { ageOn, prettyDate, zonedToday } from "@/lib/dates";
import { requireAdmin } from "@/lib/session";
import { getUpcomingBirthdays } from "@/lib/student-data";

export const metadata: Metadata = { title: "Birthdays" };

export default async function BirthdaysAdmin() {
  await requireAdmin();
  const today = zonedToday().iso;
  const fromUser = alias(user, "from_user");
  const [people, wishes] = await Promise.all([
    getUpcomingBirthdays(60),
    db
      .select({ w: birthdayWish, to: user.name, from: fromUser.name })
      .from(birthdayWish)
      .innerJoin(user, eq(user.id, birthdayWish.toUserId))
      .innerJoin(fromUser, eq(fromUser.id, birthdayWish.fromUserId))
      .where(eq(birthdayWish.hidden, false))
      .orderBy(desc(birthdayWish.createdAt))
      .limit(30),
  ]);

  return (
    <div className="animate-rise">
      <PageHeader
        title="Birthdays"
        subtitle="Students get an automatic birthday email, a badge-style celebration and bonus points on their day."
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <SectionTitle className="mt-0">Next 60 days</SectionTitle>
          {people.length ? (
            <Card className="divide-y divide-border p-0">
              {people.map((p) => (
                <Link key={p.userId} href={`/admin/users/${p.userId}`} className="flex items-center gap-3 px-5 py-3 hover:bg-surface-2">
                  <Avatar name={p.name} avatarKey={p.avatarKey} size={36} ring={p.daysAway === 0 ? "gold" : undefined} />
                  <span className="flex-1 truncate font-medium">{p.name}</span>
                  <span className="text-right text-sm">
                    <span className="block">{prettyDate(p.birthday, "MMM d")}</span>
                    <span className="block text-xs text-muted">
                      {p.daysAway === 0 ? "Today 🎉" : `in ${p.daysAway}d`} · turns {ageOn(p.birthday, today) + (p.daysAway === 0 ? 0 : 1)}
                    </span>
                  </span>
                </Link>
              ))}
            </Card>
          ) : (
            <EmptyState icon="🎂" title="No birthdays coming up" />
          )}
        </div>
        <div>
          <SectionTitle className="mt-0">Recent wishes (moderation)</SectionTitle>
          {wishes.length ? (
            <div className="space-y-2">
              {wishes.map(({ w, to, from }) => (
                <Card key={w.id} className="flex items-start gap-3 p-4">
                  <div className="min-w-0 flex-1 text-sm">
                    <p>
                      <b>{from}</b> → <b>{to}</b> <Pill className="ml-1">{w.year}</Pill>
                    </p>
                    <p className="mt-1 text-muted">{w.message}</p>
                  </div>
                  <form action={hideWishAction}>
                    <input type="hidden" name="id" value={w.id} />
                    <Button size="icon-sm" variant="ghost" aria-label="Hide wish">
                      <EyeOff />
                    </Button>
                  </form>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted">No wishes yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
