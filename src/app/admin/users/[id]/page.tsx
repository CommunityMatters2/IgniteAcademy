import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { desc, eq } from "drizzle-orm";
import { ArrowLeft, Eye, FileText, KeyRound, Mail, Pause, Play, ShieldCheck, Trash2 } from "lucide-react";
import { AdminForm } from "@/components/admin/admin-forms";
import { StudentClockSummary } from "@/components/admin/student-clock";
import { EligibilityCard } from "@/components/app/eligibility-card";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, SubmitButton } from "@/components/ui/form";
import { Card, Eyebrow, Pill, SectionTitle, reviewLabel, reviewTone } from "@/components/ui/primitives";
import { Sheet } from "@/components/ui/sheet";
import { db } from "@/db";
import {
  attendanceCheckin,
  badge,
  counselorVerification,
  pointEvent,
  profile,
  reportCard,
  user,
  userBadge,
} from "@/db/schema";
import {
  adjustPointsAction,
  awardBadgeAction,
  banUserAction,
  impersonateAction,
  removeUserAction,
  resendInviteAction,
  sendCounselorVerificationAction,
  sendResetAction,
  unbanUserAction,
  updateUserAction,
} from "@/actions/admin";
import { getCohorts } from "@/lib/admin-data";
import { ageOn, currentMonth, prettyDate, zonedToday } from "@/lib/dates";
import { getEligibility } from "@/lib/eligibility";
import { getUserMonthPoints, getUserTotalPoints } from "@/lib/leaderboard";
import { requireAdmin } from "@/lib/session";
import { fileUrl } from "@/lib/storage";

export const metadata: Metadata = { title: "Student" };

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium break-words">{value || <span className="text-muted">—</span>}</dd>
    </div>
  );
}

