import type { Metadata } from "next";
import { Clock } from "lucide-react";
import { ClockCard } from "@/components/app/clock-card";
import { Card, EmptyState, PageHeader, Pill, SectionTitle, Stat } from "@/components/ui/primitives";
import { completedMinutes, getClockCardData, getVisits, thisWeekRange, visitMinutes } from "@/lib/clock";
import { addDaysIso, currentMonth, formatMinutes, monthLabel, prettyDate, shiftMonth, zonedTime, zonedToday } from "@/lib/dates";
import { requireStudent } from "@/lib/session";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = { title: "My hours" };

export default async function ClockPage() {
  const { user } = await requireStudent();
  const settings = await getSettings();
  const week = thisWeekRange();
  const month = currentMonth();
  const today = zonedToday().iso;
  const [clock, weekMin, monthMin, visits] = await Promise.all([
    getClockCardData(user.id, settings),
    completedMinutes(user.id, week.start, week.end),
    completedMinutes(user.id, `${month}-01`, addDaysIso(`${shiftMonth(month, 1)}-01`, -1)),
    getVisits(user.id, 30),
  ]);

  return (
    <div className="animate-rise">
      <PageHeader
        eyebrow="Clock in"
        title="My hours"
        subtitle={`Clock in when you get to ${settings.clock.siteName} and out when you leave.`}
      />

      <ClockCard {...clock} />

      <div className="mt-4 grid grid-cols-2 gap-3">
        <Stat label="This week" value={formatMinutes(weekMin)} />
        <Stat label={monthLabel(month).split(" ")[0]} value={formatMinutes(monthMin)} />
      </div>
      {settings.points.clockVisit > 0 && (
        <p className="mt-3 px-1 text-sm text-muted">
          Earn <b className="text-fg">{settings.points.clockVisit} points</b> for each day you stay at least {settings.clock.minMinutes} minutes.
        </p>
      )}

      <SectionTitle>Recent visits</SectionTitle>
      {visits.length ? (
        <Card className="divide-y divide-border p-0">
          {visits.map((v) => {
            const open = !v.clockOutAt;
            const forgot = open && v.day < today;
            return (
              <div key={v.id} className="flex items-center gap-3 px-5 py-3.5">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{prettyDate(v.day, "EEE, MMM d")}</p>
                  <p className="text-sm text-muted">
                    {zonedTime(v.clockInAt)} – {v.clockOutAt ? zonedTime(v.clockOutAt) : forgot ? "no clock-out" : "now"}
                    {v.editedBy && " · edited by staff"}
                  </p>
                </div>
                {forgot ? (
                  <Pill tone="gold">Needs staff</Pill>
                ) : open ? (
                  <Pill tone="green">Here now</Pill>
                ) : (
                  <span className="text-right">
                    <span className="block font-display font-semibold tabular-nums">{formatMinutes(visitMinutes(v))}</span>
                    {v.pointsAwarded > 0 && <span className="block text-xs text-gold">+{v.pointsAwarded} pts</span>}
                  </span>
                )}
              </div>
            );
          })}
        </Card>
      ) : (
        <EmptyState icon={<Clock className="mx-auto size-8 text-muted" />} title="No visits yet" body="Your clock-ins will show up here." />
      )}
    </div>
  );
}
