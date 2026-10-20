import Link from "next/link";
import type { Metadata } from "next";
import { asc, eq } from "drizzle-orm";
import { AlertTriangle, ChevronLeft, ChevronRight, Download, MapPin, Pencil, Plus, Trash2 } from "lucide-react";
import { AdminForm } from "@/components/admin/admin-forms";
import { Avatar } from "@/components/ui/avatar";
import { Button, buttonVariants } from "@/components/ui/button";
import { Field, Input, Select, SubmitButton } from "@/components/ui/form";
import { Card, EmptyState, PageHeader, Pill, SectionTitle, Stat } from "@/components/ui/primitives";
import { Sheet } from "@/components/ui/sheet";
import { db } from "@/db";
import { clockSession, profile, user } from "@/db/schema";
import { addVisitAction, deleteVisitAction, saveVisitAction } from "@/actions/admin";
import { getStaleOpen, visitMinutes, type ClockRow } from "@/lib/clock";
import { addDaysIso, formatMinutes, prettyDate, toZonedInput, weekOf, zonedTime, zonedToday } from "@/lib/dates";
import { requireAdmin } from "@/lib/session";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = { title: "Clock-ins" };

const isIsoDay = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);

type Person = { name: string; avatarKey: string | null };

function VisitForm({ v, closing }: { v: ClockRow; closing?: boolean }) {
  // Default a missing clock-out to the clock-in time so staff only adjust the hour.
  const outDefault = v.clockOutAt ? toZonedInput(v.clockOutAt) : closing ? toZonedInput(v.clockInAt) : "";
  return (
    <AdminForm action={saveVisitAction} className="space-y-4">
      <input type="hidden" name="id" value={v.id} />
      <div className="grid grid-cols-2 gap-3">
        <Field label="Clock in">
          <Input name="clockInAt" type="datetime-local" required defaultValue={toZonedInput(v.clockInAt)} />
        </Field>
        <Field label="Clock out">
          <Input name="clockOutAt" type="datetime-local" required={closing} defaultValue={outDefault} />
        </Field>
      </div>
      <Field label="Staff note (optional)">
        <Input name="note" maxLength={200} defaultValue={v.staffNote ?? ""} placeholder="e.g. Forgot to clock out, left at 6pm" />
      </Field>
      <SubmitButton block>{closing ? "Set clock-out" : "Save visit"}</SubmitButton>
    </AdminForm>
  );
}

function VisitRow({ v, who, today }: { v: ClockRow; who: Person; today: string }) {
  const open = !v.clockOutAt;
  const forgot = open && v.day < today;
  return (
    <div className="flex items-center gap-3 px-5 py-3">
      <Avatar name={who.name} avatarKey={who.avatarKey} size={36} />
      <div className="min-w-0 flex-1">
        <Link href={`/admin/users/${v.userId}`} className="block truncate font-semibold hover:underline">
          {who.name}
        </Link>
        <p className="text-xs text-muted">
          {forgot && `${prettyDate(v.day, "EEE, MMM d")} · `}
          {zonedTime(v.clockInAt)} – {v.clockOutAt ? zonedTime(v.clockOutAt) : forgot ? "no clock-out" : "now"}
          {v.inDistanceM != null && ` · ${v.inDistanceM} m away`}
          {v.editedBy && " · edited"}
          {v.staffNote && ` · “${v.staffNote}”`}
        </p>
      </div>
      {forgot ? (
        <Pill tone="gold">Forgot</Pill>
      ) : open ? (
        <Pill tone="green">Here</Pill>
      ) : (
        <span className="text-right text-sm">
          <span className="block font-semibold tabular-nums">{formatMinutes(visitMinutes(v))}</span>
          {v.pointsAwarded > 0 && <span className="block text-xs text-gold">+{v.pointsAwarded}</span>}
        </span>
      )}
      <Sheet
        title={forgot ? "Set clock-out" : "Edit visit"}
        description={`${who.name} · ${prettyDate(v.day, "EEEE, MMM d")}`}
        trigger={
          <Button size="icon-sm" variant={forgot ? "secondary" : "ghost"} aria-label="Edit visit">
            <Pencil />
          </Button>
        }
      >
        <VisitForm v={v} closing={forgot} />
        <form action={deleteVisitAction} className="mt-3">
          <input type="hidden" name="id" value={v.id} />
          <Button variant="danger-ghost" block size="sm">
            <Trash2 /> Delete this visit
          </Button>
        </form>
      </Sheet>
    </div>
  );
}

