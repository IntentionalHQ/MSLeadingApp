// Excel planning template: download a workbook an AI can read and fill in,
// then upload it back to replace the Sunday's outline. The uploaded file is
// parsed in the browser and never stored anywhere.

import type { Itinerary, Section, SectionType } from "./types";
import { SECTION_LABEL } from "./types";
import { GAMES } from "./games";

export type PastOutline = { itinerary: Itinerary; sections: Section[] };

export type ParsedPlan = {
  itinerary: Partial<Pick<Itinerary, "title" | "scheduled_date" | "start_time" | "slot_minutes" | "lesson_title" | "bible_passage" | "memory_verse">>;
  sections: Array<Pick<Section, "title" | "section_type" | "duration_minutes" | "chosen_game" | "instructions" | "script" | "discussion_questions" | "notes">>;
  errors: string[];
  warnings: string[];
};

// ---------------------------------------------------------------------------
// Sheet names and column headers. The parser looks these up by name, so the
// AI is told (loudly) not to rename them.
// ---------------------------------------------------------------------------
export const SHEET_README = "READ ME FIRST (AI instructions)";
export const SHEET_PLAN = "Plan";
export const SHEET_SECTIONS = "Sections";
export const SHEET_REFERENCE = "Reference";
export const SHEET_PAST = "Past 4 Sundays";

const PLAN_KEYS = [
  ["Title", "title"],
  ["Date (YYYY-MM-DD)", "scheduled_date"],
  ["Start time (e.g. 11:00 AM)", "start_time"],
  ["Slot length (minutes)", "slot_minutes"],
  ["Lesson title", "lesson_title"],
  ["Bible passage", "bible_passage"],
  ["Memory verse (full text + reference)", "memory_verse"],
] as const;

const SECTION_HEADERS = [
  "Order", "Type", "Section title", "Minutes", "Game", "Instructions", "Script", "Discussion questions", "Notes",
] as const;

