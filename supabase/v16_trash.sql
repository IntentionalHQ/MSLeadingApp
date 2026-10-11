-- v16: trash. Deleting a Sunday or a cue card deck sets deleted_at instead of
-- removing the row; "Recently deleted" lists them with Restore for 30 days,
-- after which the app purges them. Safe to re-run.
alter table itineraries add column if not exists deleted_at timestamptz;
alter table cue_decks add column if not exists deleted_at timestamptz;
