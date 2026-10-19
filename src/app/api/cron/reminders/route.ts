import { and, asc, eq, gte, isNull, lt } from "drizzle-orm";
import { db } from "@/db";
import { sessionSignup, tutorSession, user } from "@/db/schema";
import { isAuthorizedCron } from "@/lib/cron";
import { trySendEmail } from "@/lib/email";
import { appUrl } from "@/lib/env";
import { zonedDateTime } from "@/lib/dates";

/** Daily morning digest: remind students about tutoring sessions they signed up for in the next 24h. */
export async function GET(req: Request) {
  if (!isAuthorizedCron(req)) return new Response("Unauthorized", { status: 401 });
  const now = new Date();
  const until = new Date(now.getTime() + 24 * 3_600_000);
  const sessions = await db
    .select()
    .from(tutorSession)
    .where(and(gte(tutorSession.startsAt, now), lt(tutorSession.startsAt, until), isNull(tutorSession.reminderSentAt)))
    .orderBy(asc(tutorSession.startsAt));

  let emails = 0;
  for (const s of sessions) {
    const attendees = await db
      .select({ email: user.email, name: user.name })
      .from(sessionSignup)
      .innerJoin(user, eq(user.id, sessionSignup.userId))
      .where(eq(sessionSignup.sessionId, s.id));
    for (const a of attendees) {
      await trySendEmail({
        to: a.email,
        subject: `Reminder: ${s.title} — ${zonedDateTime(s.startsAt, { weekday: undefined })}`,
        preview: `${s.subject} tutoring with ${s.tutorName ?? s.provider}`,
        heading: `See you soon, ${a.name.split(" ")[0]}! 📚`,
        paragraphs: [
          `${s.title} (${s.subject}) starts ${zonedDateTime(s.startsAt)}.`,
          "Have your questions and homework ready. The Zoom link is in the Help Center.",
        ],
        cta: { label: s.meetingUrl ? "Join on Zoom" : "Open Help Center", href: s.meetingUrl ?? `${appUrl()}/help` },
      });
      emails++;
    }
    await db.update(tutorSession).set({ reminderSentAt: new Date() }).where(eq(tutorSession.id, s.id));
  }
  return Response.json({ ok: true, sessions: sessions.length, emails });
}