// ---------------------------------------------------------------------------
// The prompt. This is what the AI reads first. Keep it plain text, one idea per
// row, because spreadsheet cells don't render markdown.
// ---------------------------------------------------------------------------
function readmeRows(planDate: string): string[][] {
  const L: string[] = [
    "MS LEADING — SUNDAY MORNING PLANNING TEMPLATE",
    "",
    "YOU ARE THE PLANNING ASSISTANT. The person who uploaded this file leads a middle-school small group on Sunday mornings. Your job is to interview them briefly, then write this Sunday's outline into the 'Plan' and 'Sections' sheets of THIS workbook and give the file back, so they can upload it into their app.",
    "",
    "STEP 1 — READ THE WHOLE WORKBOOK BEFORE YOU SAY ANYTHING.",
    "  • 'Past 4 Sundays' = the last four outlines this leader actually used, newest first. This is the ground truth for structure, tone, wording, and where they are in their Bible series.",
    "  • 'Reference' = the allowed section types, the games the app can run, and what each cell should contain.",
    "  • 'Plan' and 'Sections' = the two sheets you fill in. Anything already in them is the current draft; keep it unless the leader says otherwise.",
    "",
    "STEP 2 — OPEN WITH A SHORT SUMMARY, THEN ASK. Your first message should:",
    "  1. Say in one or two sentences where the group left off (passage covered last time, the series they are in, the memory verse they used).",
    "  2. Propose the natural next passage (usually the next section of the same book) and a theme sentence.",
    "  3. Ask ONLY these questions, numbered, and wait for answers:",
    "     Q1. Passage for this Sunday? (Accept my proposal or give another.)",
    "     Q2. Main point you want the students to walk away with?",
    "     Q3. Memory verse? (Suggest one from the passage. Say 'none' to skip the Memory Verse section.)",
    "     Q4. Which game, and how long? (Pick from the Reference sheet, or 'let me pick on the day'.)",
    "     Q5. Anything different this week? (Guests, schedule changes, announcements, follow-ups from last week.)",
    "  Do not ask anything else unless an answer is unclear. Keep the interview to one round if you can.",
    "",
    "STEP 3 — DRAFT THE OUTLINE IN CHAT FIRST. Show the section list with minutes, then the Bible Reading discussion questions. Ask 'Anything to change before I write it into the file?' Make edits until they say it is good.",
    "",
    "STEP 4 — FILL THE WORKBOOK AND RETURN IT AS .xlsx.",
    "  • 'Plan' sheet: fill column B next to each label in column A. Do not rename column A.",
    "  • 'Sections' sheet: one row per section, top to bottom in the order they happen. Keep the header row exactly as is. Delete the example rows.",
    "  • Return the file with the same sheet names. Do not add sheets, columns, merged cells, or formatting tricks. Plain text in cells; line breaks inside a cell are fine.",
    "",
    "HOW THIS LEADER WRITES (match this closely — copy wording from Past 4 Sundays where a section repeats every week):",
    "  • Recurring sections keep IDENTICAL text week to week: Free Hangout, Rules and Reset, Prayer, and the Memory Verse instructions. Copy them from the most recent past Sunday verbatim unless the leader asks for a change.",
    "  • 'Instructions' = short imperative sentences to the leader. What to do, in what order. No fluff. Example: 'Ask students to name the three questions used for every Bible passage. Have students take turns reading.'",
    "  • 'Script' = the exact words to say, in quotation marks. For the Bible Reading section, the Script also contains the FULL passage text pasted in (NLT is what they have been using), with the passage heading in capitals first, e.g. 'MARK 3:20-30', then the verses with verse numbers.",
    "  • 'Discussion questions' for Bible Reading use the SAY / MEAN / DO framework this group uses every week:",
    "       Say = What does the passage literally say?   Mean = What does it mean?   Do = What are you going to do about it?",
    "    Format: a heading in capitals with the passage range, then for each subsection of the passage a 'Say:', 'Mean:', and 'Do:' question, each followed by the expected answer in [square brackets]. Two or three subsections is plenty; the leader will not get through more than that in 20 minutes.",
    "  • 'Notes' = leader-only reminders. Where things are, what to avoid, scoring rules. Example: 'The goal is understanding and application, not finishing every verse.'",
    "  • Tone: direct, warm, no jargon. Written for a volunteer reading a phone while teenagers talk. Short paragraphs. No markdown symbols (no #, *, or -). Numbered lists are fine.",
    "  • Timing: the whole group runs about 45 to 60 minutes. Typical shape: Free Hangout 15, Rules and Reset 2, Memory Verse 5, Bible Reading 20, Prayer 3, Group Game 5 to 15. Adjust to what the leader asks for, but keep the total inside the slot length on the Plan sheet.",
    "  • Teams and points: students are split into two teams that earn points all season (memory verse recites earn 1 point each; games have their own scoring). Mention team names only if they appear in Past 4 Sundays.",
    "",
    "VALUES THE APP ACCEPTS (see Reference sheet for the full lists):",
    "  • Type must be one of: " + Object.values(SECTION_LABEL).join(", ") + ".",
    "  • Game is only used when Type is 'Group Game'. Use the exact game name from the Reference sheet, or 'Pick during group'.",
    "  • Minutes must be a whole number. Order must be 1, 2, 3, ...",
    "  • Date is YYYY-MM-DD. Start time looks like 11:00 AM.",
    "",
    `This template was generated on ${planDate}. The 'Past 4 Sundays' sheet holds the four outlines dated before the plan's date.`,
  ];
  return L.map((s) => [s]);
}

