/**
 * Creates the first admin account and starter data (badges, a grading period).
 *
 *   ADMIN_EMAIL=director@cm2.org ADMIN_NAME="Program Director" ADMIN_PASSWORD="…" npm run db:seed
 *
 * Safe to run more than once.
 */
import { config } from "dotenv";

config({ path: ".env.local" });
config();

const BADGES = [
  { slug: "failing-to-passing", emoji: "📈", name: "Comeback Kid", description: "Went from failing to passing a class.", color: "green", points: 50 },
  { slug: "honor-roll", emoji: "🎓", name: "Honor Roll", description: "Made the honor roll this grading period.", color: "gold", points: 50 },
  { slug: "perfect-attendance", emoji: "⏰", name: "Perfect Attendance", description: "A full month at school, on time, every day.", color: "blue", points: 40 },
  { slug: "drivers-license", emoji: "🚗", name: "Licensed Driver", description: "Passed your driver's test.", color: "purple", points: 40 },
  { slug: "lifeguard", emoji: "🛟", name: "Lifeguard Certified", description: "Earned your lifeguard certification.", color: "blue", points: 40 },
  { slug: "first-job", emoji: "💼", name: "First Job", description: "Landed your first job or internship.", color: "green", points: 40 },
  { slug: "tutoring-10", emoji: "📚", name: "Study Squad", description: "Attended 10 tutoring sessions.", color: "blue", points: 30 },
  { slug: "college-app", emoji: "📝", name: "Applied!", description: "Submitted a college, trade school or scholarship application.", color: "gold", points: 40 },
  { slug: "community-service", emoji: "🤝", name: "Community Builder", description: "Completed community service hours.", color: "green", points: 30 },
  { slug: "idea-shipped", emoji: "💡", name: "Big Idea", description: "Your idea became part of IGNITE.", color: "purple", points: 20, claimable: false },
];

async function main() {
  const { db } = await import("../src/db");
  const { badge, term, user, profile } = await import("../src/db/schema");
  const { auth } = await import("../src/lib/auth");
  const { eq } = await import("drizzle-orm");

  for (const b of BADGES) {
    await db
      .insert(badge)
      .values({ claimable: true, ...b })
      .onConflictDoNothing({ target: badge.slug });
  }
  console.log(`✓ ${BADGES.length} starter badges`);

  const anyTerm = await db.query.term.findFirst();
  if (!anyTerm) {
    const y = new Date().getFullYear();
    await db.insert(term).values({ name: `Fall ${y} — Quarter 1`, startsOn: `${y}-09-01`, endsOn: `${y}-11-07`, isCurrent: true });
    console.log("✓ Starter grading period");
  }

  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME ?? "IGNITE Admin";
  if (!email || !password) {
    console.log("ℹ Set ADMIN_EMAIL and ADMIN_PASSWORD to create the first admin.");
    return;
  }
  if (password.length < 8) throw new Error("ADMIN_PASSWORD must be at least 8 characters.");
  const existing = await db.query.user.findFirst({ where: eq(user.email, email) });
  if (existing) {
    await db.update(user).set({ role: "admin" }).where(eq(user.id, existing.id));
    console.log(`✓ ${email} already exists — ensured admin role`);
    return;
  }
  const created = await auth.api.createUser({ body: { email, password, name } });
  await db.update(user).set({ role: "admin", emailVerified: true }).where(eq(user.id, created.user.id));
  await db.insert(profile).values({ userId: created.user.id, onboardedAt: new Date() }).onConflictDoNothing();
  console.log(`✓ Admin created: ${email}`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
