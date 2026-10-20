import type { Metadata } from "next";
import { desc } from "drizzle-orm";
import { MapPin, Star, Trash2 } from "lucide-react";
import { AdminForm } from "@/components/admin/admin-forms";
import { SiteLocationFields } from "@/components/admin/clock-admin";
import { Button } from "@/components/ui/button";
import { Field, Input, SubmitButton, Switch } from "@/components/ui/form";
import { Card, PageHeader, Pill, SectionTitle } from "@/components/ui/primitives";
import { db } from "@/db";
import { term } from "@/db/schema";
import {
  createCohortAction,
  createTermAction,
  deleteCohortAction,
  saveClockSettingsAction,
  saveSettingsAction,
  termOpAction,
} from "@/actions/admin";
import { getCohorts } from "@/lib/admin-data";
import { prettyDate } from "@/lib/dates";
import { requireAdmin } from "@/lib/session";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = { title: "Settings" };

const POINT_LABELS: [keyof Awaited<ReturnType<typeof getSettings>>["points"], string][] = [
  ["reportCard", "Report card approved"],
  ["allPassing", "Passing every class (bonus)"],
  ["checkin", "Weekly check-in approved"],
  ["onTimeWeek", "On time all week (bonus)"],
  ["tutoring", "Attended tutoring"],
  ["ideaShipped", "Idea marked done"],
  ["birthday", "Birthday bonus"],
  ["clockVisit", "Program visit (once a day)"],
];

