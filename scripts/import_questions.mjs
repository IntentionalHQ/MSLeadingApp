// Read the Bible Baseball Questions xlsx and emit supabase/seed_questions.sql.
// Usage:  node scripts/import_questions.mjs "C:/Users/akmci/Downloads/Bible Baseball Questions.xlsx"

import fs from "node:fs";
import path from "node:path";
import XLSX from "xlsx";

const src = process.argv[2] || "C:/Users/akmci/Downloads/Bible Baseball Questions.xlsx";
const out = path.resolve("supabase/seed_questions.sql");

const wb = XLSX.readFile(src);
const sheet = wb.Sheets[wb.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });

// The sheet is a stream of cells. We infer difficulty from tags like [1B]/[2B]/[3B]/[HR]
// or from section headers "Singles:", "Doubles", "Triple:", "Home Runs:".
// A question record = { text, choices?, correct_answer, difficulty, format }.

const TAG_TO_DIFF = { "1B": "single", "2B": "double", "3B": "triple", "HR": "home_run" };
const HEADER_TO_DIFF = {
  singles: "single", doubles: "double", triple: "triple", triples: "triple",
  "home runs": "home_run", "home run": "home_run",
};

// Flatten all non-empty cells in row-major order.
const cells = [];
for (const row of rows) {
  for (const c of row) {
    if (c === null || c === undefined) continue;
    const s = String(c).trim();
    if (s === "") continue;
    cells.push(s);
  }
}

const escSql = (s) => s.replace(/'/g, "''");
const jsonLit = (arr) => "'" + JSON.stringify(arr).replace(/'/g, "''") + "'";

let currentDiff = "single";
const questions = [];

for (let i = 0; i < cells.length; i++) {
  const s = cells[i];

  // Section header?
  const lower = s.toLowerCase().replace(/[:\s]+$/, "");
  if (HEADER_TO_DIFF[lower]) { currentDiff = HEADER_TO_DIFF[lower]; continue; }
  // Bare tag like [1B] on its own?
  const tagMatch = s.match(/^\[(1B|2B|3B|HR)\]\s*$/i);
  if (tagMatch) { currentDiff = TAG_TO_DIFF[tagMatch[1].toUpperCase()]; continue; }

  // Question line: contains '?' and typically ends with '?'
  if (!s.includes("?")) continue;

  // Strip leading [xB] tag from a tagged question but also set difficulty from it.
  let text = s;
  const inlineTag = s.match(/^\[(1B|2B|3B|HR)\]\s*(.*)$/i);
  if (inlineTag) {
    currentDiff = TAG_TO_DIFF[inlineTag[1].toUpperCase()];
    text = inlineTag[2].trim();
  }

  // Look ahead for choices then answer.
  // Choices patterns:
  //   (a) One cell "A) foo\nB) bar\nC) baz\nD) qux"
  //   (b) One cell "A) foo B) bar C) baz D) qux"
  //   (c) Four separate cells "A) foo", "B) bar", ...
  //   Home runs and many triples: no choices; next cell is the answer.
  let choices = null;
  let answer = null;
  let j = i + 1;

  const looksLikeChoiceBlock = (t) => /(^|\s)A\)/i.test(t) && /\bB\)/i.test(t);
  const looksLikeSingleChoice = (t) => /^[A-D]\)\s/.test(t);

  if (j < cells.length && looksLikeChoiceBlock(cells[j])) {
    // One-cell choice block — split by A)/B)/C)/D) markers
    const raw = cells[j];
    const parts = raw.split(/\s*(?=[A-D]\)\s)/g).map((p) => p.trim()).filter(Boolean);
    if (parts.length >= 2) choices = parts;
    j++;
  } else if (j < cells.length && looksLikeSingleChoice(cells[j])) {
    const acc = [];
    while (j < cells.length && looksLikeSingleChoice(cells[j]) && acc.length < 4) {
      acc.push(cells[j].trim());
      j++;
    }
    if (acc.length >= 2) choices = acc;
  }

  // Answer is the next cell that is NOT a question and NOT a header.
  while (j < cells.length) {
    const cand = cells[j];
    if (cand.includes("?")) break;
    if (HEADER_TO_DIFF[cand.toLowerCase().replace(/[:\s]+$/, "")]) break;
    if (/^\[(1B|2B|3B|HR)\]\s*$/i.test(cand)) break;
    answer = cand.trim();
    break;
  }
  if (!answer) continue;

  const format = choices ? "multiple_choice" : "open_answer";
  questions.push({ text, choices, correct_answer: answer, difficulty: currentDiff, format });
}

// Dedup by text
const seen = new Set();
const deduped = questions.filter((q) => {
  const k = q.difficulty + "|" + q.text;
  if (seen.has(k)) return false;
  seen.add(k);
  return true;
});

// Emit SQL
let sql = "-- Auto-generated from " + path.basename(src) + "\n";
sql += "-- Total: " + deduped.length + " questions\n\n";
sql += "-- Wipe existing baseball uses so we can reseed cleanly.\n";
sql += "delete from question_game_uses where game_type='bible_baseball';\n";
sql += "delete from questions where id in (select question_id from question_game_uses where game_type='bible_baseball');\n\n";
sql += "with inserted as (\n";
sql += "  insert into questions (text, correct_answer, difficulty, format, choices) values\n";

const rowsSql = deduped.map((q) => {
  const parts = [
    `'${escSql(q.text)}'`,
    `'${escSql(q.correct_answer)}'`,
    `'${q.difficulty}'`,
    `'${q.format}'`,
    q.choices ? jsonLit(q.choices) : "null",
  ];
  return "  (" + parts.join(", ") + ")";
});
sql += rowsSql.join(",\n") + "\n";
sql += "  returning id, difficulty\n";
sql += ")\n";
sql += "insert into question_game_uses (question_id, game_type, role)\n";
sql += "select id, 'bible_baseball', difficulty from inserted;\n";

fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, sql);
console.log("Wrote", out);
console.log("Questions by difficulty:");
const counts = {};
for (const q of deduped) counts[q.difficulty] = (counts[q.difficulty] || 0) + 1;
console.log(counts);
