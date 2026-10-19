/**
 * Demo accounts + sample activity so every screen has something to show.
 * Runs from scripts/seed.ts when SEED_DEMO_PASSWORD is set. Skips if already seeded.
 * All demo emails use example.com (reserved — mail never reaches a real person).
 */
import zlib from "node:zlib";
import { eq } from "drizzle-orm";
import { db } from "../src/db";
import {
  announcement,
  attendanceCheckin,
  badge,
  badgeClaim,
  form,
  idea,
  ideaVote,
  profile,
  reportCard,
  sessionSignup,
  term,
  tutorSession,
  user,
  userBadge,
} from "../src/db/schema";
import { auth } from "../src/lib/auth";
import { awardPoints } from "../src/lib/activity";
import { addDaysIso, weekOf, zonedToday } from "../src/lib/dates";
import { saveFile } from "../src/lib/storage";

/** Small solid-color PNG used as a stand-in for uploaded documents. */
function png(w: number, h: number, rgb: [number, number, number]) {
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) raw.set(rgb, y * (w * 3 + 1) + 1 + x * 3);
  const crcTable = Array.from({ length: 256 }, (_, n) => {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  });
  const chunk = (type: string, data: Buffer) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type), data]);
    let c = 0xffffffff;
    for (const b of td) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE((c ^ 0xffffffff) >>> 0);
    return Buffer.concat([len, td, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

async function demoFile(userId: string, folder: string, name: string, rgb: [number, number, number]) {
  const file = new File([png(240, 320, rgb)], name, { type: "image/png" });
  return saveFile(file, `u/${userId}/${folder}`);
}

async function createAccount(email: string, name: string, password: string, role: "student" | "tutor") {
  const created = await auth.api.createUser({ body: { email, password, name } });
  await db.update(user).set({ role, emailVerified: true }).where(eq(user.id, created.user.id));
  return created.user.id;
}

export async function seedDemo(password: string) {
  if (password.length < 8) throw new Error("SEED_DEMO_PASSWORD must be at least 8 characters.");
  const already = await db.query.user.findFirst({ where: eq(user.email, "jordan.rivera@example.com") });
  if (already) {
    console.log("✓ Demo accounts already exist — skipping demo seed");
    return;
  }

  const today = zonedToday();
  const thisWeek = weekOf(today.iso);
  const current = await db.query.term.findFirst({ where: eq(term.isCurrent, true) });
  const badges = await db.select().from(badge);
  const badgeBy = (slug: string) => badges.find((b) => b.slug === slug)!;
  const monthDay = today.iso.slice(5);
  const bdayIn = (days: number, years: number) => {
    const d = addDaysIso(today.iso, days);
    return `${today.y - years}${d.slice(4)}`;
  };

  /* ── Accounts ── */
  const tutorId = await createAccount("tutor@example.com", "Dana Brooks", password, "tutor");
  await db.insert(profile).values({ userId: tutorId, onboardedAt: new Date() });

  const students = [
    { key: "jordan", email: "jordan.rivera@example.com", name: "Jordan Rivera", preferred: "Jo", grade: "10th", bday: `${today.y - 15}-${monthDay}` },
    { key: "maya", email: "maya.johnson@example.com", name: "Maya Johnson", preferred: null, grade: "11th", bday: bdayIn(3, 16) },
    { key: "chris", email: "chris.walker@example.com", name: "Chris Walker", preferred: null, grade: "9th", bday: bdayIn(20, 14) },
    { key: "avery", email: "avery.lee@example.com", name: "Avery Lee", preferred: null, grade: "12th", bday: bdayIn(40, 17) },
  ] as const;
  const ids: Record<string, string> = {};
  for (const s of students) {
    const id = await createAccount(s.email, s.name, password, "student");
    ids[s.key] = id;
    await db.insert(profile).values({
      userId: id,
      preferredName: s.preferred,
      birthday: s.bday,
      school: "Central High School",
      gradeLevel: s.grade,
      guardianName: `Parent of ${s.name.split(" ")[0]}`,
      guardianPhone: "555-0100",
      counselorName: "Ms. Patel",
      counselorEmail: "counselor@example.com",
      tshirtSize: "M",
      onboardedAt: new Date(),
    });
  }

  /* ── Jordan: fully eligible, badges, points, birthday today ── */
  const jCard = await demoFile(ids.jordan, "report-cards", "report-card.png", [2, 190, 98]);
  await db.insert(reportCard).values({
    userId: ids.jordan,
    termId: current?.id,
    fileKey: jCard.key,
    fileName: "report-card.png",
    contentType: jCard.contentType,
    gpa: "3.4",
    allPassing: true,
    status: "approved",
    reviewNote: "Huge improvement in Algebra — proud of you!",
    reviewedAt: new Date(),
  });
  for (let i = 0; i < 3; i++) {
    const proof = await demoFile(ids.jordan, "attendance", `week-${i}.png`, [110, 168, 255]);
    await db.insert(attendanceCheckin).values({
      userId: ids.jordan,
      weekOf: addDaysIso(thisWeek, -7 * i),
      proofKey: proof.key,
      contentType: proof.contentType,
      daysPresent: 5,
      daysLate: 0,
      status: "approved",
      reviewedAt: new Date(),
    });
  }
  for (const slug of ["failing-to-passing", "drivers-license"]) {
    await db.insert(userBadge).values({ userId: ids.jordan, badgeId: badgeBy(slug).id, note: "Demo badge" });
  }
  await awardPoints(ids.jordan, 50, "Report card approved + passing every class", "report_card");
  await awardPoints(ids.jordan, 45, "3 on-time weeks", "checkin");
  await awardPoints(ids.jordan, 90, "Badges: Comeback Kid, Licensed Driver", "badge");

  /* ── Maya: items waiting in the admin review queue ── */
  const mCard = await demoFile(ids.maya, "report-cards", "report-card.png", [253, 221, 90]);
  await db.insert(reportCard).values({
    userId: ids.maya,
    termId: current?.id,
    fileKey: mCard.key,
    fileName: "report-card.png",
    contentType: mCard.contentType,
    gpa: "3.0",
    allPassing: true,
    note: "Got my first B in Chemistry!",
  });
  const mProof = await demoFile(ids.maya, "attendance", "week.png", [110, 168, 255]);
  await db.insert(attendanceCheckin).values({
    userId: ids.maya,
    weekOf: thisWeek,
    proofKey: mProof.key,
    contentType: mProof.contentType,
    daysPresent: 5,
    daysLate: 1,
    note: "Bus was late on Tuesday",
  });
  const mClaim = await demoFile(ids.maya, "claims", "lifeguard-cert.png", [192, 132, 252]);
  await db.insert(badgeClaim).values({
    userId: ids.maya,
    badgeId: badgeBy("lifeguard").id,
    proofKey: mClaim.key,
    contentType: mClaim.contentType,
    note: "Passed my lifeguard certification Saturday!",
  });
  await awardPoints(ids.maya, 30, "Tutoring sessions attended", "tutoring");

  /* ── Chris: on hold (approved card, not all passing) ── */
  const cCard = await demoFile(ids.chris, "report-cards", "report-card.png", [255, 90, 95]);
  await db.insert(reportCard).values({
    userId: ids.chris,
    termId: current?.id,
    fileKey: cCard.key,
    fileName: "report-card.png",
    contentType: cCard.contentType,
    gpa: "1.9",
    allPassing: false,
    status: "approved",
    reviewNote: "Let's get you into Thursday math tutoring.",
    reviewedAt: new Date(),
  });
  await awardPoints(ids.chris, 25, "Report card approved", "report_card");

  /* Avery: brand new — nothing submitted (needs action). */

  /* ── Tutoring sessions (next week, 4 PM Eastern ≈ 20:00 UTC) ── */
  const at = (days: number) => new Date(`${addDaysIso(today.iso, days)}T20:00:00Z`);
  const sessions = await db
    .insert(tutorSession)
    .values([
      { title: "Algebra drop-in", subject: "Math", tutorName: "Dana Brooks", startsAt: at(1), durationMin: 60, meetingUrl: "https://zoom.us/j/0000000000", capacity: 12, description: "Bring homework questions!" },
      { title: "Essay workshop", subject: "English", tutorName: "Dana Brooks", startsAt: at(2), durationMin: 45, meetingUrl: "https://zoom.us/j/0000000000", capacity: 8 },
      { title: "SAT math prep", subject: "Test prep", tutorName: "ORBIT tutor", startsAt: at(4), durationMin: 90, meetingUrl: "https://zoom.us/j/0000000000" },
    ])
    .returning({ id: tutorSession.id });
  await db.insert(sessionSignup).values([
    { sessionId: sessions[0].id, userId: ids.jordan },
    { sessionId: sessions[0].id, userId: ids.chris },
  ]);

  /* ── Program content ── */
  await db.insert(announcement).values({
    title: "Welcome to the new IGNITE app 🔥",
    body: "Upload your report card, check in every week, and start earning points toward Scholar of the Month!",
    pinned: true,
  });
  const [i1] = await db
    .insert(idea)
    .values([
      { userId: ids.jordan, title: "Monthly college campus visits", body: "Visit a different college every month so we can see what campus life is like.", category: "Trips", status: "planned", adminNote: "Love this — first visit is next month!" },
      { userId: ids.maya, title: "Friday study hall with snacks", body: "A quiet space after school on Fridays to finish homework together.", category: "Program" },
    ])
    .returning({ id: idea.id });
  await db.insert(ideaVote).values([
    { ideaId: i1.id, userId: ids.maya },
    { ideaId: i1.id, userId: ids.chris },
  ]);
  await db.insert(form).values({
    title: "Program feedback survey",
    description: "Tell us how IGNITE is going!",
    status: "published",
    dueDate: addDaysIso(today.iso, 14),
    fields: [
      { id: "s1", type: "choice", label: "How would you rate IGNITE so far?", required: true, options: ["🔥 Love it", "👍 Good", "😐 Okay", "👎 Not great"] },
      { id: "s2", type: "textarea", label: "What's your favorite part?", required: false },
    ],
  });

  console.log("✓ Demo accounts and sample activity created (password: SEED_DEMO_PASSWORD)");
}
