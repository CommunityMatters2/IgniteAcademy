import type { Metadata } from "next";
import { desc } from "drizzle-orm";
import { Mail, Pin, PinOff, Trash2 } from "lucide-react";
import { AdminForm } from "@/components/admin/admin-forms";
import { Button } from "@/components/ui/button";
import { Field, Input, SubmitButton, Switch, Textarea } from "@/components/ui/form";
import { Card, EmptyState, PageHeader, SectionTitle } from "@/components/ui/primitives";
import { db } from "@/db";
import { announcement } from "@/db/schema";
import { announcementToggleAction, createAnnouncementAction } from "@/actions/admin";
import { prettyDate } from "@/lib/dates";
import { requireAdmin } from "@/lib/session";

export const metadata: Metadata = { title: "Announcements" };

export default async function AnnouncementsAdmin() {
  await requireAdmin();
  const items = await db.select().from(announcement).orderBy(desc(announcement.pinned), desc(announcement.createdAt)).limit(50);
  return (
    <div className="animate-rise">
      <PageHeader title="Announcements" subtitle="Shows on every student's Home screen. Optionally email everyone too." />
      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <AdminForm action={createAnnouncementAction} className="space-y-4" resetOnSuccess>
            <Field label="Title">
              <Input name="title" required placeholder="Field trip Saturday!" />
            </Field>
            <Field label="Message">
              <Textarea name="body" required rows={5} placeholder="Meet at the center at 9am…" />
            </Field>
            <Switch name="pinned" label="Pin to top" />
            <Switch name="email" label="Also email all students" description="Sent through Resend." />
            <SubmitButton block>Post</SubmitButton>
          </AdminForm>
        </Card>
        <div className="lg:col-span-3">
          <SectionTitle className="mt-0">Posted</SectionTitle>
          {items.length ? (
            <div className="space-y-3">
              {items.map((a) => (
                <Card key={a.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 font-semibold">
                        {a.pinned && <Pin className="size-4 text-gold" />}
                        {a.title}
                      </p>
                      <p className="mt-1 text-sm whitespace-pre-line text-muted">{a.body}</p>
                      <p className="mt-2 flex items-center gap-2 text-xs text-muted">
                        {prettyDate(a.createdAt, "MMM d, h:mm a")}
                        {a.emailed && (
                          <span className="flex items-center gap-1">
                            <Mail className="size-3" /> emailed
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <form action={announcementToggleAction}>
                        <input type="hidden" name="id" value={a.id} />
                        <input type="hidden" name="op" value={a.pinned ? "unpin" : "pin"} />
                        <Button size="icon-sm" variant="ghost" aria-label={a.pinned ? "Unpin" : "Pin"}>
                          {a.pinned ? <PinOff /> : <Pin />}
                        </Button>
                      </form>
                      <form action={announcementToggleAction}>
                        <input type="hidden" name="id" value={a.id} />
                        <input type="hidden" name="op" value="delete" />
                        <Button size="icon-sm" variant="danger-ghost" aria-label="Delete">
                          <Trash2 />
                        </Button>
                      </form>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <EmptyState icon="📣" title="No announcements yet" />
          )}
        </div>
      </div>
    </div>
  );
}
