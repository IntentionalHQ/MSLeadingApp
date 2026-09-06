# MS Leading — Plans

Two plans live in this file:

1. **Plan 1 — Make the current app more intuitive and more reliable** (nothing removed).
2. **Plan 2 — A second app for public speaking ("Talk" mode)** built on the same database and the same code.

Both are written against the code as it is today (Next.js 16 / React 19 / Supabase, ten games, Sunday builder, Leader Mode, teams + seasons, offline write queue, PWA). Every item below is additive: existing routes, tables, games, and screens keep working throughout.

---

## Plan 1 — Improve the existing app

### Ground rules

- **Nothing is removed.** Every route in `SETUP.md` still resolves. Old routes that get a better home become redirects.
- **Additive schema only.** New columns get defaults; new tables are new files in `supabase/` like `v10_…sql`, safe to re-run.
- **Ship in phases.** Each phase is usable on a Sunday by itself. Phase 0 first, then the order below, but phases 1–7 can be reshuffled.
- **Phone first.** The leader is holding a phone with one hand in a room full of middle schoolers. Big targets, nothing hidden behind scrolling, no browser dialogs.

### Phase 0 — Fix what is quietly wrong today (S/M)

These were found reading the code. None of them change features; they make the existing features do what they claim.

| # | Problem | Where | Fix |
|---|---------|-------|-----|
| 0.1 | Summary always says the game was "Bible Baseball", and only looks at the last game result. | `app/itineraries/[id]/summary/page.tsx` | Read `game_results.game_type` and map through `gameLabel()`. List every game played that Sunday, not just one. |
| 0.2 | Score writes race. ScoreBar, Teams, Verse Check, and every game compute `total_score + delta` on the client from a possibly stale value, then overwrite. Two fast taps or two phones can lose points. | `components/ScoreBar.tsx`, `app/teams/page.tsx`, `app/itineraries/[id]/verse/page.tsx`, all `components/games/*` | One Postgres function `add_points(team_id, delta, reason, itinerary_id, contest_id)` that inserts the `score_events` row and does `update teams set total_score = total_score + delta` in one statement. All screens call it. Teach the offline replay in `lib/supabase.ts` to replay `rpc` ops so this still works offline. |
| 0.3 | ScoreBar polls Supabase every 2 seconds on every page, forever. Battery and bandwidth cost, and it hammers a free-tier project. | `components/ScoreBar.tsx` | Subscribe with Supabase Realtime on `teams` (one websocket), fall back to a 20-second poll, and refresh on focus and after any local write via a tiny in-app event. |
| 0.4 | Section editor sends a Supabase write on every keystroke. | `app/itineraries/[id]/edit/page.tsx` (`patchSection`) | Debounce 400 ms per field, plus save on blur. Show a small "Saved ✓ / Saving…" state in the header. |
| 0.5 | Leader Mode timers reset if the page reloads, and group start time is never stored. Re-leading a Sunday needs the `completed` flags reset by hand. | `app/itineraries/[id]/lead/page.tsx` | Add `itineraries.started_at` and `itinerary_sections.started_at / completed_at` (nullable). Timers derive from those, so a reload or a second phone shows the right elapsed time. Add "Reset progress" on the Lead screen. This also gives real "planned vs actual" data for the summary. |
| 0.6 | Game results and most score writes bypass the offline queue. Only ScoreBar uses `safeInsert`. A Wi-Fi drop during a game loses the result. | all `components/games/*` | Route `game_results` inserts and the new `add_points` call through the safe wrappers. |
| 0.7 | 22 `alert()` / `confirm()` calls. In an installed PWA these look like system errors and block the UI. | throughout | One `Toast` + one `ConfirmSheet` component. Deletes get an "Undo" toast instead of a confirm. |
| 0.8 | Dates use `toISOString().slice(0,10)`, which is UTC. Creating a Sunday after ~7 pm Central stamps tomorrow's date. | `new/page.tsx`, `summary/page.tsx`, teams | A `localDateISO()` helper in `lib/dates.ts`. |
| 0.9 | Deleting a Sunday from the list is instant and permanent. | `app/itineraries/page.tsx` | Soft delete (`itineraries.deleted_at`), filtered out everywhere, with Undo. A "Trash" section on the list restores. |
| 0.10 | Guess the Fake has a Supabase table (`gtf_questions`) but no admin page; the admin hub lists three banks. | `app/admin/page.tsx` | Add `/admin/gtf` using the same editor pattern as `/admin/pir`. |
| 0.11 | Bible Baseball lives at `/itineraries/[id]/baseball` while every other game is under `/games/<id>`. | `lib/games.ts` | Serve it from `/games/bible_baseball` like the rest; keep the old path as a redirect. |
| 0.12 | Two games say "Coming soon" (Hot Seat, Shooting Range) and can still be chosen in the builder. | `lib/games.ts` | Build both (they are simple: Hot Seat is Taboo with the roles flipped; Shooting Range is Four Corners with cups). Until then, group them under "Not built yet" in the picker. |

