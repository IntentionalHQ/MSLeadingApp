-- v14: outline status shown as a tag on Home and the Sundays list
alter table itineraries add column if not exists status text; -- 'draft' | 'ready' | null (no tag)
