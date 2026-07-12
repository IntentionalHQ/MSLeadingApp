-- v3 migration — content-only, safe on live data.
-- Removes the invented "three rules" script and leaves a placeholder so
-- the leader pastes their own rules once (in the itinerary editor).

update itinerary_sections
   set script = null,
       instructions = 'Paste your group''s actual rules script here (edit the section to fill in). Keep it short — repetition is the point.'
 where section_type = 'rules'
   and script like 'Three rules for group%';
