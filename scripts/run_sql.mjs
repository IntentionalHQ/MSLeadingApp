// Run a .sql file against the Supabase Postgres database directly, bypassing
// the dashboard editor (which runs only the selected text and can mangle pastes).
//
//   node scripts/run_sql.mjs supabase/v12_question_balance.sql
//
// Needs DATABASE_URL in .env.local (never committed). Get it from the Supabase
// dashboard: Project Settings → Database → Connection string → URI. Use the
// "Session" pooler string (port 5432) or the direct one; replace [YOUR-PASSWORD].
//
// The whole file runs as one script inside a transaction: if anything fails,
// nothing is applied.

import fs from "node:fs";
import path from "node:path";
import pg from "pg";

const file = process.argv[2];
if (!file) {
  console.error("usage: node scripts/run_sql.mjs <file.sql>");
  process.exit(1);
}

// Minimal .env.local loader (no dependency).
const envPath = path.resolve(".env.local");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set. Add it to .env.local (see the comment at the top of this script).");
  process.exit(1);
}

const sql = fs.readFileSync(file, "utf8").replace(/^﻿/, "");
const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });

const counts = async () => {
  const tables = ["game_prompts", "questions", "pir_questions", "gtf_questions", "tf_questions", "verse_hunt_prompts"];
  const out = {};
  for (const t of tables) {
    try {
      const r = await client.query(`select count(*)::int as n from ${t} where active`);
      out[t] = r.rows[0].n;
    } catch {
      out[t] = "(missing)";
      await client.query("rollback; begin");
    }
  }
  return out;
};

try {
  await client.connect();
  await client.query("begin");
  const before = await counts();
  await client.query(sql);
  const after = await counts();
  await client.query("commit");
  console.log(`Applied ${path.basename(file)} successfully.\n`);
  console.log("Active rows per bank (before → after):");
  for (const t of Object.keys(after)) console.log(`  ${t.padEnd(20)} ${String(before[t]).padStart(5)} → ${String(after[t]).padStart(5)}`);
} catch (e) {
  try { await client.query("rollback"); } catch {}
  console.error("FAILED, nothing was applied.\n");
  console.error(e.message);
  if (e.position) {
    const pos = Number(e.position);
    const line = sql.slice(0, pos).split("\n").length;
    console.error(`at line ${line}:`);
    console.error("  " + sql.split("\n")[line - 1]?.slice(0, 160));
  }
  process.exit(1);
} finally {
  await client.end();
}
