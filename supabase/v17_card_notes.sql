-- v17: in-depth notes for coming back to a message later. Shown only on the
-- deck editor's Notes tab, never in the presenter. Safe to re-run.
alter table cue_cards add column if not exists notes text;   -- per card
alter table cue_decks add column if not exists notes text;   -- about the whole message