### Phase 1 — Navigation that matches how the app is used (M)

- **Home becomes "This Sunday".** One hero card for the itinerary dated today or the next upcoming Sunday: title, lesson, passage, progress bar, and a single big **Lead** button. If none exists: **Plan this Sunday** (goes straight to New with the date pre-filled). Recent Sundays and the three tiles stay below.
- **Bottom tab bar on phones**: Home · Sundays · Games · Teams · More (History, Questions). Replaces the horizontally scrolling top nav that hides items. Top nav stays on wider screens.
- **Consistent wording.** Nav says "Sundays", the page says "Itineraries". Use "Sundays" everywhere; keep the `/itineraries` URLs.
- **Templates get their own tab** on the Sundays list (today they are mixed in with a badge), with a **Use this template** action.
- **ScoreBar is contextual.** Full bar on Lead, games, Verse Check, Teams. Elsewhere it collapses to a small pill with the two totals; tap to expand. Frees a third of the screen on admin and builder pages.
- **One `PageHeader` component**: title, back link, primary action. Every screen today builds its own.

### Phase 2 — Planning a Sunday should take two minutes (M)

- **New Sunday defaults**: date defaults to next Sunday, title auto-fills ("Sunday, Mar 8"), template chosen from cards with a mini outline preview instead of a `<select>`. "Copy last Sunday" is one tap.
- **Section rows collapse** to icon · title · duration · one-line summary. Tap to expand. Drag to reorder (with the ↑ ↓ buttons kept).
- **Auto start times.** Enter the group start time once; each section's start time is computed from the durations. The hand-typed "10:30 AM" text field stays as an override. A total-runtime bar shows planned minutes vs available minutes.
- **Type presets.** "Add section" offers chips (Discussion, Game, Prayer…) that pre-fill title, duration, and instructions from the Default Sunday Template.
- **Memory verse split** into reference + text (today one text blob) so the Verse Check screen can show the reference big and the text small.
- **Passage text.** Optional: fetch the passage from a free Bible API on save and cache it in `itineraries.passage_text`, so Leader Mode shows the words, not just "Luke 15:11–32". Also an "Open in Bible app" link.

### Phase 3 — Leader Mode that you can run without thinking (M/L)

This is the screen that matters most, and it feeds Plan 2 directly.

- **Focus layout**: site header and nav hidden, ScoreBar kept, sticky bottom bar with Prev / Next always visible without scrolling.
- **Countdown, not count-up.** Show time remaining for the section; amber at one minute left, red when over. A pace line says "On schedule" or "4 min behind" based on planned durations, so the leader knows whether to cut the game short.
- **Screen Wake Lock** so the phone never sleeps mid-lesson. Re-acquire on visibility change.
- **Gestures and keys**: swipe or tap the right/left edges for Next/Prev; arrow keys, Space, PageUp/Down for a Bluetooth clicker.
- **Section-aware panels** rather than links that leave the screen:
  - Memory Verse Check embedded inline (the standalone route stays).
  - Discussion questions as a tap-to-check list so the leader knows what was covered.
  - Prayer section gets a quick "requests" box that saves into notes.
  - Group Game shows the chosen game with a Play button (exists) and, after returning, the result and winner.
- **Return path from games**: every game's end screen has "Back to Leader Mode", which lands on the same section and marks it done.
- **Group Complete** screen shows the summary preview inline and a one-tap "Save summary".

### Phase 4 — Games: one shell, many games (M)

- A shared `GameShell` (header, team chips, round counter, back link, end-of-game screen with "Add points to team totals") so all eight built games look and behave the same. Each game keeps its own rules code.
- **No repeats across weeks.** Record which question ids were shown per Sunday in a `question_plays` table; the shuffle bag skips anything played in the last N weeks. Today repeats are prevented only within a single game session.
- **Question bank admin**: search, filter by difficulty/testament, bulk enable/disable, and in-browser XLSX/CSV import (the `scripts/*.mjs` importers keep working; this just removes the copy-SQL-into-Supabase step).
- Build Hot Seat and Shooting Range (see 0.12).

