-- v15: cue card decks. A deck is a standalone set of stage-ready speaking
-- cards (made on the Cards tab); a Cue Cards section in a Sunday links to one.
create table if not exists cue_decks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  passage text,                           -- e.g. "Mark 5:21-43"
  subtitle text,                          -- e.g. "Youth Group Message · 15-20 min"
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists cue_cards (
  id uuid primary key default gen_random_uuid(),
  deck_id uuid not null references cue_decks(id) on delete cascade,
  position int not null,
  title text not null default '',
  scripture_ref text,
  bullets jsonb not null default '[]'::jsonb,  -- [{id, text, symbols[], color}]
  key_line text,
  transition text
);
create index if not exists cue_cards_deck_position on cue_cards (deck_id, position);

alter table itinerary_sections add column if not exists cue_deck_id uuid references cue_decks(id) on delete set null;

-- Same open policy every other table has (see enable_rls_permissive.sql).
alter table cue_decks enable row level security;
drop policy if exists cue_decks_allow_all on cue_decks;
create policy cue_decks_allow_all on cue_decks for all to anon, authenticated using (true) with check (true);

alter table cue_cards enable row level security;
drop policy if exists cue_cards_allow_all on cue_cards;
create policy cue_cards_allow_all on cue_cards for all to anon, authenticated using (true) with check (true);
