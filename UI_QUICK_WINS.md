# UI Quick Wins — one hour, no new tables, nothing removed

Ten small changes, ordered by payoff per minute. Each one is a few lines in a file that already exists. Do them top to bottom; stop when the hour is up and the app is still in a good state after every step.

| # | Change | File | Min |
|---|--------|------|-----|
| 1 | Buttons feel like buttons (44 px, press feedback) | `app/globals.css` | 3 |
| 2 | Leader Mode: countdown timer that turns amber / red | `app/itineraries/[id]/lead/page.tsx` | 8 |
| 3 | Leader Mode: Prev / Next pinned to the bottom of the screen | same file | 6 |
| 4 | Leader Mode: keep the screen awake | same file | 4 |
| 5 | Bottom tab bar on phones | `components/TabBar.tsx` (new), `app/layout.tsx` | 12 |
| 6 | Home shows "This Sunday" with one big Lead button | `app/page.tsx` | 8 |
| 7 | Sundays list: say "Sundays", split templates out | `app/itineraries/page.tsx` | 6 |
| 8 | Section rows show type icon + minutes when collapsed | `app/itineraries/[id]/edit/page.tsx` | 6 |
| 9 | Verse Check: student buttons big enough for thumbs | `app/itineraries/[id]/verse/page.tsx` | 2 |
| 10 | Games hub: unfinished games dimmed and last | `components/games/GamesHub.tsx` | 5 |
| | **Total** | | **60** |

---

## 1. Buttons feel like buttons (3 min)

Every `.btn` gets a real touch target and a press state. Inputs get the same height so rows line up.

```css
/* app/globals.css — replace the .btn line */
.btn { display:inline-flex; align-items:center; justify-content:center; padding: 12px 16px; min-height: 44px;
       border-radius: 10px; font-weight: 600; transition: transform .08s ease, background .12s ease; user-select: none; }
.btn:active { transform: scale(.97); }
.btn:disabled { opacity: .4; }
input, textarea, select { /* existing line */ min-height: 44px; }
```

## 2. Leader Mode countdown (8 min)

Today the section shows "Target: 10 min · Elapsed: 03:12" in 12 px grey. Replace it with a big remaining-time number that changes color.

```tsx
// lead/page.tsx — after sectionElapsed is computed, inside the `current &&` block
const targetSecs = (current.duration_minutes ?? 0) * 60;
const remaining = targetSecs - sectionElapsed;
const timerClass =
  targetSecs === 0 ? "text-[#9fb0d3]" :
  remaining < 0 ? "text-red-400" :
  remaining <= 60 ? "text-amber-400" : "text-[#e6ecf5]";
```

```tsx
{/* replace the "Target: … · Elapsed: …" line */}
<div className="mt-2 flex items-baseline gap-3">
  <div className={`text-4xl font-mono font-bold tabular-nums ${timerClass}`}>
    {targetSecs === 0 ? fmt(sectionElapsed) : `${remaining < 0 ? "-" : ""}${fmt(Math.abs(remaining))}`}
  </div>
  <div className="text-xs text-[#9fb0d3]">
    {targetSecs === 0 ? "no target" : remaining < 0 ? "over" : "left"} · plan {current.duration_minutes ?? 0} min
  </div>
</div>
```

While you are there, make the section title bigger: `text-2xl` → `text-3xl`.

## 3. Prev / Next pinned to the bottom (6 min)

The Next button currently scrolls off screen under the notes box and "Upcoming" list. Move the button row out of the card into a fixed bar. Keep everything else where it is.

```tsx
{/* remove the <div className="grid grid-cols-3 gap-2"> … </div> from inside the card, then add this
    just before the closing </div> of the page (outside the `done ? … : …` block, only when !done) */}
{!done && (
  <div className="fixed bottom-0 inset-x-0 z-40 p-3 bg-[#0b1220]/95 backdrop-blur border-t border-[#1f2a44]">
    <div className="max-w-3xl mx-auto grid grid-cols-3 gap-2">
      <button onClick={previous} disabled={doneSecs === 0} className="btn btn-ghost btn-lg">← Prev</button>
      <button onClick={advance} className="btn btn-primary btn-lg col-span-2">Next Section →</button>
    </div>
  </div>
)}
```