// ---------------------------------------------------------------------------
// Build the workbook bytes.
// ---------------------------------------------------------------------------
export async function buildTemplate(it: Itinerary, sections: Section[], past: PastOutline[]): Promise<ArrayBuffer> {
  const XLSX = await import("xlsx");
  const wb = XLSX.utils.book_new();

  // READ ME
  const readme = XLSX.utils.aoa_to_sheet(readmeRows(it.scheduled_date ?? new Date().toLocaleDateString("en-CA")));
  readme["!cols"] = [{ wch: 140 }];
  XLSX.utils.book_append_sheet(wb, readme, SHEET_README);

  // Plan (key / value)
  const planRows: (string | number | null)[][] = [["Field", "Value (fill this column)"]];
  for (const [label, key] of PLAN_KEYS) {
    const v = (it as any)[key];
    planRows.push([label, v == null ? "" : v]);
  }
  const plan = XLSX.utils.aoa_to_sheet(planRows);
  plan["!cols"] = [{ wch: 38 }, { wch: 90 }];
  XLSX.utils.book_append_sheet(wb, plan, SHEET_PLAN);

  // Sections (table). Current sections if any, else two example rows.
  const secRows: (string | number | null)[][] = [[...SECTION_HEADERS]];
  const src = sections.length ? sections : exampleSections();
  src.forEach((s, i) => {
    secRows.push([
      i + 1,
      SECTION_LABEL[s.section_type] ?? s.section_type,
      s.title,
      s.duration_minutes ?? "",
      s.section_type === "group_game" ? gameNameFromId(s.chosen_game) : "",
      s.instructions ?? "",
      s.script ?? "",
      s.discussion_questions ?? "",
      s.notes ?? "",
    ]);
  });
  const secs = XLSX.utils.aoa_to_sheet(secRows);
  secs["!cols"] = [{ wch: 6 }, { wch: 18 }, { wch: 24 }, { wch: 8 }, { wch: 22 }, { wch: 50 }, { wch: 60 }, { wch: 60 }, { wch: 40 }];
  XLSX.utils.book_append_sheet(wb, secs, SHEET_SECTIONS);

  // Reference
  const ref: (string | null)[][] = [["SECTION TYPES (use the exact name in the Type column)", "When to use it"]];
  const typeHelp: Record<SectionType, string> = {
    free_hangout: "Arrival time. Students settle, snacks, board games. Always first.",
    rules: "Reset expectations and preview the plan. Same script every week.",
    memory_verse: "Introduce this week's verse. The verse text goes on the Plan sheet, not here.",
    memory_verse_check: "Students recite the verse for a team point. Uses the app's check-off screen.",
    bible_reading: "Read the passage together and discuss with Say / Mean / Do.",
    discussion: "A discussion that is not tied to reading a passage.",
    prayer: "Requests and closing prayer.",
    group_game: "A game from the list below. Set the Game column.",
    score_recording: "Announce scores and save the summary. Usually last.",
    custom: "Anything else (announcements, a video, a special activity).",
  };
  for (const [id, label] of Object.entries(SECTION_LABEL)) ref.push([label, typeHelp[id as SectionType]]);
  ref.push([""], ["GAMES (use the exact name in the Game column)", "How it plays"]);
  for (const g of GAMES.filter((g) => g.ready)) ref.push([g.label, g.description]);
  ref.push(["Pick during group", "Leave the choice to the leader on the day."]);
  ref.push([""], ["COLUMN", "What goes in it"]);
  ref.push(["Order", "1, 2, 3 ... in the order the sections happen."]);
  ref.push(["Type", "One of the section types above."]);
  ref.push(["Section title", "What the leader sees as the heading, e.g. 'Mark 3:20-30' or 'Rules and Reset'."]);
  ref.push(["Minutes", "Whole number. Planned length."]);
  ref.push(["Game", "Only for Group Game rows."]);
  ref.push(["Instructions", "What the leader does. Short imperative sentences."]);
  ref.push(["Script", "Exact words to say, in quotes. Bible Reading: the full passage text goes here too."]);
  ref.push(["Discussion questions", "Say / Mean / Do questions with expected answers in [brackets]."]);
  ref.push(["Notes", "Leader-only reminders."]);
  const refSheet = XLSX.utils.aoa_to_sheet(ref);
  refSheet["!cols"] = [{ wch: 44 }, { wch: 110 }];
  XLSX.utils.book_append_sheet(wb, refSheet, SHEET_REFERENCE);

  // Past 4 Sundays: flat table, one row per section, newest Sunday first.
  const pastRows: (string | number | null)[][] = [[
    "Sunday date", "Plan title", "Lesson title", "Bible passage", "Memory verse",
    "Order", "Type", "Section title", "Minutes", "Game", "Instructions", "Script", "Discussion questions", "Notes",
  ]];
  if (past.length === 0) pastRows.push(["(no earlier Sundays found)"]);
  for (const p of past) {
    if (p.sections.length === 0) {
      pastRows.push([p.itinerary.scheduled_date ?? "", p.itinerary.title, p.itinerary.lesson_title ?? "", p.itinerary.bible_passage ?? "", p.itinerary.memory_verse ?? ""]);
    }
    p.sections.forEach((s, i) => {
      pastRows.push([
        p.itinerary.scheduled_date ?? "", p.itinerary.title, p.itinerary.lesson_title ?? "", p.itinerary.bible_passage ?? "", p.itinerary.memory_verse ?? "",
        i + 1, SECTION_LABEL[s.section_type] ?? s.section_type, s.title, s.duration_minutes ?? "",
        s.section_type === "group_game" ? gameNameFromId(s.chosen_game) : "",
        s.instructions ?? "", s.script ?? "", s.discussion_questions ?? "", s.notes ?? "",
      ]);
    });
    pastRows.push([""]);
  }
  const pastSheet = XLSX.utils.aoa_to_sheet(pastRows);
  pastSheet["!cols"] = [{ wch: 12 }, { wch: 24 }, { wch: 20 }, { wch: 16 }, { wch: 30 }, { wch: 6 }, { wch: 16 }, { wch: 22 }, { wch: 8 }, { wch: 18 }, { wch: 50 }, { wch: 60 }, { wch: 60 }, { wch: 40 }];
  XLSX.utils.book_append_sheet(wb, pastSheet, SHEET_PAST);

  return XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
}

