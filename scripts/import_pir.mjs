// Read Bible_Price_Is_Right_120_Questions.xlsx and emit supabase/seed_pir.sql.
// Usage:  node scripts/import_pir.mjs [path-to-xlsx]

import fs from "node:fs";
import path from "node:path";
import XLSX from "xlsx";

const src = process.argv[2] || "Bible_Price_Is_Right_120_Questions.xlsx";
const out = path.resolve("supabase/seed_pir.sql");

const wb = XLSX.readFile(src);
const rows = XLSX.utils.sheet_to_json(wb.Sheets["Game Bank"]);

const esc = (s) => (s === null || s === undefined || s === "" ? "null" : "'" + String(s).replace(/'/g, "''") + "'");
const num = (n) => (n === null || n === undefined || n === "" || Number.isNaN(Number(n)) ? "null" : String(Number(n)));

const lines = [
  "-- Auto-generated from Bible_Price_Is_Right_120_Questions.xlsx",
  "-- Regenerate with: node scripts/import_pir.mjs",
  "",
  "insert into pir_questions",
  "  (question, host_answer, accepted_answer, numeric_target, unit, category, background, reference_1, reference_2, fact_type, source_url)",
  "values",
];

const values = rows.map((r) => {
  return `  (${esc(r["Question"])}, ${esc(r["Host Answer"])}, ${esc(r["Accepted Answer / Range"])}, ${num(r["Numeric Target"])}, ${esc(r["Unit"])}, ${esc(r["Category"])}, ${esc(r["Background"])}, ${esc(r["Reference 1"])}, ${esc(r["Reference 2"])}, ${esc(r["Fact Type"])}, ${esc(r["Source URL"])})`;
});

lines.push(values.join(",\n") + ";");
fs.writeFileSync(out, lines.join("\n"));
console.log(`Wrote ${rows.length} rows → ${out}`);