The page body already has `pb-24`, so nothing hides behind the bar. The section-specific buttons (Open Verse Check, Play game, Record Summary) stay inside the card.

## 4. Keep the screen awake in Leader Mode (4 min)

```tsx
// lead/page.tsx — add next to the other useEffects
useEffect(() => {
  let lock: any = null;
  const grab = async () => { try { lock = await (navigator as any).wakeLock?.request("screen"); } catch {} };
  grab();
  const onVis = () => { if (document.visibilityState === "visible") grab(); };
  document.addEventListener("visibilitychange", onVis);
  return () => { lock?.release?.(); document.removeEventListener("visibilitychange", onVis); };
}, []);
```

Works on iOS 16.4+ and Android Chrome. Silently does nothing elsewhere.

## 5. Bottom tab bar on phones (12 min)

The top nav scrolls sideways and hides "History" and "Questions" on a phone. Add a thumb-reachable tab bar and keep the top nav for wider screens.

```tsx
// components/TabBar.tsx (new)
"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  ["/", "🏠", "Home"],
  ["/itineraries", "📅", "Sundays"],
  ["/games", "🎮", "Games"],
  ["/teams", "🏆", "Teams"],
  ["/summaries", "📜", "History"],
] as const;

export default function TabBar() {
  const path = usePathname() ?? "/";
  // Leader Mode and games own the bottom of the screen; stay out of their way.
  if (/\/lead$|\/games\/[^/]+$|\/baseball$/.test(path)) return null;
  return (
    <nav className="sm:hidden fixed bottom-0 inset-x-0 z-40 bg-[#0b1220]/95 backdrop-blur border-t border-[#1f2a44]">
      <div className="grid grid-cols-5 max-w-3xl mx-auto">
        {TABS.map(([href, icon, label]) => {
          const active = href === "/" ? path === "/" : path.startsWith(href);
          return (
            <Link key={href} href={href}
              className={"flex flex-col items-center py-2 text-[11px] " + (active ? "text-blue-300" : "text-[#9fb0d3]")}>
              <span className="text-xl leading-none">{icon}</span>
              <span className="mt-1">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
```

```tsx
// app/layout.tsx
import TabBar from "@/components/TabBar";
// … in the body, after {children}:
<TabBar />
// and hide the top nav on phones: add "hidden sm:flex" to the <nav className="flex gap-4 …">
```

"Questions" is still reachable from the top nav on wide screens and from the Home tiles (step 6).

## 6. Home: "This Sunday" hero (8 min)

The dashboard already loads the six most recent Sundays. Pick the one for today or the next upcoming date and give it the big button; the rest stay in the list.

```tsx
// app/page.tsx — after items are loaded
const today = new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD in local time, not UTC
const upcoming = items.filter((i) => i.scheduled_date && i.scheduled_date >= today)
                      .sort((a, b) => a.scheduled_date!.localeCompare(b.scheduled_date!));
const hero = upcoming[0] ?? null;
```

```tsx
{/* replace the first card's button grid */}
{hero ? (
  <>
    <div className="mt-3 text-xs uppercase text-[#9fb0d3]">{hero.scheduled_date === today ? "Today" : "Next up"} · {hero.scheduled_date}</div>
    <div className="text-xl font-bold">{hero.title}</div>
    {hero.lesson_title && <div className="text-sm text-[#9fb0d3]">{hero.lesson_title}{hero.bible_passage ? ` · ${hero.bible_passage}` : ""}</div>}
    <div className="mt-3 grid grid-cols-3 gap-2">
      <Link href={`/itineraries/${hero.id}/edit`} className="btn btn-ghost btn-lg">Edit</Link>
      <Link href={`/itineraries/${hero.id}/lead`} className="btn btn-primary btn-lg col-span-2">▶ Lead</Link>
    </div>
  </>
) : (
  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
    <Link href="/itineraries/new" className="btn btn-primary btn-lg w-full">➕ Plan this Sunday</Link>
    <Link href="/games" className="btn btn-ghost btn-lg w-full">🎮 Play a Game</Link>
  </div>
)}
```

