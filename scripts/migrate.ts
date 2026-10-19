/**
 * Applies Drizzle migrations from ./drizzle.
 * - With DATABASE_URL (Vercel/Neon): migrates Neon. Runs automatically during `npm run build`.
 * - Without it (local dev): migrates the embedded PGlite database in ./.pglite.
 */
import { config } from "dotenv";

config({ path: ".env.local" });
config();

async function main() {
  const url = process.env.DATABASE_URL;
  if (url) {
    const { Pool, neonConfig } = await import("@neondatabase/serverless");
    const { drizzle } = await import("drizzle-orm/neon-serverless");
    const { migrate } = await import("drizzle-orm/neon-serverless/migrator");
    neonConfig.webSocketConstructor = globalThis.WebSocket;
    const pool = new Pool({ connectionString: url });
    await migrate(drizzle({ client: pool }), { migrationsFolder: "./drizzle" });
    await pool.end();
    console.log("✓ Neon migrations applied");
    return;
  }
  if (process.env.VERCEL) {
    console.warn("⚠ DATABASE_URL not set on Vercel — skipping migrations. Connect Neon to this project.");
    return;
  }
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const { migrate } = await import("drizzle-orm/pglite/migrator");
  const client = new PGlite("./.pglite");
  await migrate(drizzle({ client }), { migrationsFolder: "./drizzle" });
  await client.close();
  console.log("✓ Local (PGlite) migrations applied");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
