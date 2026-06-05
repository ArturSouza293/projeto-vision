import "server-only";

import { neon } from "@neondatabase/serverless";

/**
 * Server-only Neon SQL client. The HTTP driver suits Vercel's serverless
 * runtime (no connection pool to exhaust). `import "server-only"` makes the
 * build fail if this module is ever pulled into a client bundle, so the
 * connection string can never leak to the browser.
 *
 * DATABASE_URL is injected automatically by the Vercel ↔ Neon integration; for
 * local runs, paste the Neon connection string into .env.local.
 */
const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;

export const isDbConfigured = Boolean(connectionString);

export const sql = connectionString ? neon(connectionString) : null;
