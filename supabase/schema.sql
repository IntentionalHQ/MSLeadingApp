-- ============================================================
-- MS Leading App — Supabase schema
-- Paste this into the Supabase SQL editor and Run.
-- Single-leader MVP: RLS disabled (unguarded URL).
-- ============================================================

-- Reset (safe on fresh project; drops MVP tables only)
drop table if exists summaries cascade;
drop table if exists game_results cascade;
drop table if exists score_events cascade;
drop table if exists memory_verse_recites cascade;
drop table if exists question_game_uses cascade;
drop table if exists questions cascade;
drop table if exists students cascade;
drop table if exists teams cascade;
drop table if exists itinerary_sections cascade;
drop table if exists itineraries cascade;

create extension if not exists "pgcrypto";

-- --------- Itineraries ---------
create table itineraries (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  lesson_title text,
  bible_passage text,
  memory_verse text,
  scheduled_date date,
  is_template boolean not null default false,
  created_at timestamptz not null default now()
);

create table itinerary_sections (
  id uuid primary key default gen_random_uuid(),
  itinerary_id uuid not null references itineraries(id) on delete cascade,
  position int not null,
  title text not null,
  section_type text not null,           -- free_hangout|rules|memory_verse|bible_reading|discussion|prayer|memory_verse_check|group_game|custom|score_recording
  start_time text,                       -- e.g. "10:30 AM"
  duration_minutes int,
  instructions text,
  script text,
  discussion_questions text,
  notes text,
  completed boolean not null default false
);
create index on itinerary_sections (itinerary_id, position);

-- --------- Teams / Students ---------
create table teams (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  mascot text,
  icon text,
  total_score int not null default 0,
  created_at timestamptz not null default now()
);

create table students (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  team_id uuid references teams(id) on delete set null,
  created_at timestamptz not null default now()
);
create index on students (team_id);

create table score_events (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams(id) on delete cascade,
  itinerary_id uuid references itineraries(id) on delete set null,
  points int not null,
  reason text,
  created_at timestamptz not null default now()
);
create index on score_events (team_id, created_at desc);

create table memory_verse_recites (
  id uuid primary key default gen_random_uuid(),
  itinerary_id uuid not null references itineraries(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  success boolean not null default true,
  created_at timestamptz not null default now(),
  unique (itinerary_id, student_id)
);

-- --------- Questions (shared bank) ---------
create table questions (
  id uuid primary key default gen_random_uuid(),
  text text not null,
  correct_answer text not null,
  difficulty text not null,             -- single | double | triple | home_run
  format text not null default 'multiple_choice', -- multiple_choice | open_answer
  choices jsonb,                         -- ["A) ...","B) ...","C) ...","D) ..."] or null
  testament text,                        -- OT | NT | null
  topic text,
  source text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index on questions (difficulty, active);

create table question_game_uses (
  question_id uuid not null references questions(id) on delete cascade,
  game_type text not null,               -- bible_baseball | four_corners | ...
  role text,                              -- e.g. "single","double","triple","home_run"
  primary key (question_id, game_type)
);

-- --------- Games / Summaries ---------
create table game_results (
  id uuid primary key default gen_random_uuid(),
  itinerary_id uuid references itineraries(id) on delete set null,
  game_type text not null,
  team_a_id uuid references teams(id),
  team_b_id uuid references teams(id),
  team_a_score int not null default 0,
  team_b_score int not null default 0,
  winner_team_id uuid references teams(id),
  details jsonb,
  played_at timestamptz not null default now()
);

create table summaries (
  id uuid primary key default gen_random_uuid(),
  itinerary_id uuid references itineraries(id) on delete set null,
  date date not null default (now() at time zone 'utc')::date,
  lesson_title text,
  bible_passage text,
  memory_verse text,
  game_played text,
  winning_team_id uuid references teams(id),
  team_points jsonb,                     -- {team_id: {name,points_this_group,memory_verse_success,new_total}}
  leader_notes text,
  created_at timestamptz not null default now()
);

-- --------- Disable RLS (MVP: unguarded URL) ---------
alter table itineraries disable row level security;
alter table itinerary_sections disable row level security;
alter table teams disable row level security;
alter table students disable row level security;
alter table score_events disable row level security;
alter table memory_verse_recites disable row level security;
alter table questions disable row level security;
alter table question_game_uses disable row level security;
alter table game_results disable row level security;
alter table summaries disable row level security;

-- --------- Seed: default teams ---------
insert into teams (name, mascot, icon) values
  ('Bears', 'Grizzlies', '🐻'),
  ('Dinos', 'Raptors', '🦖')
on conflict (name) do nothing;

-- --------- Seed: default itinerary template ---------
do $$
declare tid uuid;
begin
  insert into itineraries (title, is_template)
  values ('Default Sunday Template', true)
  returning id into tid;

  insert into itinerary_sections (itinerary_id, position, title, section_type, duration_minutes, instructions) values
    (tid, 0, 'Free Hangout', 'free_hangout', 10, 'Greet students, casual chat. Snacks out.'),
    (tid, 1, 'Rules / Reset', 'rules', 5, 'Set expectations. Phones away. Respect each other.'),
    (tid, 2, 'Memory Verse', 'memory_verse', 5, 'Introduce this week''s verse. Say it together 3x.'),
    (tid, 3, 'Bible Reading', 'bible_reading', 10, 'Read the passage. Ask 1–2 students to read verses.'),
    (tid, 4, 'Say / Mean / Do Discussion', 'discussion', 15, 'What does it SAY? What does it MEAN? What do we DO?'),
    (tid, 5, 'Prayer', 'prayer', 5, 'Take requests, then pray.'),
    (tid, 6, 'Memory Verse Check', 'memory_verse_check', 10, 'Each student who recites the verse fully earns 1 pt for their team.'),
    (tid, 7, 'Group Game', 'group_game', 20, 'Play the selected game.'),
    (tid, 8, 'End-of-Group Score Recording', 'score_recording', 5, 'Record scores and save summary.');
end$$;
