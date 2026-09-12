# UI Overhaul Plan: Outline Maker + App-wide Polish

Audience: an implementing agent (Opus 4.8). Read this whole file before writing code.
Everything below is prescriptive. Where a choice is open, the default is stated; take it.

The work is split into **two workstreams that touch disjoint files** so two sessions can run
at the same time on two branches. A tiny **Step 0** must land on `main` first because both
workstreams import from it.

```
Step 0 (main, ~10 min)  ->  Workstream A: Outline Maker + Leading screen   (branch: feat/outline-maker)
                        ->  Workstream B: App-wide navigation + polish     (branch: feat/app-polish)
```

Merge order: A first, then B (B has the smaller diff and rebases cleanly). Neither branch may
edit a file owned by the other. The ownership table is in the "File ownership" section at the end.

---

## Project conventions (both workstreams)

- Next.js 16 app router, React 19, Tailwind 3, Supabase JS v2. **No new npm dependencies.**
- Every page is `"use client"`. Data is loaded in `useEffect` with the anon Supabase client from
  `@/lib/supabase`. Keep that pattern; do not introduce server components or server actions.
- Colors are hard-coded hex Tailwind arbitrary values. Use exactly these tokens so new UI matches:
  - page bg `#0b1220`, card bg `#121a2b`, border `#1f2a44`, hover border/bg `#28345a`,
    input border `#2a3654`, muted text `#9fb0d3`, body text `#e6ecf5`, primary `#3b82f6`.
- Reuse the CSS classes in `app/globals.css`: `.card`, `.btn`, `.btn-primary`, `.btn-ghost`,
  `.btn-danger`, `.btn-lg`. Inputs, textareas, selects and labels are styled globally; do not
  add per-element styling for them unless overriding width.
- Touch targets: every tappable thing is at least 44px tall (the `.btn` class already does this).
- Persist writes with the plain client for reads and ordinary writes. Use `safeInsert` /
  `safeUpdate` / `safeDelete` from `@/lib/supabase` only where the existing code already does
  (score bar). Do not convert other writes to the offline queue in this work.
- Never use `window.confirm` or `alert` in new code. Use the `<Confirm>` component from Step 0
  and inline status text (`Saved ✓`, `Saving…`) instead.
- Dates: never call `new Date().toISOString().slice(0,10)` for a "today" value. Use
  `todayLocal()` from `@/lib/dates` (Step 0). The ISO version is UTC and is wrong in the evening
  in US time zones.
- Section and itinerary field saves are **save-on-blur** with a small saved indicator. Not on
  every keystroke. Pattern is spelled out in Workstream A, Task A2.
- TypeScript strict-ish: the repo uses `as any` in places; do not add more. Type Supabase rows
  with the types in `lib/types.ts`.
- Commit in small steps with the message format used in the repo (imperative one-liner) and end
  each commit with `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.
- Verify in the browser via the `ms-leading-dev` launch config (`.claude/launch.json`). Run
  `npm run build` before declaring a task done; it must pass with zero type errors.

---

## Step 0: shared foundation (land on `main` before branching)

Create three files. Nothing else changes in Step 0.

### 0.1 `lib/dates.ts`

```ts
// Local-time date helpers. The app runs on a leader's phone in one time zone;
// all "today" logic must use local time, never UTC (toISOString is UTC).

/** YYYY-MM-DD in the browser's local time zone. */
export function todayLocal(): string {
  return new Date().toLocaleDateString("en-CA");
}

/** Parse "10:30 AM" / "10:30" / "9:05 pm" into minutes since midnight, or null. */
export function parseClock(s: string | null | undefined): number | null {
  if (!s) return null;
  const m = s.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*([ap]m?)?$/i);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const min = m[2] ? parseInt(m[2], 10) : 0;
  const ap = m[3]?.toLowerCase();
  if (h > 23 || min > 59) return null;
  if (ap?.startsWith("p") && h < 12) h += 12;
  if (ap?.startsWith("a") && h === 12) h = 0;
  return h * 60 + min;
}

