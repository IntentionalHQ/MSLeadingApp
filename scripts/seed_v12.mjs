// Apply the v12 question-bank additions through the Supabase JS client (same
// URL + anon key the app uses), so nothing has to be pasted into the SQL editor.
//
//   node scripts/seed_v12.mjs            # apply v12_1 .. v12_5 (adds only)
//   node scripts/seed_v12.mjs --dry-run  # show what would be added, write nothing
//   node scripts/seed_v12.mjs --retier   # also apply v12_6 (optional UPDATEs)
//
// Rows are read from supabase/v12_*.sql so the SQL files stay the source of
// truth. Every insert skips rows whose text / topic / statement already exists,
// so re-running is safe.

import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";

const env = fs.readFileSync(".env.local", "utf8");
const get = (k) => env.match(new RegExp(k + "=(.*)"))?.[1]?.trim();
const supa = createClient(get("NEXT_PUBLIC_SUPABASE_URL"), get("NEXT_PUBLIC_SUPABASE_ANON_KEY"), { auth: { persistSession: false } });

const DRY = process.argv.includes("--dry-run");
const RETIER = process.argv.includes("--retier");

// ---------- tiny SQL VALUES parser ----------
// Returns an array of tuples (arrays of JS values) for every `values (...)` block in `sql`.
function parseValuesBlocks(sql) {
  const blocks = [];
  const re = /\bvalues\b/gi;
  let m;
  while ((m = re.exec(sql))) {
    let i = sql.indexOf("(", m.index);
    const rows = [];
    while (i >= 0 && i < sql.length && sql[i] === "(") {
      const [vals, end] = parseTuple(sql, i);
      rows.push(vals);
      let k = end;
      while (k < sql.length && /[\s,]/.test(sql[k])) k++;
      if (sql[k] !== "(") break;
      i = k;
    }
    if (rows.length) blocks.push(rows);
  }
  return blocks;
}
function parseTuple(sql, start) {
  let j = start + 1;
  const vals = [];
  let cur = null; // null = nothing yet, {s} = string, {raw} = bare token
  const flush = () => {
    if (cur === null) return;
    if (cur.s !== undefined) vals.push(cur.s);
    else {
      const t = cur.raw.trim();
      if (/^null$/i.test(t)) vals.push(null);
      else if (/^true$/i.test(t)) vals.push(true);
      else if (/^false$/i.test(t)) vals.push(false);
      else if (/^-?\d+(\.\d+)?$/.test(t)) vals.push(Number(t));
      else vals.push(t);
    }
    cur = null;
  };
  while (j < sql.length) {
    const c = sql[j];
    if (c === "'") {
      let s = "";
      j++;
      while (j < sql.length) {
        if (sql[j] === "'") { if (sql[j + 1] === "'") { s += "'"; j += 2; continue; } j++; break; }
        s += sql[j++];
      }
      cur = { s };
      continue;
    }
    if (c === ",") { flush(); j++; continue; }
    if (c === ")") { flush(); return [vals, j + 1]; }
    if (!/\s/.test(c)) { if (cur === null) cur = { raw: "" }; if (cur.raw !== undefined) cur.raw += c; }
    j++;
  }
  flush();
  return [vals, j];
}
// Strip line comments so a "values" mentioned in a comment can't confuse the parser.
const read = (f) => fs.readFileSync("supabase/" + f, "utf8").split("\n").filter((l) => !l.trim().startsWith("--")).join("\n");

// ---------- helpers ----------
async function existingSet(table, col) {
  const { data, error } = await supa.from(table).select(col).limit(5000);
  if (error) throw new Error(`${table}: ${error.message}`);
  return new Set(data.map((r) => r[col]));
}
async function insertNew(table, col, rows) {
  const have = await existingSet(table, col);
  const fresh = rows.filter((r) => !have.has(r[col]));
  const skipped = rows.length - fresh.length;
  if (!DRY) {
    for (let i = 0; i < fresh.length; i += 50) {
      const { error } = await supa.from(table).insert(fresh.slice(i, i + 50));
      if (error) throw new Error(`${table} insert: ${error.message}`);
    }
  }
  console.log(`${table.padEnd(20)} +${String(fresh.length).padStart(3)} added, ${skipped} already there`);
}
const norm = (s) => (s ?? "").replace(/’/g, "'");

