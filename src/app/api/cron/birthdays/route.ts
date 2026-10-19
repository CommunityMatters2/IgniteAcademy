import { and, eq, like } from "drizzle-orm";
import { db } from "@/db";
import { pointEvent } from "@/db/schema";
import { awardPoints, notify } from "@/lib/activity";
import { isAuthorizedCron } from "@/lib/cron";
import { sendEmail } from "@/lib/email";
import { appUrl } from "@/lib/env";
import { zonedToday } from "@/lib/dates";
import { getSettings } from "@/lib/settings";
import { getUpcomingBirthdays } from "@/lib/student-data";
import { firstName } from "@/lib/utils";
import { user } from "@/db/schema";

/** Daily: birthday email + bonus points + notification for everyone whose birthday is today. */
export async function GET(req: Request) {
  if (!isAuthorizedCron(req)) return new Response("Unauthorized", { status: 401 });
  const today = zonedToday();
  const [people, settings] = await Promise.all([getUpcomingBirthdays(0), getSettings()]);
  let celebrated = 0;
  for (const p of people) {
    // Idempotent: skip if we already celebrated this year.
    const reason = `Birthday ${today.y} 🎂`;
    const already = await db.query.pointEvent.findFirst({
      where: and(eq(pointEvent.userId, p.userId), eq(pointEvent.source, "birthday"), like(pointEvent.reason, `Birthday ${today.y}%`)),
    });
    if (already) continue;
    await awardPoints(p.userId, settings.points.birthday, reason, "birthday");
    await notify(p.userId, "🎂 Happy birthday from IGNITE!", "The whole fam is celebrating you today.", "/birthdays");
    const u = await db.query.user.findFirst({ where: eq(user.id, p.userId) });
    if (u)
      await sendEmail({
        to: u.email,
        subject: `🎉 Happy birthday, ${firstName(p.name, p.preferredName)}!`,
        preview: "The whole IGNITE fam is celebrating you today.",
        heading: `Happy birthday, ${firstName(p.name, p.preferredName)}! 🎂`,
        paragraphs: [
          "Today is all about you. Everyone at IGNITE Academy and Community Matters 2 is celebrating you.",
          `We dropped ${settings.points.birthday} bonus stars on your account. Open the app — your friends might have left you some birthday wishes. 💛`,
        ],
        cta: { label: "Open IGNITE", href: `${appUrl()}/birthdays` },
        accent: "gold",
      });
    celebrated++;
  }
  return Response.json({ ok: true, date: today.iso, celebrated });
}
