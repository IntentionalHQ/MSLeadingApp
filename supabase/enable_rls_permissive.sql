-- ============================================================
-- MS Leading App — Enable RLS with permissive (open) policies
-- ============================================================
-- WHY THIS EXISTS:
--   The Supabase dashboard shows a red "Unrestricted" badge on every
--   table that has RLS turned off. This file turns RLS ON (badge goes
--   green) while adding wide-open policies so the app keeps working.
--
-- WHAT THIS IS NOT:
--   This is NOT real security. The app authenticates with the PUBLIC
--   anon key (shipped in client JS), and these policies allow the anon
--   role to do everything. Anyone with the anon key can still read and
--   write every table — exactly as before. This only silences the badge.
--   To actually lock data down you need Supabase Auth + real policies,
--   which is a separate, larger change.
--
-- SAFE TO RE-RUN: every policy is dropped-if-exists before being created.
-- ============================================================

do $$
declare
  t text;
  tables text[] := array[
    'itineraries',
    'itinerary_sections',
    'teams',
    'students',
    'score_events',
    'memory_verse_recites',
    'questions',
    'question_game_uses',
    'game_results',
    'summaries',
    -- Tables added after schema.sql (PIR / games / contests features):
    'contests',
    'game_prompts',
    'pir_questions',
    -- Game banks added later (v8, v10, v11). Without these the anon key sees
    -- zero rows and the games silently fall back to their built-in lists.
    'gtf_questions',
    'tf_questions',
    'verse_hunt_prompts'
  ];
begin
  foreach t in array tables loop
    -- 1) Turn RLS on (this is what clears the red "Unrestricted" badge).
    execute format('alter table %I enable row level security;', t);

    -- 2) Add an open policy so the anon/authenticated roles can still do
    --    everything. `using (true)` allows reads/updates/deletes to see all
    --    rows; `with check (true)` allows any insert/update to pass.
    execute format('drop policy if exists %I on %I;', t || '_allow_all', t);
    execute format(
      'create policy %I on %I for all to anon, authenticated using (true) with check (true);',
      t || '_allow_all', t
    );
  end loop;
end$$;