// ---------- base seeds (v8/v9, v10, v11) ----------
// These tables exist but were found empty, so the games were running on their
// built-in fallback lists. Load the original seeds first; dedupe makes this safe.
async function baseSeeds() {
  const [gtfRows] = parseValuesBlocks(read("v8_guess_the_fake.sql"));
  await insertNew("gtf_questions", "topic", gtfRows.map(([topic, difficulty, testament, statement_1, statement_2, statement_3, fake_index, explanation]) => ({
    topic, difficulty, testament, statement_1, statement_2, statement_3, fake_index, explanation, active: true,
  })));
  const [ctx] = parseValuesBlocks(read("v9_guess_the_fake_context.sql"));
  let ctxDone = 0;
  for (const [topic, reference, context] of ctx) {
    if (DRY) { ctxDone++; continue; }
    const { data, error } = await supa.from("gtf_questions").update({ reference, context }).eq("topic", topic).is("reference", null).select("id");
    if (error) throw new Error("gtf context: " + error.message);
    ctxDone += data.length;
  }
  console.log(`${"gtf_questions".padEnd(20)} reference/context filled on ${ctxDone} rows`);
  const [tfRows] = parseValuesBlocks(read("v10_true_or_false.sql"));
  await insertNew("tf_questions", "statement", tfRows.map(([statement, answer, difficulty, testament, reference, explanation]) => ({
    statement, answer, difficulty, testament, reference, explanation, active: true,
  })));
  const [vhRows] = parseValuesBlocks(read("v11_verse_hunt.sql"));
  await insertNew("verse_hunt_prompts", "text", vhRows.map(([text, difficulty, hint, books]) => ({ text, difficulty, hint, books, active: true })));
}

