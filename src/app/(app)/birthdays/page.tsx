import type { Metadata } from "next";
import { and, desc, eq } from "drizzle-orm";
import { Gift } from "lucide-react";
import { WishForm } from "@/components/app/mini-forms";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ConfettiOnMount } from "@/components/ui/confetti";
import { Card, EmptyState, PageHeader, SectionTitle } from "@/components/ui/primitives";
import { Sheet } from "@/components/ui/sheet";
import { db } from "@/db";
import { birthdayWish, user } from "@/db/schema";
import { ageOn, prettyDate, zonedToday } from "@/lib/dates";
import { requireStudent } from "@/lib/session";
import { getUpcomingBirthdays, isBirthdayToday } from "@/lib/student-data";
import { firstName, shortName } from "@/lib/utils";

export const metadata: Metadata = { title: "Birthdays" };

export default async function BirthdaysPage() {
  const { user: me, profile } = await requireStudent();
  const today = zonedToday();
  const [people, wishes] = await Promise.all([
    getUpcomingBirthdays(45),
    db
      .select({ w: birthdayWish, fromName: user.name })
      .from(birthdayWish)
      .innerJoin(user, eq(user.id, birthdayWish.fromUserId))
      .where(and(eq(birthdayWish.toUserId, me.id), eq(birthdayWish.year, today.y), eq(birthdayWish.hidden, false)))
      .orderBy(desc(birthdayWish.createdAt)),
  ]);
  const todays = people.filter((p) => p.daysAway === 0 && p.userId !== me.id);
  const upcoming = people.filter((p) => p.daysAway > 0);
  const mine = isBirthdayToday(profile.birthday);

  return (
    <div className="animate-rise">
      {mine && <ConfettiOnMount storageKey={`bday-page-${today.iso}`} />}
      <PageHeader eyebrow="🎂 Celebrate" title="Birthdays" subtitle="At IGNITE, birthdays are a big deal. Send some love." />

      {mine && (
        <Card className="mb-4 border-gold/40 bg-gradient-to-br from-gold/15 to-surface glow-gold">
          <p className="font-display text-xl font-bold">Happy birthday, {firstName(me.name, profile.preferredName)}! 🎉</p>
          <p className="mt-1 text-sm text-muted">
            {wishes.length ? `You have ${wishes.length} wish${wishes.length === 1 ? "" : "es"} from the fam.` : "Wishes from the IGNITE fam will show up here."}
          </p>
          {wishes.length > 0 && (
            <ul className="mt-4 space-y-2">
              {wishes.map(({ w, fromName }) => (
                <li key={w.id} className="rounded-2xl bg-surface/80 p-3 text-sm">
                  <p>{w.message}</p>
                  <p className="mt-1 text-xs text-muted">— {shortName(fromName)}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      <SectionTitle className="mt-2">Today</SectionTitle>
      {todays.length ? (
        <div className="space-y-3">
          {todays.map((p) => (
            <Card key={p.userId} className="flex items-center gap-4 border-gold/30">
              <Avatar name={p.name} avatarKey={p.avatarKey} size={56} ring="gold" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-display text-lg font-bold">{shortName(p.name, p.preferredName)}</p>
                <p className="text-sm text-muted">Turning {ageOn(p.birthday, today.iso)} today 🎈</p>
              </div>
              <Sheet
                title={`Wish ${firstName(p.name, p.preferredName)} a happy birthday`}
                trigger={
                  <Button size="sm" variant="gold">
                    <Gift /> Wish
                  </Button>
                }
              >
                <WishForm toUserId={p.userId} name={firstName(p.name, p.preferredName)} />
              </Sheet>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState icon="🎈" title="No birthdays today" className="py-6" />
      )}

      <SectionTitle>Coming up</SectionTitle>
      {upcoming.length ? (
        <ul className="space-y-2">
          {upcoming.map((p) => (
            <li key={p.userId} className="flex items-center gap-3 rounded-2xl border border-border bg-surface px-3.5 py-3">
              <Avatar name={p.name} avatarKey={p.avatarKey} size={40} />
              <span className="flex-1 truncate font-semibold">
                {p.userId === me.id ? "You 🎉" : shortName(p.name, p.preferredName)}
              </span>
              <span className="text-right text-sm">
                <span className="block font-medium">{prettyDate(p.birthday, "MMM d")}</span>
                <span className="block text-xs text-muted">in {p.daysAway} day{p.daysAway === 1 ? "" : "s"}</span>
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted">No birthdays in the next few weeks.</p>
      )}
    </div>
  );
}
