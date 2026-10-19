import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

config({ path: ".env.local" });

const url = process.env.DATABASE_URL;

export default defineConfig(
  url
    ? { schema: "./src/db/schema.ts", out: "./drizzle", dialect: "postgresql", dbCredentials: { url } }
    : { schema: "./src/db/schema.ts", out: "./drizzle", dialect: "postgresql", driver: "pglite", dbCredentials: { url: "./.pglite" } },
);
