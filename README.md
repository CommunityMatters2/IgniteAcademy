# IGNITE Academy

Youth + admin platform for **IGNITE Academy**, a Community Matters 2 program. It's mobile-first and installable as an app on a phone's home screen.

This session focuses on **grades and school attendance**: IGNITE is a privilege, so students stay eligible by being enrolled, on time and passing.

## What's inside

### Students (mobile app)
| | |
|---|---|
| **Home** | Eligibility ring (Eligible / Needs action / On hold) with a checklist, this month's rank and points, check-in streak, badges, next tutoring session, birthdays and announcements |
| **School** | Report card upload (photo/PDF from the camera, optional grades per class), weekly attendance check-in with proof, guidance counselor status |
| **Help Center** | ORBIT tutoring sessions with sign-up, Zoom links shown only to signed-up students, and help requests |
| **Awards** | Badge cabinet (Comeback Kid, Licensed Driver, Lifeguard Certified…). Students claim milestones with proof |
| **Leaderboard** | Scholar of the Month podium, top 5, hall of fame. Shows first name + last initial, with an opt-out |
| **Ideas** | Suggest ideas and upvote them; status updates come from staff |
| **Forms** | Paperless permission slips and surveys with finger-drawn e-signatures |
| **Birthdays** | Confetti on your day, peer birthday wishes, upcoming birthdays |

### Admin console
- **Dashboard**: eligibility counts, review queue, tutoring this week, top 5, upcoming birthdays, recent activity
- **Students & staff**:
  - Invite one person or bulk-invite from CSV
  - Search and filter
  - Per-student profile with eligibility, uploads and points
  - Roles (student / tutor / admin) and eligibility override
  - Pause or re-activate, password reset email, **view as student** (impersonation), delete
- **Review queue**: approve or send back report cards, check-ins and badge claims. Approving awards points and notifies the student in the app and by email
- **Counselor verification**: emails the counselor a secure link to a 3-question form (no login)
- **Help Center**: create sessions (repeating weekly), mark attendance, resolve help requests
- **Awards**: manage the badge catalog and award badges by hand
- **Scholar of the Month**: ranking per month, crown the winner (email + pinned announcement)
- **Ideas**, **Forms builder** (templates, responses, CSV export), **Announcements** (optionally emailed), **Birthdays** (wish moderation)
- **Settings**: eligibility rules, point values, grading periods, groups
- **Audit log** of every admin action

### Automations (Vercel Cron)
- `/api/cron/birthdays`: daily birthday email, bonus points and in-app notification
- `/api/cron/reminders`: daily reminder email for tutoring sessions in the next 24 hours

## Tech
Next.js 16 (App Router, Cache Components, Server Actions) · React 19 · Tailwind CSS v4 · Better Auth (email + password, admin plugin) · Drizzle ORM · Neon Postgres · Vercel Blob (private) · Resend + React Email · Motion · Vaul.

## Deploy to Vercel
1. **Import** this GitHub repo in Vercel.
2. **Database**: Storage → Marketplace → **Neon** → connect to the project. This adds `DATABASE_URL`.
3. **Files**: Storage → **Blob** → create a **private** store and connect it. This adds `BLOB_READ_WRITE_TOKEN`.
4. **Environment variables**: add `BETTER_AUTH_SECRET`, `RESEND_API_KEY`, `EMAIL_FROM`, `CRON_SECRET` and `APP_URL` (see `.env.example`).
5. **Deploy**. Database migrations run automatically during `npm run build`.
6. **Create the first admin** from your computer:
   ```bash
   vercel env pull .env.local
   ADMIN_EMAIL=you@cm2.org ADMIN_NAME="Your Name" ADMIN_PASSWORD="a-strong-password" npm run db:seed
   ```
   The seed also adds 10 starter badges and a grading period.
7. **Email**: in Resend, verify CM2's domain and set `EMAIL_FROM` to an address on it. Until then emails only reach the Resend account owner. Invites and verification requests still show a copyable link, so staff can text it.

## Local development
```bash
npm install
npm run db:migrate      # uses an embedded Postgres in ./.pglite when DATABASE_URL is unset
ADMIN_EMAIL=admin@ignite.test ADMIN_PASSWORD=ignite-test-123 npm run db:seed
npm run dev
```
Without `BLOB_READ_WRITE_TOKEN`, uploads are saved to `./.uploads`. Without `RESEND_API_KEY`, emails are printed to the console.

| Script | |
|---|---|
| `npm run db:generate` | Create a migration after editing `src/db/schema.ts` |
| `npm run db:migrate` | Apply migrations |
| `npm run db:seed` | Starter data + first admin |
| `npm run typecheck` / `npm run lint` | Checks |

## Privacy and security notes
- **Invite-only.** Public sign-up is disabled.
- **Uploads are private.** Report cards, attendance proof and claims sit in a private Blob store. They're served through `/api/files`, which allows only the owner and admins.
- **Every page and server action re-checks the session and role** on the server; the proxy is only a fast redirect.
- **Pausing an account** signs the student out everywhere. **Deleting an account** also deletes their uploaded files.
- **Leaderboards show first name + last initial only**, and students can opt out completely.
