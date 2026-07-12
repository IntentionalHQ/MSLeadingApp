# MS Leading App — Setup

Fast, cheap, single-leader Sunday-school app: Next.js + Supabase + Vercel.

## 1. Supabase (5 min)

1. Go to your project → SQL Editor.
2. Paste and Run `supabase/schema.sql`.
3. Paste and Run `supabase/seed_questions.sql` (404 Bible Baseball questions from your xlsx).

That's it — the schema seeds default Bears/Dinos teams and a Default Sunday Template.

## 2. Local dev

```bash
npm run dev
```

Open http://localhost:3000.

Env is in `.env.local`; both URL and publishable key are already set.

## 3. Deploy to Vercel

```bash
npx vercel      # first time: link the repo
npx vercel --prod
```

In the Vercel dashboard for the project, add these env vars (same as `.env.local`):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Screens

| Path | Purpose |
| ---- | ------- |
| `/` | Dashboard |
| `/itineraries` | List all Sundays |
| `/itineraries/new` | Create Sunday (from template or previous) |
| `/itineraries/[id]/edit` | Itinerary Builder |
| `/itineraries/[id]/lead` | Leader Mode |
| `/itineraries/[id]/verse` | Memory Verse Check |
| `/itineraries/[id]/baseball` | Bible Baseball |
| `/itineraries/[id]/summary` | End-of-group summary |
| `/teams` | Teams & students, +/- points |
| `/summaries` | History of past Sundays |
| `/admin/questions` | Shared question bank (all games pull from here) |

## Re-import questions later

Update the xlsx, then:

```bash
node scripts/import_questions.mjs "path/to/updated.xlsx"
```

Paste the regenerated `supabase/seed_questions.sql` into Supabase SQL Editor.

Or just edit questions in the app at `/admin/questions`.

## Adding a new game

The `questions` table is game-agnostic. Each game filters by whatever it needs (difficulty, format, tags). Use `question_game_uses(question_id, game_type, role)` if one question needs a different "role" in a different game.
