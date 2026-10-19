import type { Metadata } from "next";
import { count, desc, eq } from "drizzle-orm";
import { Plus } from "lucide-react";
import { IdeaForm, VoteButton } from "@/components/app/mini-forms";
import { Button } from "@/components/ui/button";
import { Card, EmptyState, PageHeader, Pill } from "@/components/ui/primitives";
import { Sheet } from "@/components/ui/sheet";
import { db } from "@/db";
import { idea, ideaVote, user } from "@/db/schema";
import { prettyDate } from "@/lib/dates";
import { requireStudent } from "@/lib/session";
import { shortName } from "@/lib/utils";

export const metadata: Metadata = { title: "Ideas" };

const statusMeta = {
  new: { label: "New", tone: "neutral" },
  reviewing: { label: "Reviewing", tone: "gold" },
  planned: { label: "Planned", tone: "blue" },
  done: { label: "Done ✨", tone: "green" },
  declined: { label: "Not now", tone: "red" },
} as const;

export default async function VoicePage({ searchParams }: PageProps<"/voice">) {
  const { user: me } = await requireStudent();
  const [sp, ideas, votes, myVotes] = await Promise.all([
    searchParams,
    db
      .select({ idea, authorName: user.name })
      .from(idea)
      .innerJoin(user, eq(user.id, idea.userId))
      .orderBy(desc(idea.createdAt))
      .limit(100),
    db.select({ ideaId: ideaVote.ideaId, n: count() }).from(ideaVote).groupBy(ideaVote.ideaId),
    db.select({ ideaId: ideaVote.ideaId }).from(ideaVote).where(eq(ideaVote.userId, me.id)),
  ]);
  const voteMap = new Map(votes.map((v) => [v.ideaId, v.n]));
  const mine = new Set(myVotes.map((v) => v.ideaId));
  const sorted = ideas
    .filter((r) => r.idea.status !== "declined" || r.idea.userId === me.id)
    .sort((a, b) => (voteMap.get(b.idea.id) ?? 0) - (voteMap.get(a.idea.id) ?? 0));

  return (
    <div className="animate-rise">
      <PageHeader
        eyebrow="Your voice"
        title="Ideas board"
        subtitle="Suggest what IGNITE should do next. Upvote the ideas you love."
        action={
          <Sheet
            key={String(sp.add)}
            defaultOpen={sp.add === "1"}
            title="Share an idea"
            trigger={
              <Button size="sm">
                <Plus /> Idea
              </Button>
            }
          >
            <IdeaForm />
          </Sheet>
        }
      />
      {sorted.length ? (
        <div className="space-y-3">
          {sorted.map(({ idea: i, authorName }) => {
            const meta = statusMeta[i.status];
            return (
              <Card key={i.id} className="flex gap-3 p-4">
                <VoteButton ideaId={i.id} votes={voteMap.get(i.id) ?? 0} voted={mine.has(i.id)} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Pill tone={meta.tone}>{meta.label}</Pill>
                    <Pill>{i.category}</Pill>
                  </div>
                  <p className="mt-1.5 font-semibold">{i.title}</p>
                  <p className="mt-1 text-sm whitespace-pre-line text-muted">{i.body}</p>
                  {i.adminNote && (
                    <p className="mt-2 rounded-2xl bg-surface-2 px-3 py-2 text-sm">
                      <b>Staff:</b> {i.adminNote}
                    </p>
                  )}
                  <p className="mt-2 text-xs text-muted">
                    {i.userId === me.id ? "You" : i.anonymous ? "Anonymous" : shortName(authorName)} ·{" "}
                    {prettyDate(i.createdAt, "MMM d")}
                  </p>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <EmptyState icon="💡" title="No ideas yet" body="Be the first to suggest something!" />
      )}
    </div>
  );
}
