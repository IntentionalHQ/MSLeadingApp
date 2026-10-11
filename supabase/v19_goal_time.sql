-- v19: goal time for a deck. The presenter counts down from it next to the
-- elapsed clock, green -> yellow -> orange-red (last 10%) -> red when over.
alter table cue_decks add column if not exists goal_minutes int;
