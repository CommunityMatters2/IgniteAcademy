import { and, asc, eq, gte, lte } from "drizzle-orm";
import { db } from "@/db";
import { clockSession, user } from "@/db/schema";
import { visitMinutes } from "@/lib/clock";
import { toZonedInput } from "@/lib/dates";
import { getSession } from "@/lib/session";

function csvCell(v: unknown) {
  const s = v == null ? "" : String(v);
  // Neutralize spreadsheet formula injection and quote everything.
  const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
  return `"${safe.replace(/"/g, '""')}"`;
}

const isIsoDay = (v: string | null): v is string => !!v && /^\d{4}-\d{2}-\d{2}$/.test(v);
const fmt = (d: Date | null) => (d ? toZonedInput(d).replace("T", " ") : "");

export async function GET(req: Request) {
  const s = await getSession();
  if (!s || s.user.role !== "admin") return new Response("Forbidden", { status: 403 });
  const url = new URL(req.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  if (!isIsoDay(from) || !isIsoDay(to) || to < from) return new Response("Pick a valid date range.", { status: 400 });

  const rows = await db
    .select({ v: clockSession, name: user.name, email: user.email })
    .from(clockSession)
    .innerJoin(user, eq(user.id, clockSession.userId))
    .where(and(gte(clockSession.day, from), lte(clockSession.day, to)))
    .orderBy(asc(user.name), asc(clockSession.clockInAt));

  const lines = [["Student", "Email", "Date", "Clock in", "Clock out", "Hours", "Points", "Edited by staff", "Staff note"].map(csvCell).join(",")];
  const totals = new Map<string, { name: string; email: string; minutes: number; visits: number }>();
  for (const { v, name, email } of rows) {
    const minutes = v.clockOutAt ? visitMinutes(v) : 0;
    lines.push(
      [
        name,
        email,
        v.day,
        fmt(v.clockInAt),
        v.clockOutAt ? fmt(v.clockOutAt) : "NOT CLOCKED OUT",
        v.clockOutAt ? (minutes / 60).toFixed(2) : "",
        v.pointsAwarded || "",
        v.editedBy ? "Yes" : "",
        v.staffNote,
      ]
        .map(csvCell)
        .join(","),
    );
    const t = totals.get(v.userId) ?? { name, email, minutes: 0, visits: 0 };
    t.minutes += minutes;
    t.visits += 1;
    totals.set(v.userId, t);
  }
  lines.push("", ["Totals", "Email", "Visits", "", "", "Hours"].map(csvCell).join(","));
  for (const t of totals.values()) {
    lines.push([t.name, t.email, t.visits, "", "", (t.minutes / 60).toFixed(2)].map(csvCell).join(","));
  }

  return new Response(`﻿${lines.join("\r\n")}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="ignite-hours-${from}-to-${to}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