function exampleSections(): Section[] {
  const mk = (section_type: SectionType, title: string, duration_minutes: number, extra: Partial<Section> = {}): Section => ({
    id: "", itinerary_id: "", position: 0, title, section_type, start_time: null, duration_minutes,
    instructions: null, script: null, discussion_questions: null, notes: null, completed: false, chosen_game: null, completed_at: null, ...extra,
  });
  return [
    mk("free_hangout", "Free Hangout", 15, { instructions: "EXAMPLE ROW — replace. Welcome students as they arrive." }),
    mk("bible_reading", "Mark 4:1-20", 20, { instructions: "EXAMPLE ROW — replace.", script: "MARK 4:1-20\n\n1 Once again Jesus began teaching…", discussion_questions: "Say: …\n[expected answer]\n\nMean: …\n[expected answer]\n\nDo: …\n[expected answer]" }),
    mk("group_game", "Game", 10, { chosen_game: "bible_baseball", instructions: "EXAMPLE ROW — replace." }),
  ];
}

function gameNameFromId(id: string | null): string {
  if (!id || id === "pick_at_time") return "Pick during group";
  return GAMES.find((g) => g.id === id)?.label ?? id;
}

// ---------------------------------------------------------------------------
// Parse an uploaded workbook. Tolerant of case and stray whitespace; strict
// about sheet names and headers so a mangled file fails loudly.
// ---------------------------------------------------------------------------
const norm = (s: unknown) => String(s ?? "").trim().toLowerCase().replace(/\s+/g, " ");

function findSheet(names: string[], wanted: string): string | null {
  const n = norm(wanted);
  return names.find((x) => norm(x) === n) ?? names.find((x) => norm(x).startsWith(n.split(" ")[0])) ?? null;
}

function typeFromCell(v: unknown): SectionType | null {
  const n = norm(v).replace(/[^a-z ]/g, "");
  if (!n) return null;
  for (const [id, label] of Object.entries(SECTION_LABEL)) {
    if (norm(label).replace(/[^a-z ]/g, "") === n || id === n.replace(/ /g, "_")) return id as SectionType;
  }
  // Friendly aliases the AI might reach for.
  const alias: Record<string, SectionType> = {
    hangout: "free_hangout", "free hang out": "free_hangout", arrival: "free_hangout",
    "rules and reset": "rules", "rules reset": "rules", rules: "rules",
    verse: "memory_verse", "memory verse intro": "memory_verse",
    "verse check": "memory_verse_check", "memory verse recite": "memory_verse_check",
    reading: "bible_reading", "bible study": "bible_reading", passage: "bible_reading",
    game: "group_game", games: "group_game",
    scores: "score_recording", "score": "score_recording", summary: "score_recording",
    other: "custom", announcement: "custom", announcements: "custom",
  };
  return alias[n] ?? null;
}

function gameFromCell(v: unknown): string | null {
  const n = norm(v);
  if (!n || n.startsWith("pick") || n === "leader picks" || n === "tbd") return "pick_at_time";
  const g = GAMES.find((g) => norm(g.label) === n || g.id === n.replace(/ /g, "_"));
  if (g) return g.id;
  const loose = GAMES.find((g) => norm(g.label).includes(n) || n.includes(norm(g.label)));
  return loose ? loose.id : null;
}

function cellText(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).replace(/\r\n/g, "\n").trim();
  return s ? s : null;
}

