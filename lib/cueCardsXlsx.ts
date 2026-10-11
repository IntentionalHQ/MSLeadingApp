// Excel round-trip for cue card decks. Two sheets — one row per card, one row
// per bullet — so a person or an AI assistant can fill them in without fighting
// mixed row types. The Symbol and Highlight columns take the names from
// lib/cueCards.ts and are converted to icons on upload.
//
// The same sheets appear in two workbooks: a deck's own template (Cards tab)
// and, as extra sheets, the Sunday plan workbook (lib/planXlsx.ts).

import type { CueBullet, CueCard, CueDeck } from "./types";
import { CUE_COLORS, CUE_SYMBOLS, colorFromCell, colorToCell, newId, symbolsFromCell, symbolsToCell } from "./cueCards";

export type ParsedDeck = {
  deck: Partial<Pick<CueDeck, "title" | "passage" | "subtitle" | "notes" | "goal_minutes">>;
  cards: Array<Pick<CueCard, "title" | "scripture_ref" | "bullets" | "key_line" | "transition" | "notes">>;
  errors: string[];
  warnings: string[];
};

export const SHEET_DECK_README = "READ ME FIRST";
export const SHEET_DECK = "Deck";
export const SHEET_CARDS = "Cue Cards";
export const SHEET_BULLETS = "Card Bullets";
export const SHEET_DECK_REFERENCE = "Reference";

const DECK_KEYS = [
  ["Deck title", "title"],
  ["Passage", "passage"],
  ["Subtitle (e.g. Youth Group Message · 15-20 min)", "subtitle"],
  ["Goal time (minutes)", "goal_minutes"],
  ["Notes (about this message; editor only)", "notes"],
] as const;

export const CARD_HEADERS = ["Order", "Card title", "Scripture", "Key line", "Transition", "Notes"] as const;
export const BULLET_HEADERS = ["Card", "Order", "Bullet", "Symbol", "Highlight"] as const;

type XLSXModule = typeof import("xlsx");

// ---------------------------------------------------------------------------
// Instructions. Plain text rows; shared between the deck workbook and the
// cue-card section of the Sunday plan README.
// ---------------------------------------------------------------------------
export function cueCardInstructionRows(): string[] {
  return [
    "CUE CARDS (sheets 'Cue Cards' and 'Card Bullets')",
    "A cue card deck is what the leader preaches FROM. The devotional is what the leader prepares from. Each card is one section of the message, enough to speak naturally for 3-5 minutes without reading a script. The leader glances at a phone, recognises the section, and keeps talking.",
    "Cue cards only condense the approved devotional. The same content rules apply: nothing goes on a card that the leader has not said or approved. No new teaching points, illustrations, applications, or closing lines.",
    "",
    "  • Cue Cards sheet = one row per card, in speaking order.",
    "      Order: 1, 2, 3 ...",
    "      Card title: a conversational headline that tells the leader what this section is about in one glance. Not a topic label. E.g. 'Jairus Had Everything. The Woman Had Nothing. Both Needed Jesus.'",
    "      Scripture: the passage for this card, e.g. 'Mark 5:21-29'. Optional.",
    "      Key line: ONE memorable sentence the leader wants to land, in their words.",
    "      Transition: one short sentence that leads into the next card. On the last card this is the closing line.",
    "      Notes: optional, as long as needed. The full context of this card for the leader coming back to the message later: what the point was, the illustration in full, where it landed. Shown only on the deck editor Notes tab, never while presenting. Not a script.",
    "  • Card Bullets sheet = one row per memory trigger, 3-5 per card.",
    "      Card: the Order number of the card this bullet belongs to.",
    "      Order: 1, 2, 3 ... within that card.",
    "      Bullet: short. A name, a question, a picture, a number. 'Jairus: Status, influence, dying daughter.' Not a sentence to read aloud.",
    "      Symbol: optional. One or more of: " + CUE_SYMBOLS.map((s) => s.short).join(", ") + " (comma-separate for more than one). Blank = plain bullet.",
    "      Highlight: optional. One of: " + CUE_COLORS.filter((c) => c.id).map((c) => c.label).join(", ") + ". Blank = none.",
    "  • Symbols mean: Main idea = the point of the card; Action = something to tell students to do; Research = the leader wants to look this up; Trap = a wrong idea to warn against; No way = a surprising fact; Question = something students may not get; Quote = a line to say word for word (shown in italics).",
    "  • Use symbols and highlights sparingly — one or two per card. They are for the leader's eye on stage, not decoration.",
    "  • Each card must fit on a phone screen: at most 6 bullets, each under ~100 characters.",
    "  • Do not rename the sheets or the header rows. The upload looks for them by name.",
  ];
}