/** Minutes since midnight -> "10:30 AM". */
export function formatClock(mins: number): string {
  const total = ((mins % 1440) + 1440) % 1440;
  const h24 = Math.floor(total / 60);
  const m = total % 60;
  const ap = h24 >= 12 ? "PM" : "AM";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${ap}`;
}
```

### 0.2 `components/Confirm.tsx`

An inline, two-tap destructive confirmation. Replaces `window.confirm`. It renders the trigger
button; on tap it swaps itself for `[Yes, delete] [Cancel]` in place, and auto-reverts after 4s.

```tsx
"use client";
import { useEffect, useState } from "react";

export default function Confirm({
  label, confirmLabel = "Yes, delete", onConfirm, className = "btn btn-ghost", title,
}: {
  label: React.ReactNode;          // what the idle button shows, e.g. "🗑"
  confirmLabel?: string;
  onConfirm: () => void | Promise<void>;
  className?: string;              // classes for the idle button
  title?: string;                  // aria-label / tooltip for icon-only buttons
}) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 4000);
    return () => clearTimeout(t);
  }, [armed]);

  if (!armed) {
    return <button type="button" onClick={() => setArmed(true)} className={className} aria-label={title} title={title}>{label}</button>;
  }
  return (
    <span className="inline-flex gap-1">
      <button type="button" onClick={async () => { await onConfirm(); setArmed(false); }} className="btn btn-danger">{confirmLabel}</button>
      <button type="button" onClick={() => setArmed(false)} className="btn btn-ghost">Cancel</button>
    </span>
  );
}
```

### 0.3 `components/PageHeader.tsx`

Every sub-page gets the same header: optional back link on the left, title, optional right slot.

```tsx
import Link from "next/link";

export default function PageHeader({
  title, subtitle, backHref, backLabel = "Back", right,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  backHref?: string;
  backLabel?: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3 mb-1">
      <div className="min-w-0">
        {backHref && (
          <Link href={backHref} className="inline-flex items-center gap-1 text-sm text-[#9fb0d3] hover:text-[#e6ecf5] mb-1">
            <span aria-hidden>←</span>{backLabel}
          </Link>
        )}
        <h1 className="truncate">{title}</h1>
        {subtitle && <div className="text-xs text-[#9fb0d3] mt-0.5">{subtitle}</div>}
      </div>
      {right && <div className="flex flex-wrap gap-2 justify-end shrink-0">{right}</div>}
    </div>
  );
}
```

Commit Step 0 as one commit: `Add shared date helpers, Confirm and PageHeader components`.
Then create both branches from that commit.

---

## Workstream A: Outline Maker + Leading screen

Branch `feat/outline-maker`. Owns: `lib/types.ts`, `lib/schedule.ts` (new),
`components/outline/**` (new), `app/itineraries/new/page.tsx`, `app/itineraries/[id]/edit/page.tsx`,
`app/itineraries/[id]/lead/page.tsx`, `app/itineraries/[id]/verse/page.tsx`,
`app/itineraries/[id]/games/**/page.tsx` (route wrappers only, NOT `components/games/**`),
`app/itineraries/[id]/baseball/page.tsx`, `supabase/v13_outline.sql` (new).

Do tasks in order. Each task is one commit.

### A1. Migration + types

Create `supabase/v13_outline.sql`. Safe to re-run.

```sql
-- v13: outline maker timeline + lead-session tracking
alter table itineraries add column if not exists start_time text;      -- "10:30 AM", null = no timeline
alter table itineraries add column if not exists slot_minutes int;      -- length of the group slot, e.g. 60
alter table itineraries add column if not exists led_at timestamptz;    -- when the leader last pressed Start
alter table itinerary_sections add column if not exists completed_at timestamptz;
```

Run it with `npm run db:run supabase/v13_outline.sql` (needs `DATABASE_URL` in `.env.local`; if
absent, tell the user to run the file in the Supabase SQL editor and continue, since the app must
tolerate the columns being null anyway).

In `lib/types.ts`:
- Add to `Itinerary`: `start_time: string | null; slot_minutes: number | null; led_at: string | null;`
- Add to `Section`: `completed_at: string | null;`
- Add the palette definition used by the editor. Keep `SECTION_LABEL` and `SECTION_ICON` as they
  are (other files import them) and add:

```ts
/** Defaults used when a section is inserted from the palette. */
export const SECTION_DEFAULTS: Record<SectionType, { title: string; duration: number }> = {
  free_hangout: { title: "Free Hangout", duration: 8 },
  rules: { title: "Rules / Reset", duration: 4 },
  memory_verse: { title: "Memory Verse", duration: 5 },
  memory_verse_check: { title: "Memory Verse Check", duration: 8 },
  bible_reading: { title: "Bible Reading", duration: 10 },
  discussion: { title: "Discussion", duration: 15 },
  prayer: { title: "Prayer", duration: 5 },
  group_game: { title: "Group Game", duration: 20 },
  score_recording: { title: "Score Recording", duration: 3 },
  custom: { title: "New Section", duration: 5 },
};

/** Order the palette chips are shown in (the natural flow of a Sunday). */
export const SECTION_PALETTE_ORDER: SectionType[] = [
  "free_hangout", "rules", "memory_verse", "memory_verse_check", "bible_reading",
  "discussion", "prayer", "group_game", "score_recording", "custom",
];

/** Which detail fields each type shows in the editor. */
export const SECTION_FIELDS: Record<SectionType, Array<"instructions" | "script" | "discussion_questions" | "notes">> = {
  free_hangout: ["notes"],
  rules: ["script", "notes"],
  memory_verse: ["script", "notes"],
  memory_verse_check: ["instructions", "notes"],
  bible_reading: ["instructions", "notes"],
  discussion: ["discussion_questions", "notes"],
  prayer: ["script", "notes"],
  group_game: ["instructions", "notes"],
  score_recording: ["notes"],
  custom: ["instructions", "script", "discussion_questions", "notes"],
};
```

Build must pass. Commit: `Add v13 outline columns and section palette metadata`.

### A2. `lib/schedule.ts` and the save-on-blur hook

**`lib/schedule.ts`** (pure functions, no React):

```ts
import type { Section } from "./types";
import { parseClock, formatClock } from "./dates";

export type TimelineRow = { section: Section; startMin: number | null; endMin: number | null };

/** Compute each section's start from the itinerary start time + cumulative durations. */
export function buildTimeline(startTime: string | null, sections: Section[]): TimelineRow[] {
  let cursor = parseClock(startTime);
  return sections.map((section) => {
    const dur = section.duration_minutes ?? 0;
    const startMin = cursor;
    const endMin = cursor === null ? null : cursor + dur;
    if (cursor !== null) cursor += dur;
    return { section, startMin, endMin };
  });
}

export function totalMinutes(sections: Section[]): number {
  return sections.reduce((a, s) => a + (s.duration_minutes ?? 0), 0);
}

/** "10:30 AM – 11:25 AM · 55 min" or "55 min" when no start time. */
export function timelineSummary(startTime: string | null, sections: Section[]): string {
  const total = totalMinutes(sections);
  const start = parseClock(startTime);
  if (start === null) return `${total} min`;
  return `${formatClock(start)} – ${formatClock(start + total)} · ${total} min`;
}
```

**`components/outline/useBlurSave.ts`**: a hook that gives every editable field the same
behavior: local state while typing, write on blur only if changed, show a transient "Saved ✓".

```ts
"use client";
import { useCallback, useEffect, useRef, useState } from "react";

export type SaveState = "idle" | "saving" | "saved" | "error";

/** Shared "Saved ✓" indicator state for a page. Call `track(promise)` around any write. */
export function useSaveState() {
  const [state, setState] = useState<SaveState>("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const track = useCallback(async <T,>(p: Promise<{ error: unknown } | T>) => {
    setState("saving");
    try {
      const r: any = await p;
      if (r && r.error) throw r.error;
      setState("saved");
    } catch {
      setState("error");
    }
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setState("idle"), 1800);
  }, []);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  return { state, track };
}
```

And a small presentational `components/outline/SaveIndicator.tsx`:

```tsx
import type { SaveState } from "./useBlurSave";
export default function SaveIndicator({ state }: { state: SaveState }) {
  if (state === "idle") return null;
  const text = state === "saving" ? "Saving…" : state === "saved" ? "Saved ✓" : "Save failed — retry";
  const cls = state === "error" ? "text-red-400" : "text-[#9fb0d3]";
  return <span className={`text-xs ${cls}`} aria-live="polite">{text}</span>;
}
```

Field pattern to use everywhere in the editor (do not deviate):

```tsx
<input
  defaultValue={s.title}
  onBlur={(e) => { if (e.target.value !== s.title) patchSection(s.id, { title: e.target.value }); }}
/>
```

`defaultValue` + `onBlur` keeps typing local. `patchSection` updates React state optimistically
and then calls `track(supabase.from(...).update(...))`. Because rows are keyed by `id` and inputs
use `defaultValue`, add `key={s.id + ":" + s.section_type}` on the section's detail block so a
type change remounts the fields with fresh defaults.

Commit: `Add schedule helpers and save-on-blur hook`.

### A3. Rewrite the editor: `app/itineraries/[id]/edit/page.tsx`

Split into the page plus three components in `components/outline/`:

- `SectionRow.tsx`: one collapsed/expanded section.
- `SectionPalette.tsx`: the typed "add" chips.
- `TimelineFooter.tsx`: the sticky total line.

**Page layout, top to bottom:**

1. `PageHeader` with `backHref="/itineraries"`, `backLabel="Sundays"`, title = itinerary title,
   subtitle = `timelineSummary(it.start_time, sections)`, right = a single `btn btn-primary`
   link `▶ Lead` to `/itineraries/${id}/lead`, plus an overflow menu button `⋯` (`btn btn-ghost`).
   The overflow menu is a simple absolutely-positioned card (no library) with three items:
   - `Save as template…` opens an inline prompt card asking for a name (input prefilled with
     `${it.title} Template`) and a `Save` button. On save: duplicate the itinerary with
     `is_template: true`, `title: name`, copy `start_time`/`slot_minutes`, clone sections with
     `completed: false, completed_at: null`. Show `Saved ✓` in the header via `SaveIndicator`.
   - `Reset progress` sets `completed=false, completed_at=null` on all sections of this
     itinerary and `led_at=null` on the itinerary. Only shown if any section is completed.
   - `Delete Sunday` renders the `<Confirm>` component; on confirm delete the itinerary and
     `router.push("/itineraries")`.
   Close the menu on outside click (a `useEffect` with `mousedown` listener on `document`) and
   on Escape.
   Remove the old `✓ Done` button entirely; everything autosaves.

2. **Details card** (same fields as today plus the timeline fields), all save-on-blur:
   - Row 1: Title (full width).
   - Row 2: Date | Start time (placeholder `10:30 AM`) | Slot length (number, placeholder `60`).
     Three columns on `sm:`, stacked on mobile (`grid grid-cols-1 sm:grid-cols-3 gap-3`).
   - Row 3: Lesson title | Bible passage (two columns on `sm:`).
   - Row 4: Memory verse (textarea, 2 rows).
   - Validate start time on blur with `parseClock`; if the string is non-empty and does not
     parse, show `Use a time like 10:30 AM` in red under the field and do not save.

3. **Sections list**: `sections.map((s, i) => <SectionRow …/>)` inside `<div className="space-y-2">`.

4. **`SectionPalette`** below the list.

5. **`TimelineFooter`**: `sticky bottom-0` card showing `timelineSummary`. If `slot_minutes` is
   set and `totalMinutes > slot_minutes`, add `text-amber-400` and the suffix
   ` · ${total - slot} min over`. Give the page bottom padding so the last row is not hidden
   behind the footer (`pb-20` on the page container).

**`SectionRow` props:**

```ts
{
  section: Section;
  index: number;
  row: TimelineRow;             // from buildTimeline
  expanded: boolean;
  onToggle: () => void;
  onPatch: (patch: Partial<Section>) => void;
  onMove: (dir: -1 | 1) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  isFirst: boolean; isLast: boolean;
  dragHandleProps: { onPointerDown: (e: React.PointerEvent) => void };
}
```

Collapsed row (one line, whole row is a `<button>` with `onToggle`, except the drag handle):

```
[⠿] [icon] Title                         10:30 · 8 min  [›]
```

- `⠿` drag handle: `touch-none cursor-grab select-none text-[#9fb0d3] px-2 py-3` with
  `dragHandleProps` spread on it. `aria-label="Drag to reorder"`.
- Time column: `text-xs font-mono text-[#9fb0d3] tabular-nums`. Show `formatClock(row.startMin)`
  only when non-null; always show `${duration} min`.
- For `group_game` show the chosen game label under the title in `text-xs text-[#9fb0d3]`
  (use `gameLabel` from `@/lib/games`, or `Pick during group` when null / `pick_at_time`).
- Chevron rotates 90° when expanded (`transition-transform`).

Expanded body (below the row, inside the same card, `border-t border-[#1f2a44] mt-2 pt-3`):

1. Title input (save-on-blur) and Type select (immediate save, since it's a select).
2. Duration input (`type="number" inputMode="numeric" min={0}`) save-on-blur. **Remove** the
   per-section `start_time` input; start times are now computed. Keep the DB column, just stop
   writing it.
3. Type-specific content:
   - `memory_verse`, `memory_verse_check`: read-only box showing `it.memory_verse` (or the text
     `No memory verse set yet` with a link `Set it above` that focuses the itinerary verse field
     via `document.getElementById("memory_verse")?.focus()`). Add that id to the field.
   - `bible_reading`: same pattern with `it.bible_passage`, id `bible_passage`.
   - `group_game`: the existing game `<select>` (immediate save) plus, when a ready game is
     chosen, a one-line `text-xs text-[#9fb0d3]` showing `GAMES_BY_ID[chosen].short`.
4. The fields listed in `SECTION_FIELDS[section.section_type]`, in that order, each a 2-row
   textarea with save-on-blur. Labels: `Instructions`, `Script (what to say)`,
   `Discussion questions`, `Notes`.
5. Action row: `↑` `↓` (disabled at ends), `Duplicate`, and `<Confirm label="🗑" title="Delete section" />`.

Only one section is expanded at a time (`expanded` id in page state). Expanding a new one
collapses the previous.

**`SectionPalette`:**

```
Add a section:
[☕ Hangout] [📏 Rules] [📖 Verse] [✅ Verse Check] [📜 Reading] [💬 Discussion] [🙏 Prayer] [🎮 Game] [📝 Scores] [▫️ Custom]
```

`flex flex-wrap gap-2`, each chip is `btn btn-ghost text-sm px-3 py-2` with the icon from
`SECTION_ICON` and a short label (map: free_hangout→Hangout, rules→Rules, memory_verse→Verse,
memory_verse_check→Verse Check, bible_reading→Reading, discussion→Discussion, prayer→Prayer,
group_game→Game, score_recording→Scores, custom→Custom). Order from `SECTION_PALETTE_ORDER`.
Tapping inserts at the end with `SECTION_DEFAULTS[type]`, `chosen_game: type === "group_game" ? "pick_at_time" : null`,
then expands the new row and scrolls it into view (`scrollIntoView({ block: "center", behavior: "smooth" })`).

**Reorder (drag) implementation**, no library, pointer events:

- Page state: `dragging: { id: string; overIndex: number } | null`.
- `onPointerDown` on the handle: `e.currentTarget.setPointerCapture(e.pointerId)`, record the
  section id and the list's row bounding rects (`Array.from(listRef.current.children).map(el => el.getBoundingClientRect())`).
- `onPointerMove` (attached on `document` while dragging): compute `overIndex` = index of the
  first rect whose vertical midpoint is below `e.clientY`, else last. Set state; render a 2px
  `bg-blue-500` insertion line above the `overIndex` row (or below the last row).
- `onPointerUp`: reorder the array locally, renumber `position = index` for every section, set
  state, then persist with one `Promise.all` of `update({ position }).eq("id", …)` for only the
  rows whose position changed, wrapped in `track(...)`. Clear `dragging`.
- Keep `↑`/`↓` buttons as the accessible fallback; make them use the same
  `reorder(fromIdx, toIdx)` function so there is one persistence path. Replace the existing two
  sequential updates with that function.

**Data functions in the page** (single source of truth, all optimistic):

```ts
const patchItinerary = (patch: Partial<Itinerary>) => { setIt(p => p && ({ ...p, ...patch })); return track(supabase.from("itineraries").update(patch).eq("id", id)); };
const patchSection = (sid: string, patch: Partial<Section>) => { setSections(p => p.map(s => s.id === sid ? { ...s, ...patch } : s)); return track(supabase.from("itinerary_sections").update(patch).eq("id", sid)); };
const addSection = async (type: SectionType) => { /* insert with SECTION_DEFAULTS, position = sections.length, then setSections + setExpanded(newId) */ };
const reorder = async (from: number, to: number) => { /* described above */ };
const duplicate = async (s: Section) => { /* insert copy with " (copy)" at position sections.length, completed false */ };
const remove = async (sid: string) => { /* delete row, filter state, then renumber positions of the rest via reorder-style batch */ };
```

Loading state: keep the `Loading…` text but inside a `.card p-4`.

Commit: `Rebuild Sunday editor with palette, timeline, and save-on-blur`.

### A4. New Sunday page: `app/itineraries/new/page.tsx`

- Use `todayLocal()` for the default date. Default the title to `Sunday ${date}` formatted like
  `Sunday Sep 14` (use `toLocaleDateString("en-US", { month: "short", day: "numeric" })` on a
  `Date` constructed from the date string with `T00:00:00` appended so it stays local).
  Recompute the title when the date changes **only if** the user has not edited the title
  (track `titleTouched`).
- Read `?from=<itineraryId>` from `useSearchParams()`; if present, preselect it in the
  "Start from" select (Workstream B links here from the Templates "Use" button).
- Default the select to the most recent past Sunday if there is one, else the first template,
  else empty.
- Under the select render a preview card: the source's sections as a compact list
  `icon title · N min` with the total. Load the sections when `sourceId` changes.
- Add `Start time` and `Slot length` inputs (same row as Date; same validation as the editor).
  Copy `start_time`/`slot_minutes` from the source when the source has them and the user has not
  typed values.
- On create, clone sections with `completed: false, completed_at: null` (the current code copies
  `completed` correctly as false; keep that and add `completed_at`).
- Header: `PageHeader` with `backHref="/itineraries"`, title `New Sunday`.
- Primary button label: `Create & edit outline`.

Commit: `Improve New Sunday: local date, source preview, template preselect`.

### A5. Leading screen: `app/itineraries/[id]/lead/page.tsx`

Changes required because the editor now owns the timeline and reset:

1. **Start / resume gate.** On load, if `sections.some(s => s.completed)` and not all are done,
   show a card before the live view:
   ```
   You're partway through this Sunday (3 of 10 done).
   [Resume]   [Start from the top]
   ```
   `Resume` just dismisses. `Start from the top` resets all sections (`completed=false, completed_at=null`),
   sets `led_at = now()`. If **all** sections are completed, show the existing "Group Complete"
   card but add a `Start over` ghost button that does the same reset.
   If no sections are completed, set `led_at = now()` on the itinerary on first render if
   `led_at` is null or older than 6 hours, and skip the gate.
2. **Group timer** derives from `it.led_at` instead of a `useState(Date.now())`, so a page
   reload mid-group keeps the clock. `groupElapsed = now - Date.parse(it.led_at)`.
3. **Section timer** derives from `completed_at` of the previous section: the current section's
   start is `max(led_at, previous.completed_at)`. Store `completed_at: new Date().toISOString()`
   when advancing. This also survives reloads. Keep the existing amber/red coloring.
4. **Planned clock.** Under the timer, when `it.start_time` is set, show
   `Planned ${formatClock(row.startMin)} – ${formatClock(row.endMin)}` using `buildTimeline`.
   When the wall clock is past `row.endMin` by more than 2 minutes, append `· running late` in
   `text-amber-400`.
5. **Header.** Replace the raw top row with `PageHeader`: `backHref=/itineraries/${id}/edit`,
   `backLabel="Outline"`, title = `it.title`, subtitle = `${doneSecs}/${totalSecs} · Group ${fmt(groupElapsed)}`.
   Keep the progress bar under it.
6. **Upcoming list** shows the computed start clock next to each item when available:
   `<span>{formatClock(startMin)} · {dur} min</span>`.
7. **Inline quick edit.** Below the Script and Discussion blocks add a small `Edit` ghost text
   button (`text-xs text-[#9fb0d3]`). Tapping swaps the block for a textarea with save-on-blur
   (same `useSaveState` + `SaveIndicator` pattern) and a `Done` button. Notes already behave this
   way; keep it.
8. **Game section.** When `chosen_game` is a ready game, the primary link stays
   `🎮 Play {label}`. Add a secondary `Change game` ghost link to `/itineraries/${id}/games`.
9. **Fixed bottom bar** stays. Add `pb-24` on the page root so the Upcoming card can scroll
   above it (currently the layout's `pb-24` handles this; verify on a phone viewport at 375×812).

Also make the game route wrappers under `app/itineraries/[id]/games/*/page.tsx` and
`app/itineraries/[id]/games/[game]/page.tsx` pass `backHref={/itineraries/${id}/lead}` and
`backLabel="Leader"` so every game returns to the leading screen, matching baseball. Do not edit
`components/games/**`; only the wrapper props.

In `app/itineraries/[id]/verse/page.tsx` replace the header with `PageHeader`
(`backHref` lead, `backLabel="Leader"`). No other changes.

Commit: `Leading screen: resume/restart, persistent timers, planned clock, quick edit`.

### A6. Verify (Workstream A)

Use the browser preview at 375×812 and desktop. Checklist:
- New Sunday on a Wednesday evening shows today's date, not tomorrow.
- Add chips insert typed sections with correct default titles/durations.
- Typing a title does not fire network requests until blur (check `read_network_requests`).
- Drag a section three rows down; reload; order persists.
- Set start time `10:30 AM`, slot 60, durations summing to 70 → footer amber, `10 min over`.
- Lead: tap Next twice, reload → timers continue, gate offers Resume / Start from the top.
- Complete all → Group Complete with Start over.
- `npm run build` passes.

---

## Workstream B: App-wide navigation + polish

Branch `feat/app-polish`. Owns: `app/layout.tsx`, `app/page.tsx`, `app/itineraries/page.tsx`,
`app/itineraries/[id]/summary/page.tsx`, `app/summaries/page.tsx`, `app/teams/page.tsx`,
`app/admin/**`, `app/games/**`, `components/ScoreBar.tsx`, `components/games/GamesHub.tsx`,
`components/nav/**` (new), `app/globals.css`.

Do NOT touch `lib/types.ts`, `lib/games.ts`, or anything under `app/itineraries/[id]/` other
than `summary/page.tsx`. If you need a type, define it locally in the file.

### B1. One header, not two: `app/layout.tsx`, `components/ScoreBar.tsx`, `components/nav/TopNav.tsx`

Goal: a single sticky bar. Row 1: app name + nav pills. Row 2 (only when teams exist): compact
scores. Both in one `sticky top-0 z-40` element so the sticky offsets never stack.

- Create `components/nav/TopNav.tsx` (client component). It renders:
  - Left: `MS Leading` link to `/`.
  - Right: pills `📅 Sundays` `/itineraries`, `🎮 Games` `/games`, `🏆 Teams` `/teams`,
    `📜 History` `/summaries`, and an overflow `⋯` pill that opens a small card with
    `❓ Question banks` `/admin`. Use `usePathname()` to mark the active pill with
    `border-blue-500 bg-[#1a2540]`.
  - On viewports under `sm`, pills show icon only with `aria-label` and the text in a
    `sr-only` span, so all four fit on one row at 375px. On `sm:` and up show icon + label.
- `ScoreBar` becomes a pure display row inside `TopNav` (import it there, not in layout).
  Remove its own `sticky`/`-mx-4` wrapper; keep the `+ / −` buttons but shrink them to
  `min-h-[36px]`. Keep polling but pause when `document.visibilityState !== "visible"`
  (check inside the interval callback; skip `load()` when hidden).
  Keep the service worker registration where it is.
- In `layout.tsx` replace `<ScoreBar/>` + `<header>` with `<TopNav/>`; leave `OfflineBanner`
  above it. Keep `max-w-3xl mx-auto p-4 pb-24`.
- On the lead page route (`pathname.includes("/lead")`) and game routes
  (`/games/` or `/baseball`) hide the nav pills row and show only the app name + scores, so
  the leader's screen has maximum room. Do this inside `TopNav` with `usePathname()`; do not
  edit the lead page (Workstream A owns it).

Commit: `Merge score bar and nav into one sticky header with active state`.

### B2. Home: `app/page.tsx`

- Replace the query with two: upcoming = `.gte("scheduled_date", todayLocal()).eq("is_template", false).order("scheduled_date").limit(1)`,
  recent = `.eq("is_template", false).order("scheduled_date", { ascending: false, nullsFirst: false }).limit(6)`.
  Hero uses `upcoming[0]`. Remove the client-side filter.
- When the hero date is today, label it `Today` in `text-green-400`; when it's within 7 days,
  `This Sunday`; otherwise `Next up`.
- Hero buttons: `Edit` ghost (1 col) and `▶ Lead` primary (2 cols) as today.
- Recent list rows: show `lesson_title` under the title when present. Row buttons remain.
- Empty state text: `No Sundays yet. Plan your first one.` with the create button.

Commit: `Home: query upcoming Sunday by date, clearer labels`.

### B3. Sundays list: `app/itineraries/page.tsx`

- `PageHeader` title `Sundays`, right = `+ New Sunday`.
- Sort Sundays by `scheduled_date desc` (nulls last) client-side after load.
- Group into `Upcoming` and `Past` sub-headings using `todayLocal()`.
- Templates section: `Use` becomes `<Link href={/itineraries/new?from=${it.id}}>`.
  Workstream A reads that param. Do not link anywhere else.
- Replace the `🗑` `confirm()` with `<Confirm label="🗑" title="Delete" onConfirm={() => del(it.id)} />`
  and remove the `confirm` call from `del`.

Commit: `Sundays list: upcoming/past groups, template Use preselects, inline delete`.

### B4. Games hub: `components/games/GamesHub.tsx`, `app/games/page.tsx`

- Only `ready` games render as cards. Below them add a `<details>` element styled as a muted
  row: `<summary className="text-sm text-[#9fb0d3] cursor-pointer">Coming soon (3)</summary>`
  listing the not-ready games as plain text lines `icon label — short`.
- Use `PageHeader` for the title/back link.
- Standalone `app/games/[game]/page.tsx`: use `PageHeader` too. No other changes.

Commit: `Games hub: hide unreleased games behind a disclosure`.

### B5. Teams: `app/teams/page.tsx`

Split into two tabs with local state `tab: "scores" | "roster"` (default `scores`). Tabs are two
`btn` buttons in a `grid grid-cols-2 gap-2` under the `PageHeader`; the active one is
`btn-primary`, the other `btn-ghost`.

- **Scores tab**: season card, team cards with points buttons, the reason input, recent score
  events.
- **Roster tab**: add student, unassigned list with the random assign button, and each team's
  roster (move the per-team student lists here, out of the score cards, so the score cards on
  the Scores tab are just icon/name/score/buttons).
- Header right slot: `End Season & Reset` (via `<Confirm confirmLabel="End season" …>`) or
  `+ New Season` exactly as today. Replace the `confirm()` in `archive` and `del` with `<Confirm>`.
- Keep `NewSeasonModal` as is; it's fine. Replace its `alert(...)` calls with an inline
  `text-red-400 text-sm` error line in the modal.

Commit: `Teams: split into Scores and Roster tabs, inline confirmations`.

### B6. Summary + History: `app/itineraries/[id]/summary/page.tsx`, `app/summaries/page.tsx`

- Summary: `game_played` must come from `game.game_type`, mapped to a label. Define locally:
  ```ts
  const GAME_LABEL: Record<string, string> = { bible_baseball: "Bible Baseball", four_corners: "Four Corners", true_false_showdown: "True or False Showdown", bible_taboo: "Bible Taboo", bible_hangman: "Bible Hangman", bible_pictionary: "Bible Pictionary", guess_the_fake: "Guess the Fake", bible_auction: "Bible Auction", bible_price_is_right: "Bible Price Is Right", verse_hunt: "Verse Hunt" };
  const gameName = game ? (GAME_LABEL[game.game_type] ?? game.game_type) : null;
  ```
  (Local on purpose: `lib/games.ts` belongs to neither workstream and must not change.)
  Use `gameName` in both the display row and the insert. Also fetch **all** `game_results` for
  the itinerary and list them if more than one was played (`gameName` for the insert is the
  first/most recent one, joined with `, ` if several).
- Summary header: `PageHeader` with back to lead, title `Summary`. After `Saved ✓`, show a
  `Back to Home` primary link.
- History page: rename headings to `Seasons` and `Sundays`; use `PageHeader` title `History`.
  Make each Sunday row collapsed by default (`<details>`), summary line = lesson title + date +
  game; expanded shows team lines and notes.

Commit: `Summary records the real game; History rows collapse`.

### B7. Admin: `app/admin/page.tsx` and the three bank pages

- `PageHeader` title `Question Banks` on the hub; on each bank page add
  `PageHeader backHref="/admin" backLabel="Question banks"`.
- Replace any `confirm()` / `alert()` in `app/admin/questions`, `app/admin/prompts`,
  `app/admin/pir` with `<Confirm>` and inline error text. No other behavior changes.

Commit: `Admin: consistent headers and inline confirmations`.

### B8. Verify (Workstream B)

- 375×812: header is one sticky block; four pills fit on one row; scores row visible when teams
  exist; on `/itineraries/<id>/lead` the pills row is hidden.
- Home shows the nearest future Sunday even when older itineraries were created after it.
- Templates `Use` opens `/itineraries/new?from=<id>`.
- Games hub lists only ready games, with a `Coming soon (3)` disclosure.
- Teams tabs switch; delete/end season use inline confirm; no `window.confirm` anywhere
  (`grep -rn "confirm(\|alert(" app components` returns nothing in B-owned files).
- Summary shows the played game name.
- `npm run build` passes.

---

## Merge

1. Merge `feat/outline-maker` into `main` (PR). Run the checklist A6 on `main`.
2. Rebase `feat/app-polish` onto `main`. The only expected overlap is none; if git reports a
   conflict, one branch broke the ownership table below; resolve by keeping both changes.
3. Merge `feat/app-polish`. Run both checklists once more on `main`.
4. Post-merge cleanups (tiny, either session): the Home and Sundays list link to the editor,
   which now has the `?from=` flow and PageHeader, so click through every nav path once on a
   phone-size viewport and fix any stale label.

---

## File ownership

| Path | Owner |
|---|---|
| `lib/dates.ts`, `components/Confirm.tsx`, `components/PageHeader.tsx` | Step 0 (frozen after) |
| `lib/types.ts`, `lib/schedule.ts`, `components/outline/**`, `supabase/v13_outline.sql` | A |
| `app/itineraries/new/page.tsx`, `app/itineraries/[id]/edit/**`, `app/itineraries/[id]/lead/**`, `app/itineraries/[id]/verse/**` | A |
| `app/itineraries/[id]/games/**`, `app/itineraries/[id]/baseball/**` (route wrappers only) | A |
| `app/itineraries/[id]/summary/**` | B |
| `app/layout.tsx`, `app/page.tsx`, `app/itineraries/page.tsx`, `app/summaries/**`, `app/teams/**`, `app/admin/**`, `app/games/**` | B |
| `components/ScoreBar.tsx`, `components/nav/**`, `components/games/GamesHub.tsx`, `app/globals.css` | B |
| `components/games/*Game.tsx`, `lib/games.ts`, `lib/supabase.ts`, `lib/offline.ts` | nobody (do not edit) |

If a task seems to require editing a file outside your workstream, stop and implement the
workaround stated in this plan (local constant, wrapper prop, URL param). Do not cross the line.
