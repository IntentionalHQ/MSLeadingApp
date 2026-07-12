-- Disable Row-Level Security for MVP (single unguarded leader).
-- Run once in Supabase SQL editor. Add real policies later if you add auth.
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
