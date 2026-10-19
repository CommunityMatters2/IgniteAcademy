import type { Metadata } from "next";
import { desc, eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { Card, PageHeader } from "@/components/ui/primitives";
import { db } from "@/db";
import { auditLog, user } from "@/db/schema";
import { prettyDate } from "@/lib/dates";
import { requireAdmin } from "@/lib/session";

export const metadata: Metadata = { title: "Audit log" };

export default async function AuditPage() {
  await requireAdmin();
  const target = alias(user, "target_user");
  const rows = await db
    .select({ a: auditLog, actor: user.name, targetName: target.name })
    .from(auditLog)
    .leftJoin(user, eq(user.id, auditLog.actorId))
    .leftJoin(target, eq(target.id, auditLog.targetId))
    .orderBy(desc(auditLog.createdAt))
    .limit(200);

  return (
    <div className="animate-rise">
      <PageHeader title="Audit log" subtitle="Every admin action, newest first. Kept because IGNITE handles minors' records." />
      <Card className="overflow-x-auto p-0">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border text-xs text-muted uppercase">
            <tr>
              <th className="px-5 py-3 font-semibold">When</th>
              <th className="px-5 py-3 font-semibold">Who</th>
              <th className="px-5 py-3 font-semibold">Action</th>
              <th className="px-5 py-3 font-semibold">Target</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map(({ a, actor, targetName }) => (
              <tr key={a.id}>
                <td className="px-5 py-3 whitespace-nowrap text-muted">{prettyDate(a.createdAt, "MMM d, h:mm a")}</td>
                <td className="px-5 py-3 whitespace-nowrap">{actor ?? "System"}</td>
                <td className="px-5 py-3 font-mono text-xs">{a.action}</td>
                <td className="px-5 py-3 text-muted">{targetName ?? a.targetType ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && <p className="px-5 py-6 text-sm text-muted">Nothing logged yet.</p>}
      </Card>
    </div>
  );
}
