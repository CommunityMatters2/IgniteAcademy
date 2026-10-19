import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin } from "better-auth/plugins";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/db";
import { account, session, user, verification } from "@/db/schema";
import { sendEmail } from "@/lib/email";
import { appUrl } from "@/lib/env";

const trustedOrigins = [appUrl()];
if (process.env.VERCEL_URL) trustedOrigins.push(`https://${process.env.VERCEL_URL}`);
if (process.env.VERCEL_BRANCH_URL) trustedOrigins.push(`https://${process.env.VERCEL_BRANCH_URL}`);

export const auth = betterAuth({
  appName: "IGNITE Academy",
  baseURL: appUrl(),
  trustedOrigins,
  secret: process.env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: { user, session, account, verification },
  }),
  emailAndPassword: {
    enabled: true,
    // IGNITE is invite-only: accounts are created by admins (see src/lib/invites.ts).
    disableSignUp: true,
    minPasswordLength: 8,
    resetPasswordTokenExpiresIn: 60 * 60,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, token }) => {
      await sendEmail({
        to: user.email,
        subject: "Reset your IGNITE password",
        preview: "Use this link to choose a new password.",
        heading: "Reset your password",
        paragraphs: [
          `Hi ${user.name.split(" ")[0]}, we got a request to reset your IGNITE Academy password.`,
          "This link works for 1 hour. If you didn't ask for this, you can ignore this email.",
        ],
        cta: { label: "Choose a new password", href: `${appUrl()}/reset?token=${token}` },
      });
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
  },
  rateLimit: {
    enabled: process.env.NODE_ENV === "production",
    window: 60,
    max: 100,
    customRules: {
      "/sign-in/email": { window: 60, max: 5 },
      "/request-password-reset": { window: 300, max: 3 },
    },
  },
  plugins: [
    admin({
      defaultRole: "student",
      adminRoles: ["admin"],
      impersonationSessionDuration: 60 * 30,
      bannedUserMessage: "Your IGNITE account is paused. Please talk to program staff.",
    }),
    nextCookies(), // must stay last
  ],
});

export type Session = typeof auth.$Infer.Session;