// ---------------------------------------------------------------------------
// Build: append the two sheets (plus Reference rows) to any workbook.
// ---------------------------------------------------------------------------
export function appendCueCardSheets(XLSX: XLSXModule, wb: any, cards: CueCard[]) {
  const cardRows: (string | number)[][] = [[...CARD_HEADERS]];
  const bulletRows: (string | number)[][] = [[...BULLET_HEADERS]];
  const src = cards.length ? cards : exampleCards();
  src.forEach((c, i) => {
    cardRows.push([i + 1, c.title, c.scripture_ref ?? "", c.key_line ?? "", c.transition ?? "", c.notes ?? ""]);
    c.bullets.forEach((b, j) => bulletRows.push([i + 1, j + 1, b.text, symbolsToCell(b.symbols), colorToCell(b.color)]));
  });
  const cs = XLSX.utils.aoa_to_sheet(cardRows);
  cs["!cols"] = [{ wch: 6 }, { wch: 60 }, { wch: 16 }, { wch: 60 }, { wch: 70 }, { wch: 80 }];
  XLSX.utils.book_append_sheet(wb, cs, SHEET_CARDS);
  const bs = XLSX.utils.aoa_to_sheet(bulletRows);
  bs["!cols"] = [{ wch: 6 }, { wch: 6 }, { wch: 70 }, { wch: 18 }, { wch: 10 }];
  XLSX.utils.book_append_sheet(wb, bs, SHEET_BULLETS);
}

export function cueCardReferenceRows(): string[][] {
  const rows: string[][] = [[""], ["CUE CARD SYMBOLS (use the exact name in the Symbol column)", "What it marks"]];
  const meaning: Record<string, string> = {
    star: "The main idea of the card.",
    arrow: "Something to tell students to do.",
    search: "The leader wants to look this up before Sunday.",
    hammer: "A wrong idea to warn against.",
    bang: "A surprising fact.",
    question: "Something students may not get; slow down here.",
    quote: "A line to say word for word (shown in italics).",
  };
  for (const s of CUE_SYMBOLS) rows.push([s.short, meaning[s.id]]);
  rows.push([""], ["CUE CARD HIGHLIGHTS (use the exact name in the Highlight column)", ""]);
  for (const c of CUE_COLORS) if (c.id) rows.push([c.label, ""]);
  return rows;
}

export async function buildDeckTemplate(deck: CueDeck, cards: CueCard[]): Promise<ArrayBuffer> {
  const XLSX = await import("xlsx");
  const wb = XLSX.utils.book_new();

  const readme = [
    "CUE CARD DECK — READ ME FIRST",
    "",
    "This workbook holds one cue card deck for MS Leading. Fill it in (yourself, or hand it to an AI assistant along with the approved devotional), then upload it back: Cards tab, open the deck, Excel Template, Upload completed template. Upload replaces every card in the deck.",
    "",
    "The leader is the teacher. An assistant condensing a devotional into cards is only an editor and organizer: every card title, bullet, key line, and transition must trace back to something the leader wrote or approved. Do not add teaching content.",
    "",
    "  • Deck = title, passage, subtitle. Fill column B.",
    ...cueCardInstructionRows(),
    "",
    "Before returning, check: 1) cards follow the order of the devotional  2) every bullet traces to the devotional  3) each key line is the leader's own wording  4) each transition leads naturally to the next card  5) no card has more than 6 bullets  6) sheet names and header rows unchanged. Delete the example rows. Return as .xlsx.",
  ];
  const rs = XLSX.utils.aoa_to_sheet(readme.map((s) => [s]));
  rs["!cols"] = [{ wch: 140 }];
  XLSX.utils.book_append_sheet(wb, rs, SHEET_DECK_README);

  const deckRows: (string | null)[][] = [["Field", "Value (fill this column)"]];
  for (const [label, key] of DECK_KEYS) deckRows.push([label, (deck as any)[key] ?? ""]);
  const ds = XLSX.utils.aoa_to_sheet(deckRows);
  ds["!cols"] = [{ wch: 44 }, { wch: 80 }];
  XLSX.utils.book_append_sheet(wb, ds, SHEET_DECK);

  appendCueCardSheets(XLSX, wb, cards);

  const ref = XLSX.utils.aoa_to_sheet(cueCardReferenceRows().slice(1));
  ref["!cols"] = [{ wch: 60 }, { wch: 80 }];
  XLSX.utils.book_append_sheet(wb, ref, SHEET_DECK_REFERENCE);

  return XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
}

