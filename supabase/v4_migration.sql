-- v4 migration — shared prompt bank for word/drawing games.
-- Feeds Bible Pictionary and Bible Hangman (and later Bible Taboo).
-- Safe on live data.

create table if not exists game_prompts (
  id uuid primary key default gen_random_uuid(),
  text text not null,                                -- the answer: "Noah's Ark", "Moses", "Jericho"
  category text not null default 'other',            -- person | place | object | story | theme | other
  difficulty text not null default 'medium',         -- easy | medium | hard
  banned_words jsonb,                                -- for future Taboo use; nullable
  testament text,                                    -- OT | NT | null
  hint text,                                         -- optional short hint
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists game_prompts_active_idx on game_prompts (active, category, difficulty);

alter table game_prompts disable row level security;

-- Seed a starter set so the games work out of the box.
insert into game_prompts (text, category, difficulty, testament, hint) values
  ('Noah''s Ark', 'story', 'easy', 'OT', 'Two of every kind'),
  ('Moses', 'person', 'easy', 'OT', 'Parted the Red Sea'),
  ('David and Goliath', 'story', 'easy', 'OT', 'Shepherd boy vs. giant'),
  ('Jonah and the Whale', 'story', 'easy', 'OT', 'Swallowed for three days'),
  ('The Last Supper', 'story', 'medium', 'NT', 'Bread and wine'),
  ('Jericho', 'place', 'medium', 'OT', 'Walls came down'),
  ('Bethlehem', 'place', 'easy', 'NT', 'Birthplace of Jesus'),
  ('Burning Bush', 'object', 'medium', 'OT', 'Spoke to Moses'),
  ('Ten Commandments', 'object', 'easy', 'OT', 'Stone tablets'),
  ('Good Samaritan', 'story', 'medium', 'NT', 'Parable of a helper'),
  ('Fishers of Men', 'theme', 'medium', 'NT', 'Jesus'' call to disciples'),
  ('Garden of Eden', 'place', 'easy', 'OT', 'First garden'),
  ('Daniel in the Lions'' Den', 'story', 'medium', 'OT', 'Prayed anyway'),
  ('Prodigal Son', 'story', 'medium', 'NT', 'Came home'),
  ('Manna from Heaven', 'object', 'medium', 'OT', 'Bread in the wilderness'),
  ('Peter Walks on Water', 'story', 'hard', 'NT', 'Started to sink'),
  ('The Empty Tomb', 'object', 'easy', 'NT', 'He is risen'),
  ('Solomon', 'person', 'medium', 'OT', 'Asked for wisdom'),
  ('Ruth and Naomi', 'story', 'hard', 'OT', 'Where you go, I will go'),
  ('Nazareth', 'place', 'medium', 'NT', 'Where Jesus grew up')
on conflict do nothing;
