import Link from "next/link";
import type { Metadata } from "next";
import { desc, eq } from "drizzle-orm";
import { BellRing } from "lucide-react";
import { markAllReadAction } from "@/actions/student";
import { Button } from "@/components/ui/button";
import { EmptyState, PageHeader } from "@/components/ui/primitives";
import { db } from "@/db";
import { notification } from "@/db/schema";
import { prettyDate } from "@/lib/dates";
import { requireStudent } from "@/lib/session";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Notifications" };

export default async function NotificationsPage() {
  const { user } = await requireStudent();
  const items = await db
    .select()
    .from(notification)
    .where(eq(notification.userId, user.id))
    .orderBy(desc(notification.createdAt))
    .limit(50);
  const unread = items.some((n) => !n.readAt);

  return (
    <div className="animate-rise">
      <PageHeader
        title="Notifications"
        action={
          unread && (
            <form action={markAllReadAction}>
              <Button size="sm" variant="secondary">
                Mark all read
              </Button>
            </form>
          )
        }
      />
      {items.length ? (
        <ul className="space-y-2">
          {items.map((n) => {
            const body = (
              <div
                className={cn(
                  "flex gap-3 rounded-2xl border p-4",
                  n.readAt ? "border-border bg-surface" : "border-brand/40 bg-brand-soft",
                )}
              >
                <BellRing className={cn("mt-0.5 size-5 shrink-0", n.readAt ? "text-muted" : "text-brand")} />
                <div className="min-w-0">
                  <p className="font-semibold">{n.title}</p>
                  {n.body && <p className="mt-0.5 text-sm text-muted">{n.body}</p>}
                  <p className="mt-1 text-xs text-muted">{prettyDate(n.createdAt, "MMM d, h:mm a")}</p>
                </div>
              </div>
            );
            return <li key={n.id}>{n.href ? <Link href={n.href}>{body}</Link> : body}</li>;
          })}
        </ul>
      ) : (
        <EmptyState icon="🔔" title="You're all caught up" body="Approvals, badges and shout-outs will show up here." />
      )}
    </div>
  );
}
