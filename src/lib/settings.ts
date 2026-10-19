import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { setting } from "@/db/schema";

export type ProgramSettings = {
  /** Approved weekly check-ins needed in the last 4 weeks to stay eligible. */
  minCheckins: number;
  /** Require an approved report card for the current term. */
  requireReportCard: boolean;
  /** Require counselor contact info on the profile. */
  requireCounselor: boolean;
  points: {
    reportCard: number;
    allPassing: number;
    checkin: number;
    onTimeWeek: number;
    tutoring: number;
    ideaShipped: number;
    birthday: number;
  };
};

export const DEFAULT_SETTINGS: ProgramSettings = {
  minCheckins: 3,
  requireReportCard: true,
  requireCounselor: true,
  points: {
    reportCard: 25,
    allPassing: 25,
    checkin: 10,
    onTimeWeek: 5,
    tutoring: 15,
    ideaShipped: 20,
    birthday: 10,
  },
};

export async function getSettings(): Promise<ProgramSettings> {
  const row = await db.query.setting.findFirst({ where: eq(setting.key, "program") });
  const saved = (row?.value ?? {}) as Partial<ProgramSettings>;
  return {
    ...DEFAULT_SETTINGS,
    ...saved,
    points: { ...DEFAULT_SETTINGS.points, ...(saved.points ?? {}) },
  };
}

export async function saveSettings(value: ProgramSettings) {
  await db
    .insert(setting)
    .values({ key: "program", value })
    .onConflictDoUpdate({ target: setting.key, set: { value, updatedAt: new Date() } });
}