### Phase 5 — Teams and seasons (S/M)

- Attendance check on the Teams page and in Leader Mode (`attendance` table: itinerary_id, student_id). Summary shows who was there.
- Student rows: rename, move between teams from a bottom sheet, and a "Balance teams" suggestion when counts are uneven.
- Season page: line chart of both teams' totals across Sundays (from `score_events`), and per-Sunday deltas on History.
- Season end: a "Champions" screen worth showing the room, then the reset that exists today.

### Phase 6 — Reliability and safety (M)

- **Lock the door.** RLS is permissive and the anon key ships in the client, so anyone with the URL can edit or wipe the data. Add Supabase Auth with a single leader login (magic link or email + password) and change the policies to `authenticated`. One-time sign-in per device; nothing else changes.
- **Offline for real.** The service worker precaches only `/` and icons, so opening a Lead page cold with no signal fails. Precache the app shell for every route (serwist or a generated route list), bump the cache version on deploy, and show the OfflineBanner's pending count on the Lead screen.
- **Error states.** Every screen today shows "Loading…" forever if Supabase is paused or unreachable. Add an error boundary and a "Can't reach the database — Retry" card.
- **Typed client.** Generate types with `supabase gen types` and drop the `as any` casts.
- **Tests.** Unit tests for baseball `advance()`, the shuffle bag, and points math; one Playwright smoke test: New Sunday → Lead → Verse Check → Game → Summary.
- **Migrations.** Number the SQL files, add a `schema_version` table, and an `npm run db:migrate` script so a new machine can be set up without pasting into the SQL editor.

### Phase 7 — Visual polish (S)

- Colors move from hex literals into `tailwind.config.ts` tokens; 44 px minimum touch targets; loading skeletons instead of "Loading…"; empty states with a next action; short haptic tick (`navigator.vibrate`) on score changes; optional light mode.

### Suggested order

| Order | Phase | Size | Why first |
|-------|-------|------|-----------|
| 1 | 0 Fixes | M | Correctness; everything else builds on `add_points` and the timing columns. |
| 2 | 3 Leader Mode | M/L | Biggest Sunday-morning payoff, and it becomes the shared presenter for Plan 2. |
| 3 | 1 Navigation | M | Cheap, visible, makes the app feel finished. |
| 4 | 6 Auth + offline | M | Do before sharing the URL with anyone else. |
| 5 | 2 Builder | M | |
| 6 | 4 Games shell | M | |
| 7 | 5 Teams | S/M | |
| 8 | 7 Polish | S | |

---

## Plan 2 — "Talk": a public-speaking version of the app

### What it is

A second app for preparing and delivering a talk, sermon, devotional, or presentation. You pick a **speaking template** (an ordered flow of cards, like Expository or Me/We/God/You/We), fill in what you will say on each card, then **Present**: a large-type card view with a timer, pace indicator, and next/previous navigation you can drive without looking at the phone.

It reuses the Sunday app's database and code:

- A talk **is an itinerary** (`itineraries` row with `kind = 'talk'`), and each card **is a section** (`itinerary_sections`). Templates, duplicate, "save as template", offline queue, and the presenter timer are the same functions.
- The Sunday app keeps working unchanged; it just filters `kind = 'sunday'`.

### Architecture decision

Build it **inside this repo** as a route group, and deploy it as a **second Vercel project** pointing at the same repo and the same Supabase project, with `NEXT_PUBLIC_APP_MODE=speak`.

- `app/(speak)/talks/...` routes, shared `lib/` and `components/`.
- The mode flag decides the home page, the nav, the manifest (name "Talk", its own icon, its own start URL), and hides the ScoreBar. So it installs on the phone as a separate app, but there is one codebase and one database.
- The `/talks` routes also work inside the Sunday deployment (handy for testing), and Sunday routes still work in the Talk deployment.

### Database changes (one migration, `supabase/v10_talks.sql`, additive)

```sql
alter table itineraries add column if not exists kind text not null default 'sunday'; -- 'sunday' | 'talk'
alter table itineraries add column if not exists template_key text;      -- e.g. 'expository'
alter table itineraries add column if not exists big_idea text;          -- one-sentence thesis, pinned at the top
alter table itineraries add column if not exists target_minutes int;
alter table itineraries add column if not exists audience text;
alter table itineraries add column if not exists venue text;
create index if not exists itineraries_kind_idx on itineraries (kind, is_template, scheduled_date desc);

-- Actual timings from each run-through, so you can see if you are consistently long.
create table if not exists talk_runs (
  id uuid primary key default gen_random_uuid(),
  itinerary_id uuid not null references itineraries(id) on delete cascade,
  kind text not null default 'rehearsal',   -- 'rehearsal' | 'live'
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  section_timings jsonb,                    -- [{section_id, planned_sec, actual_sec}]
  notes text
);
```

