-- v21: a name per section colour on a deck ("yellow" = "Opening"), shown in
-- the presenter's where-you-are line. Safe to re-run.
alter table cue_decks add column if not exists section_names jsonb not null default '{}'::jsonb;