function exampleCards(): CueCard[] {
  const mk = (text: string, symbols: CueBullet["symbols"] = [], color: CueBullet["color"] = ""): CueBullet => ({ id: newId(), text, symbols, color });
  return [{
    id: "", deck_id: "", position: 0,
    title: "EXAMPLE ROW — replace. Jairus Had Everything. The Woman Had Nothing. Both Needed Jesus.",
    scripture_ref: "Mark 5:21-29",
    bullets: [
      mk("Jairus: Status, influence, dying daughter."),
      mk("Question: \"Do I have what it takes?\"", ["question"]),
      mk("Woman: Twelve years, unclean, money gone.", [], "yellow"),
      mk("Faith: Falls at his feet / touches his robe.", ["star"]),
    ],
    key_line: "Two completely different lives. The same desperate need for Jesus.",
    transition: "She reaches out, touches his robe, and is healed. But what Jesus calls her next might be even more powerful.",
    notes: null,
    notes_stale: false,
  }];
}

// ---------------------------------------------------------------------------
// Parse. Returns null when the workbook has no cue card sheets at all (so the
// Sunday plan importer can treat them as optional).
// ---------------------------------------------------------------------------
const norm = (s: unknown) => String(s ?? "").trim().toLowerCase().replace(/\s+/g, " ");
const cellText = (v: unknown): string | null => { if (v == null) return null; const s = String(v).replace(/\r\n/g, "\n").trim(); return s ? s : null; };
const findSheet = (names: string[], wanted: string) => { const n = norm(wanted); return names.find((x) => norm(x) === n) ?? null; };
const num = (v: unknown): number | null => { const t = cellText(v); if (!t) return null; const n = parseInt(t, 10); return Number.isNaN(n) ? null : n; };

