/* v12_0_rls_fix.sql
   The three newest game tables have row-level security ON with no policy, so the
   app's anon key sees zero rows and cannot insert. This gives them the same open
   policy every other table already has. Safe to re-run. */

alter table gtf_questions enable row level security;
drop policy if exists gtf_questions_allow_all on gtf_questions;
create policy gtf_questions_allow_all on gtf_questions for all to anon, authenticated using (true) with check (true);

alter table tf_questions enable row level security;
drop policy if exists tf_questions_allow_all on tf_questions;
create policy tf_questions_allow_all on tf_questions for all to anon, authenticated using (true) with check (true);

alter table verse_hunt_prompts enable row level security;
drop policy if exists verse_hunt_prompts_allow_all on verse_hunt_prompts;
create policy verse_hunt_prompts_allow_all on verse_hunt_prompts for all to anon, authenticated using (true) with check (true);
