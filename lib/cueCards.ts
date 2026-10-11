// Cue card decks: symbol + highlight palette for bullets, bullet helpers, and
// the label <-> id mapping the Excel template uses. The symbol ids, labels, and
// highlight rgba values are copied from the notes editor in the leader's other
// app (task-os, src/lib/note-lines.ts) so the two feel the same; keep them in
// sync by hand when one changes.

import { AlertCircle, ArrowRight, Hammer, HelpCircle, Quote, Search, Star, type LucideIcon } from "lucide-react";
import type { CueBullet, CueCard, CueColor, CueSymbol } from "./types";

export const CUE_SYMBOLS: { id: CueSymbol; label: string; short: string; icon: LucideIcon }[] = [
  { id: "star", label: "Main idea", short: "Main idea", icon: Star },
  { id: "arrow", label: "Action item", short: "Action", icon: ArrowRight },
  { id: "search", label: "Research further", short: "Research", icon: Search },
  { id: "hammer", label: "Trap — don't believe it", short: "Trap", icon: Hammer },
  { id: "bang", label: "No way, didn't know that", short: "No way", icon: AlertCircle },
  { id: "question", label: "I don't get it", short: "Question", icon: HelpCircle },
  { id: "quote", label: "Quote / hard line", short: "Quote", icon: Quote },
];
export const CUE_SYMBOLS_BY_ID: Record<CueSymbol, (typeof CUE_SYMBOLS)[number]> =
  Object.fromEntries(CUE_SYMBOLS.map((s) => [s.id, s])) as any;

// Semi-transparent so the same value reads on the dark card background and
// stays legible under stage lighting without a second palette.
export const CUE_COLORS: { id: CueColor; label: string; bg: string }[] = [
  { id: "", label: "None", bg: "transparent" },
  { id: "yellow", label: "Yellow", bg: "rgba(250, 204, 21, 0.22)" },
  { id: "green", label: "Green", bg: "rgba(34, 197, 94, 0.20)" },
  { id: "blue", label: "Blue", bg: "rgba(59, 130, 246, 0.20)" },
  { id: "pink", label: "Pink", bg: "rgba(236, 72, 153, 0.20)" },
  { id: "purple", label: "Purple", bg: "rgba(168, 85, 247, 0.22)" },
  { id: "orange", label: "Orange", bg: "rgba(249, 115, 22, 0.22)" },
];

export function colorBg(color: CueColor): string {
  return CUE_COLORS.find((c) => c.id === color)?.bg ?? "transparent";
}

/** Solid version of a highlight colour, for card edges and bars. */
export function colorSolid(color: CueColor): string | null {
  const c = CUE_COLORS.find((x) => x.id && x.id === color);
  return c ? c.bg.replace(/0\.2\d\)/, "0.9)") : null;
}

export function newId(prefix = "b"): string {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${prefix}-${Math.random().toString(36).slice(2)}-${Date.now()}`;
}

export function newBullet(text = "", symbols: CueSymbol[] = [], color: CueColor = ""): CueBullet {
  return { id: newId("b"), text, symbols: [...symbols], color };
}

/** Bullets come back from Postgres as jsonb; make sure every row is well-formed. */
export function normalizeBullets(raw: unknown): CueBullet[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((b: any) => ({
    id: typeof b?.id === "string" && b.id ? b.id : newId("b"),
    text: typeof b?.text === "string" ? b.text : "",
    symbols: Array.isArray(b?.symbols) ? b.symbols.filter((s: any) => s in CUE_SYMBOLS_BY_ID) : [],
    color: CUE_COLORS.some((c) => c.id === b?.color) ? b.color : "",
  }));
}

export function normalizeCard(row: any): CueCard {
  return {
    ...row,
    bullets: normalizeBullets(row?.bullets),
    notes_stale: !!row?.notes_stale,
    color: CUE_COLORS.some((c) => c.id && c.id === row?.color) ? row.color : "",
  };
}

// ---------------------------------------------------------------------------
// Excel: the Symbol and Highlight columns take the names above. Tolerant of
// case, punctuation, and the short forms people reach for.
// ---------------------------------------------------------------------------
const norm = (s: unknown) => String(s ?? "").trim().toLowerCase().replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ");

const SYMBOL_ALIASES: Record<string, CueSymbol> = {
  "main idea": "star", star: "star", main: "star", idea: "star", key: "star",
  "action item": "arrow", action: "arrow", arrow: "arrow", "do": "arrow", todo: "arrow",
  "research further": "search", research: "search", search: "search", "look up": "search", lookup: "search",
  "trap dont believe it": "hammer", trap: "hammer", hammer: "hammer", "dont believe it": "hammer", warning: "hammer",
  "no way didnt know that": "bang", "no way": "bang", bang: "bang", wow: "bang", "didnt know": "bang", "didnt know that": "bang",
  "i dont get it": "question", "dont get it": "question", question: "question", unclear: "question", confused: "question",
  "quote hard line": "quote", quote: "quote", "hard line": "quote", line: "quote",
};

export function symbolFromCell(v: unknown): CueSymbol | null {
  const n = norm(v);
  if (!n) return null;
  return SYMBOL_ALIASES[n] ?? null;
}

/** "Main idea, Quote" -> { symbols: ["star","quote"], unknown: [] } */
export function symbolsFromCell(v: unknown): { symbols: CueSymbol[]; unknown: string[] } {
  const symbols: CueSymbol[] = [];
  const unknown: string[] = [];
  for (const part of String(v ?? "").split(/[,;/|+]/)) {
    if (!part.trim()) continue;
    const s = symbolFromCell(part);
    if (s && !symbols.includes(s)) symbols.push(s);
    else if (!s) unknown.push(part.trim());
  }
  return { symbols, unknown };
}

export function colorFromCell(v: unknown): CueColor | null {
  const n = norm(v);
  if (!n || n === "none" || n === "no" || n === "clear") return "";
  const hit = CUE_COLORS.find((c) => c.id && norm(c.label) === n);
  return hit ? hit.id : null;
}

export function symbolsToCell(symbols: CueSymbol[]): string {
  return symbols.map((s) => CUE_SYMBOLS_BY_ID[s]?.short ?? s).join(", ");
}

export function colorToCell(color: CueColor): string {
  return color ? CUE_COLORS.find((c) => c.id === color)?.label ?? "" : "";
}

/** Bullets with text; a row the leader added but never typed in is ignored everywhere but the editor. */
export function filledBullets(bullets: CueBullet[]): CueBullet[] {
  return bullets.filter((b) => b.text.trim());
}

/** A quiet note for the editor when a card is long enough that its bullets will scroll on a phone. Not a limit: the presenter scrolls the bullets and keeps the Last point / Transition / Up next pinned. */
export function cardFitWarning(card: Pick<CueCard, "title" | "bullets" | "key_line" | "transition">): string | null {
  const bullets = filledBullets(card.bullets);
  const bulletChars = bullets.reduce((a, b) => a + b.text.length, 0);
  const lines = bullets.reduce((a, b) => a + b.text.split("\n").length, 0);
  if (bullets.length > 6 || lines > 8 || bulletChars > 450) {
    return "Long card: on a phone the bullets will scroll (with a ⌄ more hint) while the Last point and Transition stay pinned.";
  }
  return null;
}