export default async function UserDetail({ params }: PageProps<"/admin/users/[id]">) {
  const { user: me } = await requireAdmin();
  const { id } = await params;
  const u = await db.query.user.findFirst({ where: eq(user.id, id) });
  if (!u) notFound();
  const [p, cohorts, elig, monthPts, totalPts, cards, checkins, badges, allBadges, verifications, points] = await Promise.all([
    db.query.profile.findFirst({ where: eq(profile.userId, id) }),
    getCohorts(),
    getEligibility(id),
    getUserMonthPoints(id, currentMonth()),
    getUserTotalPoints(id),
    db.select().from(reportCard).where(eq(reportCard.userId, id)).orderBy(desc(reportCard.createdAt)).limit(10),
    db.select().from(attendanceCheckin).where(eq(attendanceCheckin.userId, id)).orderBy(desc(attendanceCheckin.weekOf)).limit(12),
    db
      .select({ ub: userBadge, b: badge })
      .from(userBadge)
      .innerJoin(badge, eq(badge.id, userBadge.badgeId))
      .where(eq(userBadge.userId, id))
      .orderBy(desc(userBadge.awardedAt)),
    db.select().from(badge).where(eq(badge.active, true)),
    db.select().from(counselorVerification).where(eq(counselorVerification.userId, id)).orderBy(desc(counselorVerification.createdAt)).limit(5),
    db.select().from(pointEvent).where(eq(pointEvent.userId, id)).orderBy(desc(pointEvent.createdAt)).limit(8),
  ]);
  const isStudent = (u.role ?? "student") === "student";
  const today = zonedToday().iso;

  return (
    <div className="animate-rise">
      <Link href="/admin/users" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-fg">
        <ArrowLeft className="size-4" /> All users
      </Link>

      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center">
        <Avatar name={u.name} avatarKey={p?.avatarKey} size={72} />
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-3xl font-bold tracking-tight">{u.name}</h1>
          <p className="text-sm break-all text-muted">
            {u.email}
            {p?.preferredName && ` · goes by ${p.preferredName}`}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Pill tone="blue">{u.role}</Pill>
            {u.banned && <Pill tone="red">Paused{u.banReason ? `: ${u.banReason}` : ""}</Pill>}
            {!p?.onboardedAt && isStudent && <Pill>Not activated</Pill>}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {isStudent && p?.onboardedAt && !u.banned && (
            <form action={impersonateAction}>
              <input type="hidden" name="userId" value={u.id} />
              <Button size="sm" variant="secondary">
                <Eye /> View as
              </Button>
            </form>
          )}
          {!p?.onboardedAt && (
            <AdminForm action={resendInviteAction}>
              <input type="hidden" name="userId" value={u.id} />
              <SubmitButton size="sm" variant="secondary" pendingText="Sending…">
                <Mail /> Resend invite
              </SubmitButton>
            </AdminForm>
          )}
          {p?.onboardedAt && (
            <AdminForm action={sendResetAction}>
              <input type="hidden" name="userId" value={u.id} />
              <SubmitButton size="sm" variant="secondary" pendingText="Sending…">
                <KeyRound /> Reset password
              </SubmitButton>
            </AdminForm>
          )}
          {u.id !== me.id &&
            (u.banned ? (
              <AdminForm action={unbanUserAction}>
                <input type="hidden" name="userId" value={u.id} />
                <SubmitButton size="sm" variant="secondary">
                  <Play /> Re-activate
                </SubmitButton>
              </AdminForm>
            ) : (
              <Sheet
                title={`Pause ${u.name.split(" ")[0]}'s account?`}
                description="They'll be signed out and can't log in until re-activated. Their data is kept."
                trigger={
                  <Button size="sm" variant="secondary">
                    <Pause /> Pause
                  </Button>
                }
              >
                <AdminForm action={banUserAction} className="space-y-4">
                  <input type="hidden" name="userId" value={u.id} />
                  <Field label="Reason (shown to staff only)">
                    <Input name="reason" placeholder="e.g. Not meeting school requirements" />
                  </Field>
                  <SubmitButton block variant="danger">
                    Pause account
                  </SubmitButton>
                </AdminForm>
              </Sheet>
            ))}
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="space-y-6 lg:col-span-3">
          {isStudent && <EligibilityCard eligibility={elig} />}

          <Card>
            <Eyebrow className="mb-4">Profile</Eyebrow>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-3">
              <Info label="School" value={p?.school} />
              <Info label="Grade" value={p?.gradeLevel} />
              <Info
                label="Birthday"
                value={p?.birthday && `${prettyDate(p.birthday, "MMM d, yyyy")} (${ageOn(p.birthday, today)})`}
              />
              <Info label="Phone" value={p?.phone} />
              <Info label="T-shirt" value={p?.tshirtSize} />
              <Info label="Joined" value={prettyDate(u.createdAt, "MMM d, yyyy")} />
              <Info label="Guardian" value={p?.guardianName} />
              <Info label="Guardian phone" value={p?.guardianPhone} />
              <Info label="Guardian email" value={p?.guardianEmail} />
            </dl>
          </Card>

          {isStudent && (
            <Card>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <Eyebrow className="mb-2">Guidance counselor</Eyebrow>
                  <p className="font-semibold">{p?.counselorName ?? "Not provided"}</p>
                  <p className="text-sm text-muted">{[p?.counselorEmail, p?.counselorPhone].filter(Boolean).join(" · ")}</p>
                </div>
                {p?.counselorEmail && (
                  <AdminForm action={sendCounselorVerificationAction}>
                    <input type="hidden" name="userId" value={u.id} />
                    <SubmitButton size="sm" pendingText="Sending…">
                      <ShieldCheck /> Request verification
                    </SubmitButton>
                  </AdminForm>
                )}
              </div>
              {verifications.length > 0 && (
                <ul className="mt-4 space-y-2">
                  {verifications.map((v) => (
                    <li key={v.id} className="rounded-2xl bg-surface-2 px-4 py-3 text-sm">
                      <div className="flex items-center justify-between">
                        <span>Sent {prettyDate(v.createdAt, "MMM d")} to {v.counselorEmail}</span>
                        <Pill tone={v.status === "completed" ? "green" : "gold"}>{v.status}</Pill>
                      </div>
                      {v.status === "completed" && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          <Pill tone={v.enrolled ? "green" : "red"}>Enrolled: {v.enrolled ? "Yes" : "No"}</Pill>
                          <Pill tone={v.attendanceGood ? "green" : "red"}>On-time attendance: {v.attendanceGood ? "Yes" : "No"}</Pill>
                          <Pill tone={v.passing ? "green" : "red"}>Passing: {v.passing ? "Yes" : "No"}</Pill>
                        </div>
                      )}
                      {v.comments && <p className="mt-2 text-muted">“{v.comments}”</p>}
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          )}

          {isStudent && (
            <div>
              <SectionTitle className="mt-0">Report cards</SectionTitle>
              {cards.length ? (
                <Card className="divide-y divide-border p-0">
                  {cards.map((c) => (
                    <a key={c.id} href={fileUrl(c.fileKey)!} target="_blank" rel="noreferrer" className="flex items-center gap-3 px-5 py-3 text-sm hover:bg-surface-2">
                      <FileText className="size-4 text-muted" />
                      <span className="flex-1">
                        {prettyDate(c.createdAt, "MMM d, yyyy")}
                        {c.gpa && ` · GPA ${c.gpa}`}
                        {c.allPassing === false && " · not all passing"}
                      </span>
                      <Pill tone={reviewTone(c.status)}>{reviewLabel(c.status)}</Pill>
                    </a>
                  ))}
                </Card>
              ) : (
                <p className="text-sm text-muted">None yet.</p>
              )}

              <SectionTitle>Attendance check-ins</SectionTitle>
              {checkins.length ? (
                <div className="flex flex-wrap gap-2">
                  {checkins.map((c) => (
                    <a key={c.id} href={fileUrl(c.proofKey) ?? "#"} target="_blank" rel="noreferrer">
                      <Pill tone={reviewTone(c.status)}>
                        {prettyDate(c.weekOf, "M/d")} · {c.daysPresent}d{c.daysLate ? ` · ${c.daysLate} late` : ""}
                      </Pill>
                    </a>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted">None yet.</p>
              )}

              <SectionTitle>Clock-ins</SectionTitle>
              <StudentClockSummary userId={id} />
            </div>
          )}
        </div>

        <div className="space-y-6 lg:col-span-2">
          <Card>
            <Eyebrow className="mb-4">Account settings</Eyebrow>
            <AdminForm action={updateUserAction} className="space-y-4">
              <input type="hidden" name="userId" value={u.id} />
              <Field label="Full name">
                <Input name="name" defaultValue={u.name} />
              </Field>
              <Field label="Role">
                <Select name="role" defaultValue={u.role ?? "student"}>
                  <option value="student">Student</option>
                  <option value="tutor">Tutor</option>
                  <option value="admin">Admin</option>
                </Select>
              </Field>
              <Field label="Group">
                <Select name="cohortId" defaultValue={p?.cohortId ?? ""}>
                  <option value="">No group</option>
                  {cohorts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </Field>
              {isStudent && (
                <Field label="Eligibility" hint="Override the automatic status if needed.">
                  <Select name="eligibilityOverride" defaultValue={p?.eligibilityOverride ?? ""}>
                    <option value="">Automatic</option>
                    <option value="eligible">Force eligible</option>
                    <option value="on_hold">Force on hold</option>
                  </Select>
                </Field>
              )}
              <SubmitButton block>Save</SubmitButton>
            </AdminForm>
          </Card>

          {isStudent && (
            <Card>
              <Eyebrow className="mb-3">Points</Eyebrow>
              <div className="flex gap-6">
                <div>
                  <p className="font-display text-3xl font-bold">{monthPts}</p>
                  <p className="text-xs text-muted">this month</p>
                </div>
                <div>
                  <p className="font-display text-3xl font-bold">{totalPts}</p>
                  <p className="text-xs text-muted">lifetime</p>
                </div>
              </div>
              <ul className="mt-4 space-y-1.5 text-sm">
                {points.map((e) => (
                  <li key={e.id} className="flex justify-between gap-2">
                    <span className="truncate text-muted">{e.reason}</span>
                    <span className={e.points > 0 ? "font-semibold text-brand" : "font-semibold text-danger"}>
                      {e.points > 0 ? "+" : ""}
                      {e.points}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="mt-4 flex gap-2">
                <Sheet title="Adjust points" trigger={<Button size="sm" variant="secondary" className="flex-1">Adjust points</Button>}>
                  <AdminForm action={adjustPointsAction} className="space-y-4">
                    <input type="hidden" name="userId" value={u.id} />
                    <Field label="Points (use negative to remove)">
                      <Input name="points" type="number" required placeholder="25" />
                    </Field>
                    <Field label="Reason (student sees this)">
                      <Input name="reason" required placeholder="Helped set up the community event" />
                    </Field>
                    <SubmitButton block>Save</SubmitButton>
                  </AdminForm>
                </Sheet>
                <Sheet title="Award a badge" trigger={<Button size="sm" variant="gold" className="flex-1">Award badge</Button>}>
                  <AdminForm action={awardBadgeAction} className="space-y-4">
                    <input type="hidden" name="userId" value={u.id} />
                    <Field label="Badge">
                      <Select name="badgeId" required defaultValue="">
                        <option value="" disabled>
                          Pick a badge
                        </option>
                        {allBadges.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.emoji} {b.name} (+{b.points})
                          </option>
                        ))}
                      </Select>
                    </Field>
                    <Field label="Note to student">
                      <Input name="note" placeholder="So proud of you!" />
                    </Field>
                    <SubmitButton block variant="gold">
                      Award ⭐
                    </SubmitButton>
                  </AdminForm>
                </Sheet>
              </div>
            </Card>
          )}

          {badges.length > 0 && (
            <Card>
              <Eyebrow className="mb-3">Badges</Eyebrow>
              <div className="flex flex-wrap gap-2">
                {badges.map(({ ub, b }) => (
                  <Pill key={ub.id} tone="gold">
                    {b.emoji} {b.name} · {prettyDate(ub.awardedAt, "M/d/yy")}
                  </Pill>
                ))}
              </div>
            </Card>
          )}

          {u.id !== me.id && (
            <Sheet
              title="Delete account permanently?"
              description="This removes the account and all their submissions. This can't be undone — consider pausing instead."
              trigger={
                <Button variant="danger-ghost" size="sm" block>
                  <Trash2 /> Delete account
                </Button>
              }
            >
              <AdminForm action={removeUserAction} className="space-y-4">
                <input type="hidden" name="userId" value={u.id} />
                <Field label="Type DELETE to confirm">
                  <Input name="confirm" required autoComplete="off" />
                </Field>
                <SubmitButton block variant="danger">
                  Delete {u.name}
                </SubmitButton>
              </AdminForm>
            </Sheet>
          )}
        </div>
      </div>
    </div>
  );
}
