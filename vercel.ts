import type { VercelConfig } from "@vercel/config/v1";

// Cron times are UTC. 12:00 UTC ≈ 8 AM Eastern (7 AM in winter).
export const config: VercelConfig = {
  framework: "nextjs",
  crons: [
    { path: "/api/cron/birthdays", schedule: "0 12 * * *" },
    { path: "/api/cron/reminders", schedule: "30 11 * * *" },
  ],
};
