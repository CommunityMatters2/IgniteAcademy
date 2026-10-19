import Link from "next/link";
import type { Metadata } from "next";
import { ArrowUpRight, BookOpen, Cake, ClipboardCheck, Crown, Flame, Megaphone, Pin, Star, Video } from "lucide-react";
import { EligibilityCard } from "@/components/app/eligibility-card";
import { Avatar } from "@/components/ui/avatar";
import { ConfettiOnMount } from "@/components/ui/confetti";
import { Card, Eyebrow, SectionTitle } from "@/components/ui/primitives";
import { buttonVariants } from "@/components/ui/button";
import { getEligibility } from "@/lib/eligibility";
import { TZ, currentMonth, monthLabel, prettyDate, zonedDateTime, zonedToday } from "@/lib/dates";
import { getLeaderboard, getUserMonthPoints } from "@/lib/leaderboard";
import { requireStudent } from "@/lib/session";
import {
  getAnnouncements,
  getBadgeCount,
  getCheckinStreak,
  getNextSignedUpSession,
  getOpenForms,
  getUpcomingBirthdays,
  isBirthdayToday,
} from "@/lib/student-data";
import { firstName } from "@/lib/utils";

export const metadata: Metadata = { title: "Home" };

export default async function HomePage({ searchParams }: PageProps<"/home">) {
  const { user, profile } = await requireStudent();
  const month = currentMonth();
  const [eligibility, points, board, badges, streak, nextSession, news, forms, birthdays, sp] = await Promise.all([
    getEligibility(user.id),
    getUserMonthPoints(user.id, month),
    getLeaderboard(month, 100),
    getBadgeCount(user.id),
    getCheckinStreak(user.id),
    getNextSignedUpSession(user.id),
    getAnnouncements(3),
    getOpenForms(user.id, profile.cohortId),
    getUpcomingBirthdays(7),
    searchParams,
  ]);
  const rankIdx = board.findIndex((r) => r.userId === user.id);
  const rank = rankIdx >= 0 ? rankIdx + 1 : null;
  const name = firstName(user.name, profile.preferredName);
  const birthdayToday = isBirthdayToday(profile.birthday);
  const today = zonedToday();
  const greeting = new Intl.DateTimeFormat("en-US", { timeZone: TZ, hour: "numeric", hour12: false }).format(new Date());
  const hour = Number(greeting);
  const hello = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const othersBirthdays = birthdays.filter((b) => b.userId !== user.id);

  return (
    <div className="animate-rise">
      {sp.welcome === "1" && <ConfettiOnMount storageKey="welcome" />}
      {birthdayToday && <ConfettiOnMount storageKey={`bday-${today.iso}`} />}

      <header className="mb-6 flex items-center justify-between gap-3">
        <div>
          <Eyebrow>{prettyDate(today.iso, "EEEE, MMM d")}</Eyebrow>
          <h1 className="mt-1 font-display text-[30px] leading-tight font-bold tracking-tight">
            {birthdayToday ? `Happy birthday, ${name}! 🎂` : `${hello}, ${name}`}
          </h1>
        </div>
        <Link href="/me" aria-label="My profile">
          <Avatar name={user.name} avatarKey={profile.avatarKey} size={48} ring={birthdayToday ? "gold" : undefined} />
        </Link>
      </header>

      {birthdayToday && (
        <Link
          href="/birthdays"
          className="mb-4 flex items-center gap-4 rounded-3xl bg-gradient-to-br from-gold to-[#ffb84d] p-5 text-gold-fg glow-gold"
        >
          <span className="text-4xl">🎉</span>
          <span>
            <span className="block font-display text-lg font-bold">It&apos;s your day!</span>
            <span className="block text-sm opacity-80">The whole IGNITE fam is celebrating you. See your wishes →</span>
          </span>
        </Link>
      )}

      <EligibilityCard eligibility={eligibility} />

      <div className="mt-4 grid grid-cols-2 gap-3">
        <Link href="/leaderboard" className="group rounded-3xl border border-border bg-surface p-4 transition-colors hover:border-gold/50">
          <div className="flex items-center justify-between">
            <Crown className="size-5 text-gold" />
            <ArrowUpRight className="size-4 text-muted transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </div>
          <p className="mt-3 font-display text-3xl font-bold tabular-nums">{rank ? `#${rank}` : "—"}</p>
          <p className="text-xs text-muted">
            {points} pts · {monthLabel(month).split(" ")[0]}
          </p>
        </Link>
        <Link href="/school#attendance" className="group rounded-3xl border border-border bg-surface p-4 transition-colors hover:border-brand/50">
          <div className="flex items-center justify-between">
            <Flame className={streak > 0 ? "size-5 text-[#ff8a3d]" : "size-5 text-muted"} />
            <ArrowUpRight className="size-4 text-muted" />
          </div>
          <p className="mt-3 font-display text-3xl font-bold tabular-nums">{streak}</p>
          <p className="text-xs text-muted">week check-in streak</p>
        </Link>
        <Link href="/awards" className="group rounded-3xl border border-border bg-surface p-4 transition-colors hover:border-gold/50">
          <div className="flex items-center justify-between">
            <Star className="size-5 fill-gold text-gold" />
            <ArrowUpRight className="size-4 text-muted" />
          </div>
          <p className="mt-3 font-display text-3xl font-bold tabular-nums">{badges}</p>
          <p className="text-xs text-muted">badges earned</p>
        </Link>
        <Link href="/forms" className="group rounded-3xl border border-border bg-surface p-4 transition-colors hover:border-brand/50">
          <div className="flex items-center justify-between">
            <ClipboardCheck className={forms.open.length ? "size-5 text-info" : "size-5 text-muted"} />
            <ArrowUpRight className="size-4 text-muted" />
          </div>
          <p className="mt-3 font-display text-3xl font-bold tabular-nums">{forms.open.length}</p>
          <p className="text-xs text-muted">{forms.open.length === 1 ? "form to fill" : "forms to fill"}</p>
        </Link>
      </div>

      <SectionTitle action={<Link href="/help" className="text-sm font-semibold text-brand">Help Center</Link>}>
        Up next
      </SectionTitle>
      {nextSession ? (
        <Card className="flex items-center gap-4">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-info-soft text-info">
            <Video className="size-6" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">{nextSession.title}</p>
            <p className="text-sm text-muted">{zonedDateTime(nextSession.startsAt)}</p>
          </div>
          {nextSession.meetingUrl && (
            <a href={nextSession.meetingUrl} target="_blank" rel="noreferrer" className={buttonVariants({ size: "sm" })}>
              Join
            </a>
          )}
        </Card>
      ) : (
        <Link href="/help" className="flex items-center gap-4 rounded-3xl border border-dashed border-border p-5 hover:border-brand">
          <BookOpen className="size-6 text-brand" />
          <span className="text-sm">
            <span className="block font-semibold">No sessions booked</span>
            <span className="text-muted">Grab a seat in an ORBIT tutoring session.</span>
          </span>
        </Link>
      )}

      {othersBirthdays.length > 0 && (
        <>
          <SectionTitle action={<Link href="/birthdays" className="text-sm font-semibold text-brand">See all</Link>}>
            Birthdays this week
          </SectionTitle>
          <div className="no-scrollbar -mx-5 flex gap-3 overflow-x-auto px-5 md:mx-0 md:px-0">
            {othersBirthdays.map((b) => (
              <Link
                key={b.userId}
                href="/birthdays"
                className="flex w-28 shrink-0 flex-col items-center rounded-3xl border border-border bg-surface p-4 text-center"
              >
                <Avatar name={b.name} avatarKey={b.avatarKey} size={52} ring={b.daysAway === 0 ? "gold" : undefined} />
                <p className="mt-2 w-full truncate text-sm font-semibold">{firstName(b.name, b.preferredName)}</p>
                <p className="text-xs text-muted">
                  {b.daysAway === 0 ? (
                    <span className="font-semibold text-gold">Today 🎂</span>
                  ) : (
                    prettyDate(b.birthday, "MMM d")
                  )}
                </p>
              </Link>
            ))}
          </div>
        </>
      )}

      <SectionTitle>Announcements</SectionTitle>
      {news.length ? (
        <div className="space-y-3">
          {news.map((a) => (
            <Card key={a.id} className="p-4">
              <div className="mb-1 flex items-center gap-2 text-xs text-muted">
                {a.pinned ? <Pin className="size-3.5 text-gold" /> : <Megaphone className="size-3.5" />}
                {prettyDate(a.createdAt, "MMM d")}
              </div>
              <p className="font-semibold">{a.title}</p>
              <p className="mt-1 text-sm whitespace-pre-line text-muted">{a.body}</p>
            </Card>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted">Nothing new right now.</p>
      )}

      {!profile.birthday && (
        <Link href="/me/profile" className="mt-6 flex items-center gap-3 rounded-3xl bg-gold-soft p-4 text-sm">
          <Cake className="size-5 text-gold" /> Add your birthday so we can celebrate you!
        </Link>
      )}
    </div>
  );
}
