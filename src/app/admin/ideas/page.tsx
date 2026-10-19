import type { Metadata } from "next";
import { count, desc, eq } from "drizzle-orm";
import { Trash2 } from "lucide-react";
import { AdminForm } from "@/components/admin/admin-forms";
import { Button } from "@/components/ui/button";
import { Input, Select, SubmitButton } from "@/components/ui/form";
import { Card, EmptyState, PageHeader, Pill } from "@/components/ui/primitives";
import { db } from "@/db";
import { idea, ideaVote, user } from "@/db/schema";
import { deleteIdeaAction, updateIdeaAction } from "@/actions/admin";
import { prettyDate } from "@/lib/dates";
import { requireAdmin } from "@/lib/session";

export const metadata: Metadata = { title: "Ideas" };

export default async function IdeasAdmin() {
  await requireAdmin();
  const [ideas, votes] = await Promise.all([
    db
      .select({ i: idea, name: user.name })
      .from(idea)
      .innerJoin(user, eq(user.id, idea.userId))
      .orderBy(desc(idea.createdAt)),
    db.select({ id: ideaVote.ideaId, n: count() }).from(ideaVote).groupBy(ideaVote.ideaId),
  ]);
  const voteMap = new Map(votes.map((v) => [v.id, v.n]));
  const sorted = ideas.sort((a, b) => {
    const order = { new: 0, reviewing: 1, planned: 2, done: 3, declined: 4 };
    return order[a.i.status] - order[b.i.status] || (voteMap.get(b.i.id) ?? 0) - (voteMap.get(a.i.id) ?? 0);
  });

  return (
    <div className="animate-rise">
      <PageHeader title="Ideas" subtitle="Student input on the program. Marking an idea “Done” awards the author points." />
      {sorted.length ? (
        <div className="grid gap-3 md:grid-cols-2">
          {sorted.map(({ i, name }) => (
            <Card key={i.id} className="space-y-3 p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex flex-wrap gap-1.5">
                    <Pill>{i.category}</Pill>
                    <Pill tone="green">▲ {voteMap.get(i.id) ?? 0}</Pill>
                    {i.anonymous && <Pill tone="gold">Anonymous to peers</Pill>}
                  </div>
                  <p className="mt-2 font-semibold">{i.title}</p>
                </div>
                <form action={deleteIdeaAction}>
                  <input type="hidden" name="id" value={i.id} />
                  <Button size="icon-sm" variant="danger-ghost" aria-label="Delete idea">
                    <Trash2 />
                  </Button>
                </form>
              </div>
              <p className="text-sm whitespace-pre-line text-muted">{i.body}</p>
              <p className="text-xs text-muted">
                {name} · {prettyDate(i.createdAt, "MMM d")}
              </p>
              <AdminForm action={updateIdeaAction} className="flex flex-col gap-2 sm:flex-row">
                <input type="hidden" name="id" value={i.id} />
                <Select name="status" defaultValue={i.status} className="h-10 text-sm sm:w-36">
                  <option value="new">New</option>
                  <option value="reviewing">Reviewing</option>
                  <option value="planned">Planned</option>
                  <option value="done">Done</option>
                  <option value="declined">Not now</option>
                </Select>
                <Input name="adminNote" defaultValue={i.adminNote ?? ""} placeholder="Reply to students (public)" className="h-10 text-sm" />
                <SubmitButton size="sm" className="h-10">
                  Save
                </SubmitButton>
              </AdminForm>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState icon="💡" title="No ideas yet" />
      )}
    </div>
  );
}