export default async function ClockAdminPage({ searchParams }: PageProps<"/admin/clock">) {
  await requireAdmin();
  const sp = await searchParams;
  const today = zonedToday().iso;
  const day = isIsoDay(sp.day) && sp.day <= today ? sp.day : today;

  const [settings, visits, stale, students] = await Promise.all([
    getSettings(),
    db.select().from(clockSession).where(eq(clockSession.day, day)).orderBy(asc(clockSession.clockInAt)),
    getStaleOpen(),
    db
      .select({ id: user.id, name: user.name, avatarKey: profile.avatarKey, banned: user.banned })
      .from(user)
      .leftJoin(profile, eq(profile.userId, user.id))
      .where(eq(user.role, "student"))
      .orderBy(asc(user.name)),
  ]);
  const people = new Map<string, Person>(students.map((s) => [s.id, { name: s.name, avatarKey: s.avatarKey }]));
  const who = (id: string): Person => people.get(id) ?? { name: "Former student", avatarKey: null };

  const hereNow = day === today ? visits.filter((v) => !v.clockOutAt) : [];
  const dayMinutes = visits.reduce((sum, v) => sum + (v.clockOutAt ? visitMinutes(v) : 0), 0);
  const uniqueStudents = new Set(visits.map((v) => v.userId)).size;
  const notSetUp = settings.clock.lat == null || settings.clock.lng == null;
  const weekStart = weekOf(today);

  return (
    <div className="animate-rise">
      <PageHeader
        title="Clock-ins"
        subtitle={`Who's at ${settings.clock.siteName}, and for how long.`}
        action={
          <Sheet
            title="Add a visit"
            description="For when a student couldn't clock in (dead phone, no signal…)."
            trigger={
              <Button size="sm">
                <Plus /> Add visit
              </Button>
            }
          >
            <AdminForm action={addVisitAction} className="space-y-4" resetOnSuccess>
              <Field label="Student">
                <Select name="userId" required defaultValue="">
                  <option value="" disabled>
                    Pick a student
                  </option>
                  {students.filter((s) => !s.banned).map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Clock in">
                  <Input name="clockInAt" type="datetime-local" required defaultValue={`${day}T15:00`} />
                </Field>
                <Field label="Clock out">
                  <Input name="clockOutAt" type="datetime-local" required defaultValue={`${day}T17:00`} />
                </Field>
              </div>
              <Field label="Staff note (optional)">
                <Input name="note" maxLength={200} placeholder="e.g. Phone was dead" />
              </Field>
              <SubmitButton block>Add visit</SubmitButton>
            </AdminForm>
          </Sheet>
        }
      />

      {notSetUp && (
        <Link href="/admin/settings#clock" className="mb-4 flex items-center gap-3 rounded-3xl bg-gold-soft p-4 text-sm">
          <MapPin className="size-5 shrink-0 text-gold" />
          <span>
            <b>Clock-in is off until you set the program location.</b> Go to Settings → Clock in / out.
          </span>
        </Link>
      )}

      {stale.length > 0 && (
        <>
          <SectionTitle className="mt-0">
            <span className="flex items-center gap-2">
              <AlertTriangle className="size-4 text-gold" /> Forgot to clock out ({stale.length})
            </span>
          </SectionTitle>
          <Card className="mb-6 divide-y divide-border border-gold/40 p-0">
            {stale.map((v) => (
              <VisitRow key={v.id} v={v} who={who(v.userId)} today={today} />
            ))}
          </Card>
        </>
      )}

      <div className="mb-4 flex items-center justify-between gap-2">
        <Link href={`/admin/clock?day=${addDaysIso(day, -1)}`} className={buttonVariants({ variant: "secondary", size: "icon-sm" })} aria-label="Previous day">
          <ChevronLeft />
        </Link>
        <form className="flex items-center gap-2">
          <Input name="day" type="date" max={today} defaultValue={day} className="h-9 w-auto" aria-label="Day" />
          <Button size="sm" variant="secondary">
            Go
          </Button>
        </form>
        {day < today ? (
          <Link href={`/admin/clock?day=${addDaysIso(day, 1)}`} className={buttonVariants({ variant: "secondary", size: "icon-sm" })} aria-label="Next day">
            <ChevronRight />
          </Link>
        ) : (
          <span className="size-9" />
        )}
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Stat label={day === today ? "Here now" : "Visits"} value={day === today ? hereNow.length : visits.length} tone={hereNow.length ? "green" : undefined} />
        <Stat label="Students" value={uniqueStudents} />
        <Stat label="Hours" value={(dayMinutes / 60).toFixed(1)} />
      </div>

      <SectionTitle>{day === today ? "Today" : prettyDate(day, "EEEE, MMMM d")}</SectionTitle>
      {visits.length ? (
        <Card className="divide-y divide-border p-0">
          {visits.map((v) => (
            <VisitRow key={v.id} v={v} who={who(v.userId)} today={today} />
          ))}
        </Card>
      ) : (
        <EmptyState title="No clock-ins" body={day === today ? "Nobody has clocked in yet today." : "Nobody clocked in this day."} />
      )}

      <SectionTitle>Export hours</SectionTitle>
      <Card>
        <form action="/admin/clock/export" method="get" className="flex flex-wrap items-end gap-3">
          <Field label="From">
            <Input name="from" type="date" required defaultValue={weekStart} max={today} />
          </Field>
          <Field label="To">
            <Input name="to" type="date" required defaultValue={today} max={today} />
          </Field>
          <Button variant="secondary">
            <Download /> Download CSV
          </Button>
        </form>
        <p className="mt-3 text-xs text-muted">One row per visit, plus each student&apos;s total hours.</p>
      </Card>
    </div>
  );
}
