/**
 * Versioned migration runner for Neon Postgres.
 *
 *   npm run db:migrate
 *
 * Reads migrations/*.sql in filename order, applies any that haven't run yet
 * (tracked in schema_migrations), and is safe to re-run. Needs DATABASE_URL —
 * locally it's loaded from .env.local via `node --env-file`; on Vercel the Neon
 * integration injects it automatically.
 */
import { readdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { neon } from "@neondatabase/serverless";

const conn = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!conn) {
  console.error(
    "✗ DATABASE_URL ausente. Provisione o Neon no Vercel e cole a connection string no .env.local.",
  );
  process.exit(1);
}

const sql = neon(conn);
const migrationsDir = join(dirname(fileURLToPath(import.meta.url)), "..", "migrations");

await sql.query(
  "create table if not exists schema_migrations (name text primary key, applied_at timestamptz not null default now())",
);
const appliedRows = await sql.query("select name from schema_migrations");
const applied = new Set(appliedRows.map((r) => r.name));

const files = (await readdir(migrationsDir)).filter((f) => f.endsWith(".sql")).sort();
let ran = 0;

for (const file of files) {
  if (applied.has(file)) {
    console.log(`• ${file} (já aplicada)`);
    continue;
  }
  const raw = await readFile(join(migrationsDir, file), "utf8");
  const statements = raw
    .replace(/^\s*--.*$/gm, "") // strip line comments
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);
  for (const stmt of statements) await sql.query(stmt);
  await sql.query("insert into schema_migrations (name) values ($1)", [file]);
  console.log(`✓ ${file} aplicada (${statements.length} statements)`);
  ran++;
}

console.log(ran ? `\n${ran} migração(ões) aplicada(s).` : "\nNada a aplicar (banco já atualizado).");
