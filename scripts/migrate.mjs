// One-off migration runner — applies supabase/migrations/*.sql in order against
// DATABASE_URL. No Supabase CLI / Docker required, just a Postgres connection.
//
// Usage: DATABASE_URL=postgresql://... node scripts/migrate.mjs
import { readdirSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));
const migrationsDir = join(__dirname, "..", "supabase", "migrations");

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("Set DATABASE_URL first, e.g.:\n  DATABASE_URL='postgresql://postgres:...@db.xxxx.supabase.co:5432/postgres' node scripts/migrate.mjs");
  process.exit(1);
}

const files = readdirSync(migrationsDir).filter((f) => f.endsWith(".sql")).sort();
if (files.length === 0) {
  console.log("No migration files found in supabase/migrations/.");
  process.exit(0);
}

const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });

try {
  await client.connect();
  await client.query(`create table if not exists _migrations (name text primary key, applied_at timestamptz not null default now())`);

  for (const file of files) {
    const { rows } = await client.query("select 1 from _migrations where name = $1", [file]);
    if (rows.length > 0) {
      console.log(`skip  ${file} (already applied)`);
      continue;
    }
    const sql = readFileSync(join(migrationsDir, file), "utf8");
    console.log(`apply ${file} ...`);
    await client.query("begin");
    try {
      await client.query(sql);
      await client.query("insert into _migrations (name) values ($1)", [file]);
      await client.query("commit");
      console.log(`  done`);
    } catch (err) {
      await client.query("rollback");
      throw err;
    }
  }
  console.log("All migrations applied.");
} finally {
  await client.end();
}
