// Seed demo data via the Supabase JS client. Requires the schema to already be run.
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";

const env = fs.readFileSync(".env.local", "utf8");
const get = (k) => env.match(new RegExp(k + "=(.*)"))?.[1]?.trim();
const url = get("NEXT_PUBLIC_SUPABASE_URL");
const key = get("NEXT_PUBLIC_SUPABASE_ANON_KEY");
const supa = createClient(url, key, { auth: { persistSession: false } });

async function main() {
  // Sanity: can we read teams?
  const { data: teams, error } = await supa.from("teams").select("*");
  if (error) {
    console.error("❌ Cannot read `teams`. Did you run supabase/schema.sql?");
    console.error(error.message);
    process.exit(1);
  }
  if (!teams.length) {
    console.error("❌ No teams. Did you run supabase/schema.sql?");
    process.exit(1);
  }
  const bears = teams.find((t) => t.name === "Bears");
  const dinos = teams.find((t) => t.name === "Dinos");
  if (!bears || !dinos) { console.error("Missing Bears/Dinos"); process.exit(1); }

  // Seed students
  const bearsKids = ["Ava", "Ben", "Caleb", "Daisy", "Ethan"];
  const dinosKids = ["Faith", "Gabe", "Hannah", "Ivan", "Jade"];
  await supa.from("students").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  const rows = [
    ...bearsKids.map((n) => ({ name: n, team_id: bears.id })),
    ...dinosKids.map((n) => ({ name: n, team_id: dinos.id })),
  ];
  const { error: sErr } = await supa.from("students").insert(rows);
  if (sErr) { console.error(sErr.message); process.exit(1); }

  // Give the teams some starting points so the top-of-screen scorebar isn't 0-0
  await supa.from("teams").update({ total_score: 12 }).eq("id", bears.id);
  await supa.from("teams").update({ total_score: 15 }).eq("id", dinos.id);
  await supa.from("score_events").insert([
    { team_id: bears.id, points: 5, reason: "Memory verse recites" },
    { team_id: dinos.id, points: 7, reason: "Memory verse recites" },
    { team_id: bears.id, points: 7, reason: "Bible Baseball runs" },
    { team_id: dinos.id, points: 8, reason: "Bible Baseball win" },
  ]);

  // Grab the template
  const { data: templates } = await supa.from("itineraries").select("*").eq("is_template", true).limit(1);
  const tmpl = templates?.[0];
  if (!tmpl) { console.error("No default template found — schema seed didn't run?"); process.exit(1); }

  // Wipe any prior demo Sunday so we always seed from the current template
  await supa.from("itineraries").delete().eq("is_template", false).ilike("title", "Demo Sunday%");

  // Create a demo Sunday from the template
  const { data: it, error: itErr } = await supa.from("itineraries").insert({
    title: "Demo Sunday — The Prodigal Son",
    lesson_title: "The Prodigal Son",
    bible_passage: "Luke 15:11–32",
    memory_verse: "\"For this son of mine was dead and is alive again; he was lost and is found.\" — Luke 15:24",
    scheduled_date: new Date().toISOString().slice(0, 10),
    is_template: false,
  }).select().single();
  if (itErr) { console.error(itErr.message); process.exit(1); }

  // Clone template sections
  const { data: srcSections } = await supa.from("itinerary_sections").select("*").eq("itinerary_id", tmpl.id).order("position");
  const clones = srcSections.map((s) => ({
    itinerary_id: it.id,
    position: s.position, title: s.title, section_type: s.section_type,
    start_time: s.start_time, duration_minutes: s.duration_minutes,
    instructions: s.instructions, script: s.script,
    discussion_questions: s.discussion_questions, notes: s.notes,
    completed: false,
  }));
  // Mark first two as already completed so leader mode opens partway through
  clones[0].completed = true;
  clones[1].completed = true;
  await supa.from("itinerary_sections").insert(clones);

  console.log("✅ Demo Sunday created:", it.title);
  console.log("   URL:  /itineraries/" + it.id + "/lead");
}

main().catch((e) => { console.error(e); process.exit(1); });