Existing section columns map cleanly to a speaking card, so **no new section columns are needed**:

| Section column | Meaning for a talk card |
|----------------|------------------------|
| `title` | The headline shown big on the card ("Point 2: Grace costs something") |
| `script` | What you will say (the body of the card, supports simple markdown: bold, bullets, verse refs) |
| `instructions` | Delivery cues shown small and dim ("slow down", "pause", "look up", "walk to the left") |
| `discussion_questions` | Questions to ask the room, if any |
| `notes` | Margin notes / research that is not read aloud |
| `duration_minutes` | Target minutes for the card |
| `section_type` | Card type, new values below |

New `section_type` values (the column is free text, so no migration): `hook`, `intro`, `context`, `scripture`, `point`, `illustration`, `story`, `application`, `transition`, `quote`, `call_to_action`, `close`, `prayer`, plus the existing `custom`. `lib/types.ts` gets a second label map for talk types.

### Speaking templates (seeded as `itineraries` rows with `is_template = true, kind = 'talk'`)

Each template seeds its cards with a target duration and a prompt in `instructions`, so a blank card tells you what to write. Durations scale proportionally when you set a different target length.

| Key | Name | Flow (cards) | Best for |
|-----|------|--------------|----------|
| `expository` | Expository (walk through the text) | Hook → Context (who, when, why) → Read the passage → Point 1: explain / illustrate / apply → Point 2 → Point 3 → Big idea restated → Call to action → Close / prayer | Preaching a passage |
| `topical` | Topical three points | Hook → Big idea → Point 1 with scripture → Point 2 → Point 3 → Application → Close | A theme across passages |
| `textual` | One verse | Hook → Read the verse → Word by word → What it meant then → What it means now → Do this → Close | Short devotionals |
| `narrative` | Tell the story | Setting → Tension rises → Turning point → Resolution → So what for us → Close | Bible stories, testimonies |
| `me_we_god_you_we` | Me → We → God → You → We | My story (Me) → Our shared tension (We) → What God says (God) → What you do this week (You) → Imagine if we all did (We) | Youth talks, communicators who lead with story |
| `hook_book_look_took` | Hook, Book, Look, Took | Hook → Book (the text) → Look (what it means) → Took (what we take home) | Youth lessons |
| `problem_solution` | Motivated sequence | Attention → Need / problem → Solution → Picture the result → Action | General public speaking, pitches |
| `story_point_story` | Story – Point – Story | Opening story → The point → Scripture → Closing story that lands the point → Close | Short talks |
| `five_minute` | Five-minute devotional / toast | Hook → One verse or one idea → One illustration → One ask → Close | Openers, meals, meetings |
| `flow` | Word flow (blank) | Empty ordered list of cards; you add headings in the order you will speak them | Anyone with their own method |

Templates are data, not code, so you can edit any of them in the app and "Save as template" your own (that function already exists in the Sunday builder).

### Screens

**`/talks`** — list of talks, tabs: Drafts · Upcoming · Past · Templates. Search by title. Same list component as Sundays with `kind = 'talk'`.

**`/talks/new`** — pick a template from cards (name, one line, mini outline preview), then title, date, target length, audience/venue (optional). Creating clones the template's sections exactly like `/itineraries/new` does today, scaling durations to the target.

**`/talks/[id]/edit`** — the Builder.
- Big idea pinned at the top (edit inline).
- Outline: the cards as collapsed rows (type icon · headline · minutes). Drag to reorder, duplicate, delete, add a card of a given type.
- Card editor: headline, **Say** (large text area, simple markdown, Bible refs like "Rom 8:28" auto-linked), **Cues**, **Notes**, target minutes.
- Total-time bar: planned minutes vs target, red when over.
- Actions: **Rehearse**, **Present**, Save as template, Print notes (a one-page paper backup).

