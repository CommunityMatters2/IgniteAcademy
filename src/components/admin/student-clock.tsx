import Link from "next/link";
import { Pill } from "@/components/ui/primitives";
import { completedMinutes, getVisits, thisWeekRange, visitMinutes } from "@/lib/clock";
import { addDaysIso, currentMonth, formatMinutes, prettyDate, shiftMonth, zonedTime, zonedToday } from "@/lib/dates";

/** Hours summary + recent visits on the admin student page. */
export async function StudentClockSummary({ userId }: { userId: string }) {
  const week = thisWeekRange();
  const month = currentMonth();
  const today = zonedToday().iso;
  const [weekMin, monthMin, visits] = await Promise.all([
    completedMinutes(userId, week.start, week.end),
    completedMinutes(userId, `${month}-01`, addDaysIso(`${shiftMonth(month, 1)}-01`, -1)),
    getVisits(userId, 8),
  ]);
  return (
    <div>
      <p className="mb-3 text-sm text-muted">
        This week <b className="text-fg">{formatMinutes(weekMin)}</b> · This month <b className="text-fg">{formatMinutes(monthMin)}</b>
      </p>
      {visits.length ? (
        <div className="flex flex-wrap gap-2">
          {visits.map((v) => {
            const open = !v.clockOutAt;
            const forgot = open && v.day < today;
            return (
              <Link key={v.id} href={`/admin/clock?day=${v.day}`}>
                <Pill tone={forgot ? "gold" : open ? "green" : "neutral"}>
                  {prettyDate(v.day, "M/d")} · {zonedTime(v.clockInAt)}
                  {forgot ? " · no clock-out" : open ? " · here now" : ` · ${formatMinutes(visitMinutes(v))}`}
                </Pill>
              </Link>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-muted">No visits yet.</p>
      )}
    </div>
  );
}