export function parseCueCardSheets(XLSX: XLSXModule, wb: any): ParsedDeck | null {
  const cardsName = findSheet(wb.SheetNames, SHEET_CARDS);
  const bulletsName = findSheet(wb.SheetNames, SHEET_BULLETS);
  if (!cardsName && !bulletsName) return null;
  const errors: string[] = [];
  const warnings: string[] = [];
  const out: ParsedDeck = { deck: {}, cards: [], errors, warnings };
  if (!cardsName) { errors.push(`Missing the '${SHEET_CARDS}' sheet.`); return out; }

  // Optional Deck sheet (deck workbook only).
  const deckName = findSheet(wb.SheetNames, SHEET_DECK);
  if (deckName) {
    const rows = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[deckName], { header: 1, raw: false, defval: "" });
    for (const row of rows) {
      const label = norm(row[0]);
      const hit = DECK_KEYS.find(([l]) => norm(l) === label || label.startsWith(norm(l).split(" (")[0]));
      if (!hit) continue;
      if (hit[1] === "goal_minutes") {
        const t = cellText(row[1]);
        const n = t ? parseInt(t, 10) : NaN;
        if (t && Number.isNaN(n)) warnings.push(`Goal time '${t}' is not a number; ignored.`);
        else if (t) out.deck.goal_minutes = n;
      } else {
        (out.deck as any)[hit[1]] = cellText(row[1]);
      }
    }
  }

  // Cards sheet.
  const rows = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[cardsName], { header: 1, raw: false, defval: "" });
  const hi = rows.findIndex((r) => norm(r[0]) === "order" && norm(r[1]).startsWith("card"));
  if (hi === -1) { errors.push(`The '${SHEET_CARDS}' sheet is missing its header row (Order, Card title, ...).`); return out; }
  const header = rows[hi].map(norm);
  const col = (name: string) => header.indexOf(norm(name));
  const cOrder = col("Order"), cTitle = col("Card title"), cRef = col("Scripture"), cKey = col("Key line"), cTrans = col("Transition"), cNotes = col("Notes");
  if (cTitle === -1) { errors.push("Cue Cards header must include 'Card title'."); return out; }

  type Row = ParsedDeck["cards"][number] & { order: number };
  const cards: Row[] = [];
  rows.slice(hi + 1).forEach((r, i) => {
    if (r.every((c) => !cellText(c))) return;
    const title = cellText(r[cTitle]);
    if (title && /^example row/i.test(title)) { warnings.push(`Cue Cards row ${hi + i + 2} still looks like an example row; skipped.`); return; }
    const order = num(cOrder >= 0 ? r[cOrder] : null) ?? cards.length + 1;
    cards.push({
      order,
      title: title ?? "",
      scripture_ref: cellText(cRef >= 0 ? r[cRef] : null),
      bullets: [],
      key_line: cellText(cKey >= 0 ? r[cKey] : null),
      transition: cellText(cTrans >= 0 ? r[cTrans] : null),
      notes: cellText(cNotes >= 0 ? r[cNotes] : null),
    });
  });
  cards.sort((a, b) => a.order - b.order);
  // Only example rows or blanks: treat the sheets as absent (the Sunday plan
  // workbook always carries them).
  if (cards.length === 0) return null;

  // Bullets sheet.
  if (bulletsName) {
    const brows = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[bulletsName], { header: 1, raw: false, defval: "" });
    const bhi = brows.findIndex((r) => norm(r[0]) === "card" && norm(r[1]) === "order");
    if (bhi === -1) {
      warnings.push(`The '${SHEET_BULLETS}' sheet is missing its header row (Card, Order, Bullet, ...); cards imported without bullets.`);
    } else {
      const bh = brows[bhi].map(norm);
      const bcol = (name: string) => bh.indexOf(norm(name));
      const bCard = bcol("Card"), bOrder = bcol("Order"), bText = bcol("Bullet"), bSym = bcol("Symbol"), bColor = bcol("Highlight");
      const grouped: Record<number, Array<{ order: number; bullet: CueBullet }>> = {};
      brows.slice(bhi + 1).forEach((r, i) => {
        if (r.every((c) => !cellText(c))) return;
        const rowNo = bhi + i + 2;
        const text = cellText(bText >= 0 ? r[bText] : null);
        if (!text) return;
        const cardNo = num(r[bCard]);
        if (cardNo === null || !cards.some((c) => c.order === cardNo)) { warnings.push(`Card Bullets row ${rowNo}: Card '${r[bCard]}' does not match a card Order; skipped.`); return; }
        const { symbols, unknown } = symbolsFromCell(bSym >= 0 ? r[bSym] : "");
        if (unknown.length) warnings.push(`Card Bullets row ${rowNo}: symbol '${unknown.join(", ")}' not recognised; left plain.`);
        let color = colorFromCell(bColor >= 0 ? r[bColor] : "");
        if (color === null) { warnings.push(`Card Bullets row ${rowNo}: highlight '${r[bColor]}' not recognised; left blank.`); color = ""; }
        (grouped[cardNo] ??= []).push({ order: num(bOrder >= 0 ? r[bOrder] : null) ?? 999, bullet: { id: newId(), text, symbols, color } });
      });
      for (const c of cards) {
        const list = (grouped[c.order] ?? []).sort((a, b) => a.order - b.order).map((x) => x.bullet);
        c.bullets = list;
        if (list.length > 6) warnings.push(`Card ${c.order} has ${list.length} bullets; more than 6 will not fit on a phone.`);
      }
    }
  } else {
    warnings.push(`No '${SHEET_BULLETS}' sheet; cards imported without bullets.`);
  }

  out.cards = cards.map(({ order: _o, ...c }) => c);
  return out;
}

export async function parseDeckTemplate(buf: ArrayBuffer): Promise<ParsedDeck> {
  const XLSX = await import("xlsx");
  let wb;
  try { wb = XLSX.read(buf, { type: "array" }); }
  catch { return { deck: {}, cards: [], errors: ["That file could not be read as an Excel workbook."], warnings: [] }; }
  return parseCueCardSheets(XLSX, wb) ?? { deck: {}, cards: [], errors: [`No cards found on the '${SHEET_CARDS}' sheet (or the sheet is missing).`], warnings: [] };
}
