import "server-only";
import { Pool, neonConfig } from "@neondatabase/serverless";
import { PGlite } from "@electric-sql/pglite";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-serverless";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import * as schema from "./schema";

type DB = ReturnType<typeof drizzleNeon<typeof schema>>;

/**
 * Production: Neon Postgres (DATABASE_URL is injected by the Vercel ↔ Neon integration).
 * Local dev without DATABASE_URL: an embedded Postgres (PGlite) stored in ./.pglite
 */
function createDb(): DB {
  const url = process.env.DATABASE_URL;
  if (url) {
    if (typeof WebSocket !== "undefined") neonConfig.webSocketConstructor = WebSocket;
    return drizzleNeon({ client: new Pool({ connectionString: url }), schema });
  }
  if (process.env.VERCEL) {
    throw new Error("DATABASE_URL is not set. Connect Neon to this Vercel project.");
  }
  return drizzlePglite({ client: new PGlite("./.pglite"), schema }) as unknown as DB;
}

const globalForDb = globalThis as unknown as { __igniteDb?: DB };

function getDb() {
  if (!globalForDb.__igniteDb) globalForDb.__igniteDb = createDb();
  return globalForDb.__igniteDb;
}

/** Lazily connects on first query, so importing this module never opens a connection. */
export const db = new Proxy({} as DB, {
  get(_target, prop) {
    const real = getDb();
    const value = Reflect.get(real, prop, real);
    return typeof value === "function" ? value.bind(real) : value;
  },
});

export { schema };
