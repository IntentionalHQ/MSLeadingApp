-- ============================================================
-- v7 migration — Team Seasons
-- Run in the Supabase SQL editor after the earlier migrations.
-- Safe to re-run.
-- ============================================================
-- WHAT THIS ADDS:
--   * contests.duration_months  — how long a team season lasts (default 2).
--     Replaces "weeks" as the primary knob; weeks is kept for old rows.
--   * Drops the UNIQUE constraint on teams.name so each new season can rename
--     the same team rows to freshly-picked mascots without collisions.
--
-- The student roster is deliberately NOT touched: students persist across
-- seasons (only their team_id is cleared on reset), so re-assigning is easy.
-- ============================================================

-- --- Duration in months (default 2) ---
alter table contests add column if not exists duration_months int not null default 2;

-- Backfill duration_months from any legacy "weeks" value (≈ 4.345 weeks/month).
update contests
   set duration_months = greatest(1, round(weeks / 4.345)::int)
 where weeks is not null;

-- --- Allow renaming teams to new mascots each season ---
-- The seed created teams.name as UNIQUE; dropping it lets a season reuse a name
-- and lets both teams be updated without transient unique-violation errors.
alter table teams drop constraint if exists teams_name_key;