export default async function SettingsPage() {
  await requireAdmin();
  const [s, terms, cohorts] = await Promise.all([getSettings(), db.select().from(term).orderBy(desc(term.startsOn)), getCohorts()]);

  return (
    <div className="animate-rise">
      <PageHeader title="Settings" subtitle="Eligibility rules, points, grading periods and groups." />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <AdminForm action={saveSettingsAction} className="space-y-5">
            <div>
              <p className="font-display text-lg font-semibold">Eligibility rules</p>
              <p className="text-sm text-muted">What students need to stay “Eligible”.</p>
            </div>
            <Switch name="requireReportCard" defaultChecked={s.requireReportCard} label="Approved report card for the current period" />
            <Switch name="requireCounselor" defaultChecked={s.requireCounselor} label="Guidance counselor on file" />
            <Field label="Approved weekly check-ins needed (last 4 weeks)">
              <Input name="minCheckins" type="number" min={0} max={4} defaultValue={s.minCheckins} />
            </Field>
            <div className="border-t border-border pt-5">
              <p className="mb-3 flex items-center gap-2 font-display text-lg font-semibold">
                <Star className="size-4 fill-gold text-gold" /> Points
              </p>
              <div className="grid grid-cols-2 gap-3">
                {POINT_LABELS.map(([k, label]) => (
                  <Field key={k} label={label}>
                    <Input name={`p_${k}`} type="number" min={0} max={500} defaultValue={s.points[k]} />
                  </Field>
                ))}
              </div>
            </div>
            <SubmitButton block>Save settings</SubmitButton>
          </AdminForm>
        </Card>

        <div className="space-y-6">
          <Card id="clock">
            <p className="flex items-center gap-2 font-display text-lg font-semibold">
              <MapPin className="size-4 text-brand" /> Clock in / out
            </p>
            <p className="mb-4 text-sm text-muted">
              Students can only clock in or out when their phone is this close to the program site.
              {s.clock.lat == null && <b className="text-gold"> Set the location to turn clock-in on.</b>}
            </p>
            <AdminForm action={saveClockSettingsAction} className="space-y-4">
              <Switch name="enabled" defaultChecked={s.clock.enabled} label="Students can clock in and out" />
              <Field label="Place name (shown to students)">
                <Input name="siteName" maxLength={60} defaultValue={s.clock.siteName} />
              </Field>
              <SiteLocationFields lat={s.clock.lat} lng={s.clock.lng} />
              <p className="text-xs text-muted">Tip: open this page on your phone while standing at the site and tap “Use my current location”.</p>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Allowed distance (meters)">
                  <Input name="radiusM" type="number" min={25} max={2000} defaultValue={s.clock.radiusM} />
                </Field>
                <Field label="Minimum visit for points (min)">
                  <Input name="minMinutes" type="number" min={0} max={600} defaultValue={s.clock.minMinutes} />
                </Field>
              </div>
              <SubmitButton block variant="secondary">
                Save clock-in settings
              </SubmitButton>
            </AdminForm>
          </Card>

          <Card>
            <p className="font-display text-lg font-semibold">Grading periods</p>
            <p className="mb-4 text-sm text-muted">Students upload a report card for the current period.</p>
            <ul className="mb-4 space-y-2">
              {terms.map((t) => (
                <li key={t.id} className="flex items-center gap-2 rounded-2xl bg-surface-2 px-4 py-2.5 text-sm">
                  <span className="flex-1">
                    <b>{t.name}</b>{" "}
                    <span className="text-muted">
                      {prettyDate(t.startsOn, "MMM d")} – {prettyDate(t.endsOn, "MMM d, yyyy")}
                    </span>
                  </span>
                  {t.isCurrent ? (
                    <Pill tone="green">Current</Pill>
                  ) : (
                    <form action={termOpAction}>
                      <input type="hidden" name="id" value={t.id} />
                      <input type="hidden" name="op" value="current" />
                      <Button size="sm" variant="ghost">
                        Make current
                      </Button>
                    </form>
                  )}
                  <form action={termOpAction}>
                    <input type="hidden" name="id" value={t.id} />
                    <input type="hidden" name="op" value="delete" />
                    <Button size="icon-sm" variant="danger-ghost" aria-label="Delete period">
                      <Trash2 />
                    </Button>
                  </form>
                </li>
              ))}
            </ul>
            <AdminForm action={createTermAction} className="space-y-3" resetOnSuccess>
              <Input name="name" required placeholder="e.g. Fall 2026 — Quarter 1" />
              <div className="grid grid-cols-2 gap-3">
                <Field label="Starts">
                  <Input name="startsOn" type="date" required />
                </Field>
                <Field label="Ends">
                  <Input name="endsOn" type="date" required />
                </Field>
              </div>
              <Switch name="isCurrent" defaultChecked label="Make this the current period" />
              <SubmitButton block variant="secondary">
                Add grading period
              </SubmitButton>
            </AdminForm>
          </Card>

          <Card>
            <p className="font-display text-lg font-semibold">Groups</p>
            <p className="mb-4 text-sm text-muted">Optional cohorts (e.g. “Fall 2026”, “Seniors”) for filtering and assigning forms.</p>
            <div className="mb-4 flex flex-wrap gap-2">
              {cohorts.map((c) => (
                <form key={c.id} action={deleteCohortAction} className="flex items-center gap-1 rounded-full bg-surface-2 py-1 pr-1 pl-3 text-sm">
                  {c.name}
                  <input type="hidden" name="id" value={c.id} />
                  <button className="rounded-full p-1 text-muted hover:text-danger" aria-label={`Delete ${c.name}`}>
                    <Trash2 className="size-3.5" />
                  </button>
                </form>
              ))}
              {!cohorts.length && <span className="text-sm text-muted">No groups yet.</span>}
            </div>
            <AdminForm action={createCohortAction} className="flex gap-2" resetOnSuccess>
              <Input name="name" required placeholder="Group name" />
              <SubmitButton variant="secondary">Add</SubmitButton>
            </AdminForm>
          </Card>
        </div>
      </div>
      <SectionTitle>Email</SectionTitle>
      <Card className="text-sm text-muted">
        Emails are sent with Resend from <code className="text-fg">{process.env.EMAIL_FROM ?? "onboarding@resend.dev"}</code>. To email students, verify
        CM2&apos;s domain in Resend and set <code className="text-fg">EMAIL_FROM</code> in Vercel (e.g. “IGNITE Academy &lt;ignite@yourdomain.org&gt;”).
      </Card>
    </div>
  );
}
