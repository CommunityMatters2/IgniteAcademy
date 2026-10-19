import { eq } from "drizzle-orm";
import { db } from "@/db";
import { form, formResponse, user } from "@/db/schema";
import { getSession } from "@/lib/session";

function csvCell(v: unknown) {
  const s = v == null ? "" : String(v);
  // Neutralize spreadsheet formula injection and quote everything.
  const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
  return `"${safe.replace(/"/g, '""')}"`;
}

export async function GET(_req: Request, ctx: RouteContext<"/admin/forms/[id]/export">) {
  const s = await getSession();
  if (!s || s.user.role !== "admin") return new Response("Forbidden", { status: 403 });
  const { id } = await ctx.params;
  const f = await db.query.form.findFirst({ where: eq(form.id, id) });
  if (!f) return new Response("Not found", { status: 404 });
  const rows = await db
    .select({ r: formResponse, name: user.name, email: user.email })
    .from(formResponse)
    .innerJoin(user, eq(user.id, formResponse.userId))
    .where(eq(formResponse.formId, id));

  const header = ["Student", "Email", "Submitted", ...f.fields.map((x) => x.label), ...(f.requireSignature ? ["Signed name"] : [])];
  const lines = [header.map(csvCell).join(",")];
  for (const { r, name, email } of rows) {
    lines.push(
      [
        name,
        email,
        r.submittedAt.toISOString(),
        ...f.fields.map((x) => {
          const v = r.answers[x.id];
          return typeof v === "boolean" ? (v ? "Yes" : "No") : v;
        }),
        ...(f.requireSignature ? [r.signatureName] : []),
      ]
        .map(csvCell)
        .join(","),
    );
  }
  const filename = f.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "form";
  return new Response(`﻿${lines.join("\r\n")}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
