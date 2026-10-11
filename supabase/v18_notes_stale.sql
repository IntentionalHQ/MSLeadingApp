-- v18: "card changed, are the notes still good?" flag. Set when a card's
-- presented content is edited after notes exist; cleared when the notes are
-- saved or confirmed. Editor only. Safe to re-run.
alter table cue_cards add column if not exists notes_stale boolean not null default false;
