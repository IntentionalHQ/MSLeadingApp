-- v5 migration — Bible Price Is Right question bank.
-- Separate table from `questions` because these have numeric targets, ranges,
-- and reference metadata. Safe on live data.

create table if not exists pir_questions (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  host_answer text,                         -- e.g. "About 75 pounds (34 kilograms)."
  accepted_answer text,                     -- e.g. "70–80 lb" or "Exact: 666"
  numeric_target numeric,                   -- e.g. 75, 666
  unit text,                                -- e.g. "lb", "talents", "years"
  category text,                            -- e.g. "Money & Value", "Ages & Time"
  background text,
  reference_1 text,
  reference_2 text,
  fact_type text,
  source_url text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists pir_questions_active_idx on pir_questions (active, category);

alter table pir_questions disable row level security;
