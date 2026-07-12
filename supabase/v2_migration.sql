-- ============================================================
-- v2 migration
-- Run in Supabase SQL editor AFTER schema.sql + seed_questions.sql.
-- Adds: contests, group_game selection on sections, richer default template,
--       outline_review section type, memory_verse_check-before-bible_reading.
-- Safe to re-run.
-- ============================================================

-- --- Add "chosen game" to group_game sections ---
alter table itinerary_sections
  add column if not exists chosen_game text; -- e.g. 'bible_baseball'

-- --- Contests ---
create table if not exists contests (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  start_date date,
  end_date date,
  weeks int,
  status text not null default 'active',        -- active | archived
  snapshot jsonb,                                -- filled when archived
  created_at timestamptz not null default now(),
  archived_at timestamptz
);
alter table contests disable row level security;

-- Only one active contest at a time (partial unique index)
create unique index if not exists contests_one_active
  on contests (status) where status = 'active';

-- Teams get an optional contest link
alter table teams add column if not exists contest_id uuid references contests(id) on delete set null;
alter table score_events add column if not exists contest_id uuid references contests(id) on delete set null;

-- --- Rewrite default template with real content ---
delete from itinerary_sections
 where itinerary_id in (select id from itineraries where is_template = true and title = 'Default Sunday Template');
delete from itineraries where is_template = true and title = 'Default Sunday Template';

do $$
declare tid uuid;
begin
  insert into itineraries (title, is_template) values ('Default Sunday Template', true) returning id into tid;

  insert into itinerary_sections (itinerary_id, position, title, section_type, duration_minutes, instructions, script) values
    (tid, 0, 'Outline Review', 'custom', 3,
      'Quickly walk the group through what we''ll do today so they know what to expect. Point at each section, name it, one sentence each.',
      'Here''s the plan: hang out, cover the rules, do our memory verse and check-in, read the passage, talk about it, pray, and then Bible Baseball.'),

    (tid, 1, 'Free Hangout', 'free_hangout', 8,
      'Greet each student as they walk in. Snacks out. Casual chat only — no lesson yet. Set a timer so this doesn''t bleed into teaching time.',
      null),

    (tid, 2, 'Rules / Reset', 'rules', 4,
      'Reset expectations. Keep it short and repeat every week — repetition is the point.',
      'Three rules for group: 1) Phones stay away unless we say otherwise. 2) One voice at a time — if someone else is talking, you''re listening. 3) Respect. No put-downs, no side comments. If you break a rule your team loses a point. If you follow them all group, your team earns a point.'),

    (tid, 3, 'Memory Verse', 'memory_verse', 5,
      'Introduce this week''s verse. Read it out loud together three times. Then have two students try it from memory as a warm-up.',
      'This is our verse for the week. We''re going to say it together three times, then check it after the reading.'),

    (tid, 4, 'Memory Verse Check', 'memory_verse_check', 8,
      'Each student who can recite the full verse earns 1 point for their team. Track it in the app. Don''t rush — give quiet kids time.',
      null),

    (tid, 5, 'Bible Reading', 'bible_reading', 10,
      'Read today''s passage. Have two students read alternate verses if possible. If the passage is long, break it up between readers.',
      null),

    (tid, 6, 'Say / Mean / Do Discussion', 'discussion', 15,
      'Walk the SAY / MEAN / DO framework. Say = what does the passage literally say. Mean = what does it mean, in context. Do = what should we do because of it.',
      null),

    (tid, 7, 'Prayer', 'prayer', 5,
      'Take a few prayer requests. Assign a student to pray if any are willing, otherwise you close.',
      null),

    (tid, 8, 'Group Game', 'group_game', 20,
      'Play the selected game. Keep score in the app.',
      null),

    (tid, 9, 'End-of-Group Score Recording', 'score_recording', 3,
      'Announce final scores. Save the summary.',
      null);

  -- Default the group game to Bible Baseball
  update itinerary_sections set chosen_game = 'bible_baseball'
    where itinerary_id = tid and section_type = 'group_game';
end$$;