Change the tile grid at the bottom from 3 to 4 columns and add `❓ Questions` → `/admin`, so the tab bar can leave it out.

## 7. Sundays list: consistent name, templates separated (6 min)

```tsx
// app/itineraries/page.tsx
<h1>Sundays</h1>                                   // was "Itineraries"
<Link href="/itineraries/new" className="btn btn-primary">+ New Sunday</Link>

const sundays = items.filter((i) => !i.is_template);
const templates = items.filter((i) => i.is_template);
```

Render `sundays` in the existing list, then a second heading `<h2 className="mt-6">Templates</h2>` with `templates` using the same row, but the primary button reads **Use** and links to `/itineraries/new` (the New page already lists templates in its dropdown; pre-selecting it is a follow-up). Also stack the row on phones: `flex-col sm:flex-row sm:items-center gap-2` on the `<li>`.

## 8. Section rows: icon and minutes at a glance (6 min)

Add an icon map next to `SECTION_LABEL` and show it with the duration in the collapsed row, so the builder reads like a schedule.

```ts
// lib/types.ts
export const SECTION_ICON: Record<SectionType, string> = {
  free_hangout: "☕", rules: "📏", memory_verse: "📖", bible_reading: "📜", discussion: "💬",
  prayer: "🙏", memory_verse_check: "✅", group_game: "🎮", score_recording: "📝", custom: "▫️",
};
```

```tsx
// edit/page.tsx — collapsed header row
<span className="text-[#9fb0d3] text-sm w-6">{i + 1}.</span>
<span className="text-xl w-7 text-center">{SECTION_ICON[s.section_type]}</span>
<input … className="flex-1" />
<span className="text-xs text-[#9fb0d3] font-mono w-12 text-right">{s.duration_minutes ?? "–"} min</span>
```

Move the `<select>` for section type into the expanded Details area (it is rarely changed after creation) so the row fits on a phone. Also add a planned-total line under the title: `{sections.reduce((a, s) => a + (s.duration_minutes ?? 0), 0)} min planned`.

## 9. Verse Check thumbs (2 min)

```tsx
// verse/page.tsx — the per-student button
className={"w-full text-left p-3 rounded-lg text-base " + (…)}   // was p-2
```

And the two team cards: `grid-cols-2` → `grid-cols-1 sm:grid-cols-2` so names are not squeezed on a phone.

## 10. Games hub: unfinished games dimmed and last (5 min)

```tsx
// components/games/GamesHub.tsx
const ordered = [...GAMES].sort((a, b) => Number(b.ready) - Number(a.ready));
// map over `ordered`, and on the Link:
className={"card p-4 transition-colors " + (g.ready ? "hover:border-blue-500" : "opacity-50 pointer-events-none")}
```

---

## If there is time left

- **Bigger score in the ScoreBar** on Lead and game pages: `text-xl` → `text-2xl` on the number. (1 min)
- **"Saved ✓" flash** on the builder header after any `updateItinerary` / `patchSection` call: a `useState` string cleared with a 1.5 s timeout. (5 min)
- **Empty states with an action**: Teams page with no students → "Add your first student" pointing at the input; Games hub note when both teams have zero students. (5 min)
- **Confirm text with consequences**: `confirm("Delete this itinerary?")` → `confirm("Delete this Sunday and all its sections? This cannot be undone.")`. (2 min)

## Not in this hour (see PLAN.md)

Realtime instead of 2-second polling, the atomic `add_points` function, debounced section saves, toast/undo in place of `alert`/`confirm`, drag-to-reorder, auth. Each needs either a migration or a shared component and is worth doing properly.
