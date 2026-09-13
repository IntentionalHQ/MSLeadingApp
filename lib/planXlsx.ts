// Excel plan template: download a workbook a person or an assistant can fill
// in, then upload it back to replace the Sunday's outline. The uploaded file
// is parsed in the browser and never stored anywhere.

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
// instructions say not to rename them.
// ---------------------------------------------------------------------------
export const SHEET_README = "READ ME FIRST";
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
// The instructions sheet. Plain text, one idea per row, because spreadsheet
// cells don't render markdown.
// ---------------------------------------------------------------------------
function readmeRows(planDate: string): string[][] {
  const L: string[] = [
    "MIDDLE SCHOOL SUNDAY PLAN — READ ME FIRST",
    "",
    "This workbook is both the Sunday plan template and the handoff document for future planning. It holds enough instructions, recent history, and examples that the leader can upload it into a completely new chat (or hand it to a co-leader) and keep planning without explaining the normal process again. The workbook is the memory of the system, not the chat.",
    "",
    "When it is filled in, upload it back into MS Leading (Edit a Sunday, then Excel Template, then Upload completed template) and the app builds the outline from it.",
    "",
    "PURPOSE",
    "One Sunday morning middle-school Bible lesson. The leader normally works through a Bible book in order. The goal is not a polished curriculum or a heavily scripted classroom lesson. The goal is to help the leader disciple middle-school students through Scripture in a simple, conversational way.",
    "",
    "WHAT IS IN THIS WORKBOOK",
    "  • Plan = the header for the Sunday: title, date, start time, slot length, lesson, passage, memory verse. Fill column B.",
    "  • Sections = the outline, one row per section in the order they happen. This is the main sheet.",
    "  • Reference = the section types and games the app understands, and what each column is for.",
    "  • Past 4 Sundays = the last four outlines that were actually used, newest first. This is the source of continuity: where the group left off, normal timing, recurring wording, and the leader's teaching style.",
    "",
    "READ BEFORE PLANNING (for an assistant, human or AI)",
    "  1. Read the entire workbook.",
    "  2. Check the Plan sheet.",
    "  3. Check the current Sections sheet. Anything there is the current draft.",
    "  4. Review Past 4 Sundays for where the group left off in Scripture, normal timing, recurring wording, and the leader's style.",
    "  5. Preserve the existing workbook structure.",
    "Do not immediately rebuild or fill the workbook. Plan the lesson with the leader in conversation first.",
    "",
    "WHEN STARTING A NEW CHAT",
    "Open by briefly identifying: where the group left off, the likely next passage, and which sections probably need to change. Do not make the leader re-explain the weekly process unless something in the workbook is unclear. Infer the defaults from the workbook and ask only what you genuinely need.",
    "",
    "DEFAULT WEEKLY STRUCTURE",
    "Most weeks: 1) Free Hangout  2) Rules / Reset  3) Bible Reading  4) Devotional  5) Discussion  6) Prayer  7) Group Game.",
    "Free Hangout, Rules / Reset, Prayer, and the overall structure usually stay the same. Do not rewrite recurring sections unless the leader asks.",
    "The sections that normally change each week are Bible Reading, Devotional, Discussion, and the passage / lesson fields on the Plan sheet.",
    "Memory Verse is optional. Do not add one unless the leader wants one. If the leader will choose the game later in the app, put 'Pick during group' in the Game column.",
    "",
    "PLANNING WORKFLOW",
    "Work through the lesson conversationally. Do not try to finish the whole outline in one response unless the leader asks. A normal flow:",
    "  1. Confirm the passage.",
    "  2. Let the leader talk through their thoughts and interpretation.",
    "  3. Help organize those thoughts without replacing their voice.",
    "  4. Build the Devotional.",
    "  5. Build the Discussion questions.",
    "  6. Confirm there is enough information.",
    "  7. Fill the workbook only when the leader says to.",
    "While the leader is still brainstorming, keep track of their ideas rather than repeatedly rewriting the spreadsheet.",
    "",
    "THE LEADER CONTROLS THE TEACHING. The leader decides what the students hear.",
    "An assistant should: organize the leader's thoughts; tighten unclear wording; point out factual or textual problems briefly when necessary; suggest useful Scripture connections; help simplify ideas for middle-school students; preserve the leader's theology and intended emphasis when it is a reasonable interpretation of the passage.",
    "If something seems inaccurate, say so once and explain why briefly, then follow the leader's final decision unless doing so would require fabricating Scripture.",
    "Do not quietly introduce theological conclusions, applications, or interpretations the leader did not approve. When there is more than one reasonable reading, offer the options and ask which to teach rather than picking one. Do not push a denominational, political, or personal position. Nothing goes into the file until the leader has seen it and said yes.",
    "",
    "BIBLE READING SECTION",
    "  • Section title: the passage, e.g. 'Mark 4:21-34'.",
    "  • Instructions: students read the passage aloud. Choose readers in whatever division makes sense for the passage. Have each student come up front to read so the room can hear them and the others stay engaged. After a student finishes, thank them for boldly reading Scripture in front of the group. Then transition directly into the Devotional.",
    "  • Script: the FULL passage text, with the reference in capitals first (e.g. 'MARK 4:21-34') and verse numbers kept. Use the translation the leader supplies; NLT has normally been used. The app shows this large on the leading screen while a student reads.",
    "  • Do not add teaching commentary to the Bible Reading section.",
    "",
    "DEVOTIONAL SECTION (two layers of the same devotional)",
    "  • Notes = what the leader glances at while teaching. Short, scannable, mostly bullets, broken up by passage section with verse markers like V21-23, V24-25, V26-29. Detailed enough to remind the leader what point comes next, never full paragraphs. The leader should be able to glance down, find their place, and keep talking naturally. The app shows Notes at the top of the leading screen for this section.",
    "  • Script = the complete devotional written in the leader's natural speaking voice. Conversational, not academic. Simple language for middle-school students. Preserve the leader's illustrations and phrasing. Include verse markers such as (V21-23) throughout so students can follow in their Bibles. Explain what the passage says, what it means, and what students should do with it. Use other Scripture connections only when the leader has approved them. Short paragraphs that are easy to read aloud. The Script can be longer than the Notes.",
    "",
    "DISCUSSION SECTION",
    "Discussion is not primarily a quiz. The main goal is to get students talking about Scripture and use their observations as opportunities for discipleship.",
    "  • Instructions: always begin with 'What stood out to you in that?' Get several students to answer. Treat sincere answers seriously. When a student notices something: ask natural follow-ups, help them explain what they mean, connect it to other Scripture when useful, encourage them for engaging with the Bible, correct gently if something is clearly wrong, and let a good conversation continue even if it leaves the prepared list. The leader does NOT need to finish every prepared question.",
    "  • Discussion questions: backup tools in case 'What stood out to you?' does not generate enough conversation. Organize them as SAY (what does the passage actually say), MEAN (what is Jesus / the author teaching), DO (what should we do with this). A few for each major passage section, natural for middle-school students. Expected answers in [brackets] are short and reflect either something directly visible in the passage or an interpretation the leader has already approved. Do not make it feel like a test.",
    "",
    "STYLE",
    "Write for a volunteer leader looking at a phone while talking to middle-school students. Use short paragraphs, short instructions, clear section breaks, natural language, minimal jargon. Avoid long academic explanations, curriculum-sounding language, overly formal wording, over-scripted discussion, walls of text in Notes, and inventing applications the leader did not discuss. No markdown symbols; plain text with line breaks.",
    "",
    "CONTINUITY BETWEEN WEEKS",
    "Pay attention to the previous Sunday. When useful: briefly recap last week, connect the new passage to what students already heard, reuse established language or illustrations, and let ideas build over several weeks rather than forcing every theme into one lesson. If a passage is too large to teach well in one week, split it across Sundays so students have time to sit with the ideas.",
    "",
    "EDITING THE WORKBOOK",
    "Only after the leader has approved the lesson content. Use this same workbook, same sheet names, same columns, no new sheets, no merged cells or formatting tricks. Update the Plan sheet and the Bible Reading, Devotional, and Discussion rows. Leave recurring sections as they are unless instructed. Leave Memory verse blank if there is none. Make the section minutes add up to the slot length on the Plan sheet. Delete any example rows. Return as .xlsx.",
    "Before returning, check: 1) passage is correct  2) full passage text is in Bible Reading Script  3) Devotional Notes match the approved devotional  4) Devotional Script has verse markers  5) Discussion instructions begin with 'What stood out to you in that?'  6) Say / Mean / Do questions are backups, not the main method  7) recurring sections preserved  8) no unapproved teaching content  9) timing totals correctly  10) structure and sheet names preserved. Then list what changed from the current draft and confirm each item was approved.",
    "",
    "VALUES THE APP ACCEPTS (full lists on the Reference sheet)",
    "  • Type must be one of: " + Object.values(SECTION_LABEL).join(", ") + ".",
    "  • Game is only used when Type is 'Group Game'. Use the game name from the Reference sheet, or 'Pick during group'.",
    "  • Minutes is a whole number. Order is 1, 2, 3, ...",
    "  • Date is YYYY-MM-DD. Start time looks like 11:00 AM.",
    "  • Do not rename the sheets, the column A labels on Plan, or the header row on Sections. The upload looks for them by name.",
    "",
    `Generated on ${planDate}. Past 4 Sundays holds the four outlines dated before this plan's date.`,
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
    bible_reading: "Students read the passage aloud. The full passage text goes in Script. No teaching here.",
    devotional: "The leader teaches. Notes = glance-down bullets with verse markers; Script = the full read-aloud version.",
    discussion: "Open with 'What stood out to you in that?' Say / Mean / Do questions are the backup.",
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
  // Friendly aliases people reach for.
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
