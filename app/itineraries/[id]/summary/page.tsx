"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { Itinerary, Team } from "@/lib/types";

export default function SummaryPage() {
  const { id } = useParams<{ id: string }>();
  const [it, setIt] = useState<Itinerary | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [game, setGame] = useState<any | null>(null);
  const [verseCounts, setVerseCounts] = useState<Record<string, number>>({});
  const [pointsEarned, setPointsEarned] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    (async () => {
      const [{ data: it }, { data: t }, { data: g }, { data: recs }, { data: events }] = await Promise.all([
        supabase.from("itineraries").select("*").eq("id", id).single(),
        supabase.from("teams").select("*").order("name"),
        supabase.from("game_results").select("*").eq("itinerary_id", id).order("played_at", { ascending: false }).limit(1).maybeSingle(),
        supabase.from("memory_verse_recites").select("student_id").eq("itinerary_id", id),
        supabase.from("score_events").select("*").eq("itinerary_id", id),
      ]);
      setIt(it as any); setTeams((t ?? []) as any); setGame(g);
      // Verse counts per team
      const { data: students } = await supabase.from("students").select("*");
      const counts: Record<string, number> = {};
      for (const r of (recs ?? [])) {
        const s = (students ?? []).find((x: any) => x.id === r.student_id);
        if (s?.team_id) counts[s.team_id] = (counts[s.team_id] || 0) + 1;
      }
      setVerseCounts(counts);
      // Points earned per team this itinerary
      const p: Record<string, number> = {};
      for (const e of (events ?? [])) p[e.team_id] = (p[e.team_id] || 0) + e.points;
      setPointsEarned(p);
    })();
  }, [id]);

  const save = async () => {
    if (!it) return;
    const teamPoints: any = {};
    for (const t of teams) {
      teamPoints[t.id] = {
        name: t.name,
        points_this_group: pointsEarned[t.id] ?? 0,
        memory_verse_success: verseCounts[t.id] ?? 0,
        new_total: t.total_score,
      };
    }
    await supabase.from("summaries").insert({
      itinerary_id: id,
      date: it.scheduled_date ?? new Date().toISOString().slice(0, 10),
      lesson_title: it.lesson_title, bible_passage: it.bible_passage, memory_verse: it.memory_verse,
      game_played: game ? "Bible Baseball" : null,
      winning_team_id: game?.winner_team_id ?? null,
      team_points: teamPoints,
      leader_notes: notes || null,
    });
    setSaved(true);
  };

  if (!it) return <p>Loading…</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1>End-of-Group Summary</h1>
        <Link href={`/itineraries/${id}/lead`} className="btn btn-ghost">← Leader</Link>
      </div>
      <div className="card p-4 space-y-1">
        <div><span className="text-[#9fb0d3] text-sm">Date:</span> {it.scheduled_date ?? "—"}</div>
        <div><span className="text-[#9fb0d3] text-sm">Lesson:</span> {it.lesson_title ?? "—"}</div>
        <div><span className="text-[#9fb0d3] text-sm">Passage:</span> {it.bible_passage ?? "—"}</div>
        <div><span className="text-[#9fb0d3] text-sm">Game:</span> {game ? "Bible Baseball" : "—"}</div>
        <div><span className="text-[#9fb0d3] text-sm">Winner:</span> {game?.winner_team_id ? teams.find((t) => t.id === game.winner_team_id)?.name ?? "?" : "—"}</div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {teams.map((t) => (
          <div key={t.id} className="card p-3 text-center">
            <div className="text-2xl">{t.icon}</div>
            <div className="font-bold">{t.name}</div>
            <div className="text-sm mt-1">Points this group: <b>{pointsEarned[t.id] ?? 0}</b></div>
            <div className="text-sm">Verse recites: <b>{verseCounts[t.id] ?? 0}</b></div>
            <div className="text-sm">New total: <b>{t.total_score}</b></div>
          </div>
        ))}
      </div>

      <div className="card p-3">
        <label>Leader notes</label>
        <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="How did it go?" />
      </div>

      <button onClick={save} disabled={saved} className="btn btn-primary btn-lg w-full">
        {saved ? "Saved ✓" : "Save Summary"}
      </button>
    </div>
  );
}
