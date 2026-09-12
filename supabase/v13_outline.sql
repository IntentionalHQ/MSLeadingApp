-- v13: outline maker timeline + lead-session tracking
alter table itineraries add column if not exists start_time text;      -- "10:30 AM", null = no timeline
alter table itineraries add column if not exists slot_minutes int;      -- length of the group slot, e.g. 60
alter table itineraries add column if not exists led_at timestamptz;    -- when the leader last pressed Start
alter table itinerary_sections add column if not exists completed_at timestamptz;
