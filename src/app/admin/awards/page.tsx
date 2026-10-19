import type { Metadata } from "next";
import { asc, count } from "drizzle-orm";
import { Pencil, Plus } from "lucide-react";
import { AdminForm } from "@/components/admin/admin-forms";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, SubmitButton, Switch, Textarea } from "@/components/ui/form";
import { Card, PageHeader, Pill } from "@/components/ui/primitives";
import { Sheet } from "@/components/ui/sheet";
import { db } from "@/db";
import { badge, userBadge } from "@/db/schema";
import { awardBadgeAction, saveBadgeAction } from "@/actions/admin";
import { getStudents } from "@/lib/admin-data";
import { requireAdmin } from "@/lib/session";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Awards" };

type Badge = typeof badge.$inferSelect;

function BadgeForm({ b }: { b?: Badge }) {
  return (
    <AdminForm action={saveBadgeAction} className="space-y-4">
      {b && <input type="hidden" name="id" value={b.id} />}
      <div className="grid grid-cols-[80px_1fr] gap-3">
        <Field label="Emoji">
          <Input name="emoji" defaultValue={b?.emoji ?? "⭐"} maxLength={4} className="text-center text-2xl" />
        </Field>
        <Field label="Name">
          <Input name="name" required defaultValue={b?.name} placeholder="Lifeguard Certified" />
        </Field>
      </div>
      <Field label="Description">
        <Textarea name="description" required rows={2} defaultValue={b?.description} placeholder="Earned your lifeguard certification." />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Points">
          <Input name="points" type="number" min={0} max={500} defaultValue={b?.points ?? 20} />
        </Field>
        <Field label="Color">
          <Select name="color" defaultValue={b?.color ?? "gold"}>
            <option value="gold">Gold</option>
            <option value="green">Green</option>
            <option value="blue">Blue</option>
            <option value="purple">Purple</option>
          </Select>
        </Field>
      </div>
      <Switch name="claimable" defaultChecked={b?.claimable ?? true} label="Students can claim it" description="They submit proof; you approve." />
      <Switch name="active" defaultChecked={b?.active ?? true} label="Active" description="Inactive badges are hidden from students." />
      <SubmitButton block>Save badge</SubmitButton>
    </AdminForm>
  );
}

export default async function AwardsAdmin() {
  await requireAdmin();
  const [badges, earned, students] = await Promise.all([
    db.select().from(badge).orderBy(asc(badge.createdAt)),
    db.select({ id: userBadge.badgeId, n: count() }).from(userBadge).groupBy(userBadge.badgeId),
    getStudents(),
  ]);
  const earnedMap = new Map(earned.map((e) => [e.id, e.n]));
  const active = students.filter((s) => s.role === "student" && !s.banned);

  return (
    <div className="animate-rise">
      <PageHeader
        title="Awards"
        subtitle="Badges recognize real milestones — failing to passing, driver's test, lifeguard cert and more."
        action={
          <div className="flex gap-2">
            <Sheet title="Award a badge" trigger={<Button size="sm" variant="gold">Award</Button>}>
              <AdminForm action={awardBadgeAction} className="space-y-4">
                <Field label="Student">
                  <Select name="userId" required defaultValue="">
                    <option value="" disabled>
                      Pick a student
                    </option>
                    {active.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Badge">
                  <Select name="badgeId" required defaultValue="">
                    <option value="" disabled>
                      Pick a badge
                    </option>
                    {badges
                      .filter((b) => b.active)
                      .map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.emoji} {b.name}
                        </option>
                      ))}
                  </Select>
                </Field>
                <Field label="Note to student">
                  <Input name="note" placeholder="We see you! 🔥" />
                </Field>
                <SubmitButton block variant="gold">
                  Award ⭐
                </SubmitButton>
              </AdminForm>
            </Sheet>
            <Sheet title="New badge" trigger={<Button size="sm"><Plus /> Badge</Button>}>
              <BadgeForm />
            </Sheet>
          </div>
        }
      />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {badges.map((b) => (
          <Card key={b.id} className={cn("flex items-start gap-3 p-4", !b.active && "opacity-50")}>
            <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gold-soft text-2xl">{b.emoji}</span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{b.name}</p>
              <p className="text-xs text-muted">{b.description}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <Pill tone="gold">+{b.points}</Pill>
                <Pill>{earnedMap.get(b.id) ?? 0} earned</Pill>
                {b.claimable && <Pill tone="blue">Claimable</Pill>}
                {!b.active && <Pill tone="red">Inactive</Pill>}
              </div>
            </div>
            <Sheet title={`Edit ${b.name}`} trigger={<Button size="icon-sm" variant="ghost" aria-label="Edit"><Pencil /></Button>}>
              <BadgeForm b={b} />
            </Sheet>
          </Card>
        ))}
      </div>
    </div>
  );
}