export async function parseTemplate(buf: ArrayBuffer): Promise<ParsedPlan> {
  const XLSX = await import("xlsx");
  const errors: string[] = [];
  const warnings: string[] = [];
  const out: ParsedPlan = { itinerary: {}, sections: [], errors, warnings };

  let wb;
  try { wb = XLSX.read(buf, { type: "array" }); }
  catch { errors.push("That file could not be read as an Excel workbook."); return out; }

  const planName = findSheet(wb.SheetNames, SHEET_PLAN);
  const secName = findSheet(wb.SheetNames, SHEET_SECTIONS);
  if (!planName) errors.push(`Missing the '${SHEET_PLAN}' sheet.`);
  if (!secName) errors.push(`Missing the '${SHEET_SECTIONS}' sheet.`);
  if (!planName || !secName) return out;

  // Plan sheet: column A label, column B value.
  const planRows = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[planName], { header: 1, raw: false, defval: "" });
  for (const row of planRows) {
    const label = norm(row[0]);
    const value = row[1];
    const hit = PLAN_KEYS.find(([l]) => norm(l) === label || label.startsWith(norm(l).split(" (")[0]));
    if (!hit) continue;
    const key = hit[1];
    const text = cellText(value);
    if (key === "slot_minutes") {
      const n = text ? parseInt(text, 10) : NaN;
      if (text && Number.isNaN(n)) warnings.push(`Slot length '${text}' is not a number; left unchanged.`);
      else if (text) out.itinerary.slot_minutes = n;
    } else if (key === "scheduled_date") {
      if (text) {
        const m = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (m) out.itinerary.scheduled_date = `${m[1]}-${m[2]}-${m[3]}`;
        else {
          const d = new Date(text);
          if (!Number.isNaN(d.getTime())) out.itinerary.scheduled_date = d.toLocaleDateString("en-CA");
          else warnings.push(`Date '${text}' not understood; left unchanged.`);
        }
      }
    } else {
      (out.itinerary as any)[key] = text;
    }
  }

  // Sections sheet: header row then data rows.
  const rows = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[secName], { header: 1, raw: false, defval: "" });
  const headerIdx = rows.findIndex((r) => norm(r[0]) === "order" && norm(r[1]) === "type");
  if (headerIdx === -1) { errors.push(`The '${SHEET_SECTIONS}' sheet is missing its header row (Order, Type, Section title, ...).`); return out; }
  const header = rows[headerIdx].map(norm);
  const col = (name: string) => header.indexOf(norm(name));
  const cOrder = col("Order"), cType = col("Type"), cTitle = col("Section title"), cMin = col("Minutes"), cGame = col("Game"),
    cIns = col("Instructions"), cScr = col("Script"), cDisc = col("Discussion questions"), cNotes = col("Notes");
  if ([cType, cTitle, cMin].some((c) => c === -1)) { errors.push("Sections header must include Type, Section title, and Minutes."); return out; }

  type Row = ParsedPlan["sections"][number] & { order: number };
  const parsed: Row[] = [];
  rows.slice(headerIdx + 1).forEach((r, i) => {
    const rowNo = headerIdx + i + 2;
    const allBlank = r.every((c) => !cellText(c));
    if (allBlank) return;
    let type = typeFromCell(r[cType]);
    const title = cellText(r[cTitle]);
    if (!type && !title) return;
    if (!type) { warnings.push(`Row ${rowNo}: Type '${r[cType]}' not recognised; imported as Custom Section.`); type = "custom"; }
    const ins = cellText(cIns >= 0 ? r[cIns] : null);
    if (ins && /^example row/i.test(ins)) { warnings.push(`Row ${rowNo} still looks like an example row; skipped.`); return; }
    const minText = cellText(r[cMin]);
    const minutes = minText ? parseInt(minText, 10) : null;
    if (minText && Number.isNaN(minutes)) warnings.push(`Row ${rowNo}: Minutes '${minText}' is not a number; left blank.`);
    let chosen_game: string | null = null;
    if (type === "group_game") {
      chosen_game = gameFromCell(cGame >= 0 ? r[cGame] : "");
      if (chosen_game === null) { warnings.push(`Row ${rowNo}: game '${r[cGame]}' not recognised; set to 'Pick during group'.`); chosen_game = "pick_at_time"; }
    }
    const orderText = cellText(cOrder >= 0 ? r[cOrder] : null);
    const order = orderText && !Number.isNaN(parseInt(orderText, 10)) ? parseInt(orderText, 10) : parsed.length + 1;
    parsed.push({
      order,
      section_type: type,
      title: title ?? SECTION_LABEL[type],
      duration_minutes: Number.isNaN(minutes as number) ? null : minutes,
      chosen_game,
      instructions: ins,
      script: cellText(cScr >= 0 ? r[cScr] : null),
      discussion_questions: cellText(cDisc >= 0 ? r[cDisc] : null),
      notes: cellText(cNotes >= 0 ? r[cNotes] : null),
    });
  });
  parsed.sort((a, b) => a.order - b.order);
  out.sections = parsed.map(({ order: _o, ...s }) => s);
  if (out.sections.length === 0 && errors.length === 0) errors.push("No sections found on the Sections sheet.");
  return out;
}