**`/talks/[id]/present`** — Presenter mode. This is the Sunday app's Leader Mode with the group-specific panels removed and the reading experience made first-class.
- Full screen, no site nav or ScoreBar, wake lock on, optional dim/black-out toggle.
- Card headline large, **Say** text at a font size you set once (persisted), cues in a dim strip, next card's headline in a small "Next:" line at the bottom.
- Timers: card countdown (amber at 1 min, red when over), total elapsed vs target, pace line ("1:30 ahead", "3:00 behind").
- Progress dots across the top; tap a dot to jump.
- Running state (current card, start times) lives in React state + `localStorage`, **not** in the `completed` flags, so a refresh resumes where you were and the same talk can be rehearsed any number of times. When you finish (or tap End), a `talk_runs` row is written with per-card actual times.
- A "Live" vs "Rehearsal" switch on the start screen only affects how the run is labelled.

**`/talks/[id]/runs`** — the last runs: planned vs actual per card as simple bars, total time per run, so you can see which card always runs long.

### Turning pages without looking down

**Volume buttons, honestly:** a web page or PWA cannot see the phone's volume buttons on iOS or Android. There is no event, and the volume level cannot be read. So in the web app the volume buttons cannot flip cards. Here is what does work, in the order I would build it:

1. **Big tap zones and swipe (v1, no hardware).** Right two-thirds of the screen = next, left third = back, anywhere on the top bar = pause. Swipe works too. A short vibration confirms the flip on Android, so you can do it by feel with the phone in your hand or on the lectern.

2. **Bluetooth clicker or foot pedal (v1, just keyboard handling).** Presenter remotes (the kind used for slides) and page-turner pedals (the kind musicians use) pair with a phone as a keyboard and send PageDown / PageUp / arrow keys / Space. Presenter mode handles all of those. Works on iOS and Android today. This is the closest thing to "a button I can press without looking" that is reliable on both platforms. Note: the cheap $10 "camera shutter" buttons send a volume-up key; that reaches the web page as a key event on Android only, so prefer a real presenter remote or pedal.

3. **Earbud and headset buttons via the Media Session API (v1, small effort).** Presenter mode plays a silent looping audio track and registers `nexttrack` / `previoustrack` / `play` / `pause` handlers. The next/previous buttons on AirPods, Bluetooth earbuds, wired inline remotes, and tiny Bluetooth media remotes then flip cards, on iOS and Android, from the web app. Volume up/down on those still only changes volume.

4. **Actual volume buttons on Android (v2, native wrapper).** Wrap the same Next.js app with Capacitor. On Android a tiny plugin overrides `onKeyDown` for `KEYCODE_VOLUME_UP` / `KEYCODE_VOLUME_DOWN` while the presenter screen is open and dispatches next/back to the web view. This is fully supported and reliable. On iOS, Apple does not allow apps to repurpose the volume buttons; the only known trick (watching the audio session's output volume) is fragile and gets apps rejected, so on iOS you use options 1–3. Because it is the same web app inside the wrapper, nothing is duplicated.

Recommendation: ship 1–3 with the first version. Add 4 if you carry an Android phone and want the volume rocker specifically.

### Shared with the Sunday app

- Extract the presenter core (timers, pace, wake lock, tap zones, key handling, media-session hook) into `components/present/PresenterShell.tsx`. Leader Mode uses it too (this is Plan 1, Phase 3), so both apps get the same timer, gestures, and clicker support.
- Builder pieces (section row, reorder, duplicate, save as template) become shared components with a `kind` prop.
- `lib/templates.ts` holds the talk template definitions used by the seed SQL and by a "Restore default templates" admin action.

### Milestones

| # | Milestone | Size | Deliverable |
|---|-----------|------|-------------|
| M1 | Schema + isolation | S | `v10_talks.sql`; Sunday app filters `kind = 'sunday'`; talk templates seeded. |
| M2 | Talks list, new, edit | M | `/talks`, `/talks/new`, `/talks/[id]/edit` reusing builder components. |
| M3 | Presenter mode | M | `PresenterShell` with timers, pace, tap/swipe/keys, wake lock, Media Session earbud control, `talk_runs` recorded. Leader Mode switched to the same shell. |
| M4 | Runs + print | S | `/talks/[id]/runs`, print stylesheet for a paper backup. |
| M5 | Second deployment | S | `NEXT_PUBLIC_APP_MODE=speak` Vercel project, own manifest and icon, own home and nav. |
| M6 | Android volume buttons | M | Capacitor wrapper + volume-key plugin (optional). |

### Open questions for you

- **Name** for the second app (the manifest name and icon need it).
- **Bible text**: should the Scripture card fetch and show the passage text (needs a Bible API and translation choice), or just the reference?
- **Do you carry Android or iPhone on stage?** That decides whether M6 is worth doing.
- **Should talks be visible from the Sunday app** (for example, a "Talk" section type that opens a talk from inside Leader Mode)? Cheap to add later since it is the same table.