// ---------- sections ----------
async function prompts() {
  const [bw, rows] = parseValuesBlocks(read("v12_1_prompts.sql"));
  // A1: banned words on existing prompts where still null
  let filled = 0;
  for (const [text, json] of bw) {
    if (DRY) { filled++; continue; }
    const { data, error } = await supa.from("game_prompts").update({ banned_words: JSON.parse(json) }).eq("text", text).is("banned_words", null).select("id");
    if (error) throw new Error("game_prompts update: " + error.message);
    filled += data.length;
  }
  console.log(`${"game_prompts".padEnd(20)} banned words filled on ${filled} existing prompt${filled === 1 ? "" : "s"}`);
  // A2: new prompts
  await insertNew("game_prompts", "text", rows.map(([text, category, difficulty, testament, hint, banned]) => ({
    text, category, difficulty, testament, hint, banned_words: JSON.parse(banned), active: true,
  })));
}
async function baseball() {
  const [hr, dbl] = parseValuesBlocks(read("v12_2_baseball.sql"));
  const rows = [
    ...hr.map(([text, correct_answer, testament]) => ({ text, correct_answer, difficulty: "home_run", format: "open_answer", choices: null, testament, active: true })),
    ...dbl.map(([text, correct_answer, choices, testament]) => ({ text, correct_answer, difficulty: "double", format: "multiple_choice", choices: JSON.parse(choices), testament, active: true })),
  ];
  await insertNew("questions", "text", rows);
}
async function pir() {
  const [rows] = parseValuesBlocks(read("v12_3_price_is_right.sql"));
  await insertNew("pir_questions", "question", rows.map(([question, host_answer, accepted_answer, numeric_target, unit, category, background, reference_1, fact_type]) => ({
    question, host_answer, accepted_answer, numeric_target, unit, category, background, reference_1, fact_type, active: true,
  })));
}
async function gtf() {
  const [rows] = parseValuesBlocks(read("v12_4_guess_the_fake.sql"));
  await insertNew("gtf_questions", "topic", rows.map(([topic, difficulty, testament, statement_1, statement_2, statement_3, fake_index, explanation, reference, context]) => ({
    topic, difficulty, testament, statement_1, statement_2, statement_3, fake_index, explanation, reference, context, active: true,
  })));
}
async function tf() {
  const [rows] = parseValuesBlocks(read("v12_5_true_false.sql"));
  await insertNew("tf_questions", "statement", rows.map(([statement, answer, difficulty, testament, reference, explanation]) => ({
    statement, answer, difficulty, testament, reference, explanation, active: true,
  })));
}
async function retier() {
  const sql = read("v12_6_optional_retier.sql");
  const stmts = sql.split(/;\s*\n/).filter((s) => /^\s*update/im.test(s));
  const strings = (s) => [...s.matchAll(/'((?:[^']|'')*)'/g)].map((m) => m[1].replace(/''/g, "'")).filter((x) => !["single", "home_run"].includes(x));
  // 1. home runs -> single
  const hrTexts = new Set(strings(stmts[0]).map(norm));
  const { data: hrs, error: e1 } = await supa.from("questions").select("id,text").eq("difficulty", "home_run");
  if (e1) throw new Error(e1.message);
  const toSingle = hrs.filter((q) => hrTexts.has(norm(q.text)));
  if (!DRY) for (const q of toSingle) { const { error } = await supa.from("questions").update({ difficulty: "single" }).eq("id", q.id); if (error) throw new Error(error.message); }
  console.log(`${"questions".padEnd(20)} ${toSingle.length} home runs retagged as singles`);
  // 2. deactivate broken baseball rows
  const badTexts = new Set(strings(stmts[1]).map(norm));
  const { data: all, error: e2 } = await supa.from("questions").select("id,text,active").eq("active", true);
  if (e2) throw new Error(e2.message);
  const toOff = all.filter((q) => badTexts.has(norm(q.text)));
  if (!DRY) for (const q of toOff) { const { error } = await supa.from("questions").update({ active: false }).eq("id", q.id); if (error) throw new Error(error.message); }
  console.log(`${"questions".padEnd(20)} ${toOff.length} unplayable rows deactivated`);
  // 3. deactivate one PIR question
  const [pirQ] = strings(stmts[2]);
  if (!DRY) { const { error } = await supa.from("pir_questions").update({ active: false }).eq("question", pirQ); if (error) throw new Error(error.message); }
  console.log(`${"pir_questions".padEnd(20)} deactivated: "${pirQ}"`);
}

async function counts() {
  const out = {};
  for (const t of ["game_prompts", "questions", "pir_questions", "gtf_questions", "tf_questions", "verse_hunt_prompts"]) {
    const { count, error } = await supa.from(t).select("*", { count: "exact", head: true }).eq("active", true);
    out[t] = error ? "(" + error.message + ")" : count;
  }
  return out;
}

// Run one section; a row-level-security block on one table must not stop the others.
const blocked = [];
async function section(label, fn) {
  try { await fn(); }
  catch (e) {
    const rls = /row-level security/i.test(e.message);
    console.log(`${label.padEnd(20)} SKIPPED - ${rls ? "blocked by row-level security (run supabase/v12_0_rls_fix.sql, then re-run this script)" : e.message}`);
    if (rls) blocked.push(label);
  }
}

const before = await counts();
console.log(DRY ? "DRY RUN - nothing will be written\n" : "Applying v12 through the Supabase client...\n");
console.log("Base seeds (skipped where already present):");
await section("base seeds", baseSeeds);
console.log("\nv12 additions:");
await section("game_prompts", prompts);
await section("questions", baseball);
await section("pir_questions", pir);
await section("gtf_questions", gtf);
await section("tf_questions", tf);
if (RETIER) await section("retier", retier);
if (blocked.length) console.log(`\nBlocked by row-level security: ${blocked.join(", ")}. Run supabase/v12_0_rls_fix.sql in the SQL editor (3 short lines), then run this script again.`);
const after = await counts();
console.log("\nActive rows per bank (before -> after):");
for (const t of Object.keys(after)) console.log(`  ${t.padEnd(16)} ${String(before[t]).padStart(5)} -> ${String(after[t]).padStart(5)}`);
