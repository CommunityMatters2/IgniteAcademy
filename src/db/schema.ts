import { relations, sql } from "drizzle-orm";
import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

const id = () =>
  text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID());
const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

/* ───────────────────────── Better Auth core tables ───────────────────────── */

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  // admin plugin
  role: text("role").default("student"),
  banned: boolean("banned").default(false),
  banReason: text("ban_reason"),
  banExpires: timestamp("ban_expires", { withTimezone: true }),
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    impersonatedBy: text("impersonated_by"),
  },
  (t) => [index("session_user_idx").on(t.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("account_user_idx").on(t.userId)],
);

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ───────────────────────── Program structure ───────────────────────── */

export const cohort = pgTable("cohort", {
  id: id(),
  name: text("name").notNull(),
  createdAt: createdAt(),
});

export const term = pgTable("term", {
  id: id(),
  name: text("name").notNull(),
  startsOn: date("starts_on").notNull(),
  endsOn: date("ends_on").notNull(),
  isCurrent: boolean("is_current").notNull().default(false),
  createdAt: createdAt(),
});

export const profile = pgTable("profile", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  preferredName: text("preferred_name"),
  birthday: date("birthday"),
  phone: text("phone"),
  school: text("school"),
  gradeLevel: text("grade_level"),
  guardianName: text("guardian_name"),
  guardianPhone: text("guardian_phone"),
  guardianEmail: text("guardian_email"),
  counselorName: text("counselor_name"),
  counselorEmail: text("counselor_email"),
  counselorPhone: text("counselor_phone"),
  tshirtSize: text("tshirt_size"),
  avatarKey: text("avatar_key"),
  showOnLeaderboard: boolean("show_on_leaderboard").notNull().default(true),
  cohortId: text("cohort_id").references(() => cohort.id, { onDelete: "set null" }),
  /** Admin override of computed eligibility: "eligible" | "on_hold" | null */
  eligibilityOverride: text("eligibility_override"),
  onboardedAt: timestamp("onboarded_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const invite = pgTable("invite", {
  id: id(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  acceptedAt: timestamp("accepted_at", { withTimezone: true }),
  createdBy: text("created_by"),
  createdAt: createdAt(),
});

/* ───────────────────────── School: grades & attendance ───────────────────────── */

export type ReviewStatus = "pending" | "approved" | "rejected";

export const reportCard = pgTable(
  "report_card",
  {
    id: id(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    termId: text("term_id").references(() => term.id, { onDelete: "set null" }),
    fileKey: text("file_key").notNull(),
    fileName: text("file_name"),
    contentType: text("content_type"),
    gpa: text("gpa"),
    allPassing: boolean("all_passing"),
    note: text("note"),
    status: text("status").$type<ReviewStatus>().notNull().default("pending"),
    reviewNote: text("review_note"),
    reviewedBy: text("reviewed_by"),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index("report_card_user_idx").on(t.userId)],
);

export const grade = pgTable("grade", {
  id: id(),
  reportCardId: text("report_card_id")
    .notNull()
    .references(() => reportCard.id, { onDelete: "cascade" }),
  subject: text("subject").notNull(),
  mark: text("mark").notNull(),
  passing: boolean("passing").notNull().default(true),
});

export const attendanceCheckin = pgTable(
  "attendance_checkin",
  {
    id: id(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    weekOf: date("week_of").notNull(),
    proofKey: text("proof_key"),
    contentType: text("content_type"),
    daysPresent: integer("days_present").notNull().default(5),
    daysLate: integer("days_late").notNull().default(0),
    note: text("note"),
    status: text("status").$type<ReviewStatus>().notNull().default("pending"),
    reviewNote: text("review_note"),
    reviewedBy: text("reviewed_by"),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("checkin_user_week_idx").on(t.userId, t.weekOf)],
);

export const counselorVerification = pgTable("counselor_verification", {
  id: id(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  counselorName: text("counselor_name"),
  counselorEmail: text("counselor_email").notNull(),
  status: text("status").$type<"sent" | "completed" | "expired">().notNull().default("sent"),
  enrolled: boolean("enrolled"),
  attendanceGood: boolean("attendance_good"),
  passing: boolean("passing"),
  comments: text("comments"),
  respondedAt: timestamp("responded_at", { withTimezone: true }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdBy: text("created_by"),
  createdAt: createdAt(),
});

/* ───────────────────────── Program clock in / out ───────────────────────── */

/**
 * One visit to the IGNITE site. `day` is the program-time-zone date of clock-in.
 * A student can have at most one open visit per day; open visits from earlier days
 * ("forgot to clock out") stay open until staff set the clock-out time.
 */
export const clockSession = pgTable(
  "clock_session",
  {
    id: id(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    day: date("day").notNull(),
    clockInAt: timestamp("clock_in_at", { withTimezone: true }).notNull(),
    clockOutAt: timestamp("clock_out_at", { withTimezone: true }),
    /** Distance from the site in meters and GPS accuracy at clock in / out (null when set by staff). */
    inDistanceM: integer("in_distance_m"),
    inAccuracyM: integer("in_accuracy_m"),
    outDistanceM: integer("out_distance_m"),
    outAccuracyM: integer("out_accuracy_m"),
    pointsAwarded: integer("points_awarded").notNull().default(0),
    /** Set when staff created or changed the times. */
    editedBy: text("edited_by"),
    staffNote: text("staff_note"),
    createdAt: createdAt(),
  },
  (t) => [
    index("clock_user_day_idx").on(t.userId, t.day),
    index("clock_day_idx").on(t.day),
    uniqueIndex("clock_one_open_per_day").on(t.userId, t.day).where(sql`${t.clockOutAt} is null`),
  ],
);

/* ───────────────────────── Help center ───────────────────────── */

export const tutorSession = pgTable("tutor_session", {
  id: id(),
  title: text("title").notNull(),
  subject: text("subject").notNull(),
  tutorName: text("tutor_name"),
  description: text("description"),
  provider: text("provider").notNull().default("ORBIT"),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  durationMin: integer("duration_min").notNull().default(60),
  meetingUrl: text("meeting_url"),
  capacity: integer("capacity"),
  reminderSentAt: timestamp("reminder_sent_at", { withTimezone: true }),
  createdBy: text("created_by"),
  createdAt: createdAt(),
});

export const sessionSignup = pgTable(
  "session_signup",
  {
    sessionId: text("session_id")
      .notNull()
      .references(() => tutorSession.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    attended: boolean("attended"),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.sessionId, t.userId] })],
);

export const helpRequest = pgTable("help_request", {
  id: id(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  subject: text("subject").notNull(),
  message: text("message").notNull(),
  status: text("status").$type<"open" | "resolved">().notNull().default("open"),
  createdAt: createdAt(),
});

/* ───────────────────────── Awards & points ───────────────────────── */

export const badge = pgTable("badge", {
  id: id(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  emoji: text("emoji").notNull().default("⭐"),
  color: text("color").notNull().default("gold"),
  points: integer("points").notNull().default(20),
  claimable: boolean("claimable").notNull().default(true),
  active: boolean("active").notNull().default(true),
  createdAt: createdAt(),
});

export const userBadge = pgTable(
  "user_badge",
  {
    id: id(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    badgeId: text("badge_id")
      .notNull()
      .references(() => badge.id, { onDelete: "cascade" }),
    note: text("note"),
    awardedBy: text("awarded_by"),
    awardedAt: timestamp("awarded_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("user_badge_user_idx").on(t.userId)],
);

export const badgeClaim = pgTable("badge_claim", {
  id: id(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  badgeId: text("badge_id")
    .notNull()
    .references(() => badge.id, { onDelete: "cascade" }),
  proofKey: text("proof_key"),
  contentType: text("content_type"),
  note: text("note"),
  status: text("status").$type<ReviewStatus>().notNull().default("pending"),
  reviewNote: text("review_note"),
  reviewedBy: text("reviewed_by"),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  createdAt: createdAt(),
});

export const pointEvent = pgTable(
  "point_event",
  {
    id: id(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    points: integer("points").notNull(),
    reason: text("reason").notNull(),
    source: text("source").notNull(),
    /** YYYY-MM the points count toward */
    month: text("month").notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("point_month_idx").on(t.month, t.userId)],
);

export const scholarOfMonth = pgTable("scholar_of_month", {
  month: text("month").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  note: text("note"),
  crownedBy: text("crowned_by"),
  createdAt: createdAt(),
});

/* ───────────────────────── Voice (ideas) ───────────────────────── */

export type IdeaStatus = "new" | "reviewing" | "planned" | "done" | "declined";

export const idea = pgTable("idea", {
  id: id(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  body: text("body").notNull(),
  category: text("category").notNull().default("Program"),
  anonymous: boolean("anonymous").notNull().default(false),
  status: text("status").$type<IdeaStatus>().notNull().default("new"),
  adminNote: text("admin_note"),
  createdAt: createdAt(),
});

export const ideaVote = pgTable(
  "idea_vote",
  {
    ideaId: text("idea_id")
      .notNull()
      .references(() => idea.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.ideaId, t.userId] })],
);

/* ───────────────────────── Paperless forms ───────────────────────── */

export type FormFieldType = "text" | "textarea" | "choice" | "checkbox" | "date";
export type FormField = {
  id: string;
  type: FormFieldType;
  label: string;
  required: boolean;
  options?: string[];
};

export const form = pgTable("form", {
  id: id(),
  title: text("title").notNull(),
  description: text("description"),
  fields: jsonb("fields").$type<FormField[]>().notNull().default(sql`'[]'::jsonb`),
  requireSignature: boolean("require_signature").notNull().default(false),
  /** "all" or a cohort id */
  audience: text("audience").notNull().default("all"),
  dueDate: date("due_date"),
  status: text("status").$type<"draft" | "published" | "closed">().notNull().default("draft"),
  createdBy: text("created_by"),
  createdAt: createdAt(),
});

export const formResponse = pgTable(
  "form_response",
  {
    id: id(),
    formId: text("form_id")
      .notNull()
      .references(() => form.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    answers: jsonb("answers").$type<Record<string, string | boolean>>().notNull(),
    signatureName: text("signature_name"),
    signatureData: text("signature_data"),
    submittedAt: timestamp("submitted_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("form_response_unique").on(t.formId, t.userId)],
);

/* ───────────────────────── Communication ───────────────────────── */

export const announcement = pgTable("announcement", {
  id: id(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  pinned: boolean("pinned").notNull().default(false),
  emailed: boolean("emailed").notNull().default(false),
  createdBy: text("created_by"),
  createdAt: createdAt(),
});

export const notification = pgTable(
  "notification",
  {
    id: id(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    body: text("body"),
    href: text("href"),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index("notification_user_idx").on(t.userId)],
);

export const birthdayWish = pgTable("birthday_wish", {
  id: id(),
  toUserId: text("to_user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  fromUserId: text("from_user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  message: text("message").notNull(),
  year: integer("year").notNull(),
  hidden: boolean("hidden").notNull().default(false),
  createdAt: createdAt(),
});

export const auditLog = pgTable("audit_log", {
  id: id(),
  actorId: text("actor_id"),
  action: text("action").notNull(),
  targetType: text("target_type"),
  targetId: text("target_id"),
  meta: jsonb("meta").$type<Record<string, unknown>>(),
  createdAt: createdAt(),
});

export const setting = pgTable("setting", {
  key: text("key").primaryKey(),
  value: jsonb("value").$type<unknown>().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ───────────────────────── Relations ───────────────────────── */

export const userRelations = relations(user, ({ one, many }) => ({
  profile: one(profile, { fields: [user.id], references: [profile.userId] }),
  reportCards: many(reportCard),
  checkins: many(attendanceCheckin),
  badges: many(userBadge),
}));

export const profileRelations = relations(profile, ({ one }) => ({
  user: one(user, { fields: [profile.userId], references: [user.id] }),
  cohort: one(cohort, { fields: [profile.cohortId], references: [cohort.id] }),
}));

export const reportCardRelations = relations(reportCard, ({ one, many }) => ({
  user: one(user, { fields: [reportCard.userId], references: [user.id] }),
  term: one(term, { fields: [reportCard.termId], references: [term.id] }),
  grades: many(grade),
}));

export const gradeRelations = relations(grade, ({ one }) => ({
  reportCard: one(reportCard, { fields: [grade.reportCardId], references: [reportCard.id] }),
}));

export const checkinRelations = relations(attendanceCheckin, ({ one }) => ({
  user: one(user, { fields: [attendanceCheckin.userId], references: [user.id] }),
}));

export const clockSessionRelations = relations(clockSession, ({ one }) => ({
  user: one(user, { fields: [clockSession.userId], references: [user.id] }),
}));

export const userBadgeRelations = relations(userBadge, ({ one }) => ({
  user: one(user, { fields: [userBadge.userId], references: [user.id] }),
  badge: one(badge, { fields: [userBadge.badgeId], references: [badge.id] }),
}));

export const badgeClaimRelations = relations(badgeClaim, ({ one }) => ({
  user: one(user, { fields: [badgeClaim.userId], references: [user.id] }),
  badge: one(badge, { fields: [badgeClaim.badgeId], references: [badge.id] }),
}));
