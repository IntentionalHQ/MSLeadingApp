-- v20: section colour per card, so cards from the same part of the message
-- read as a group in the editor, the presenter, and the Excel template.
alter table cue_cards add column if not exists color text;  -- yellow|green|blue|pink|purple|orange|null
