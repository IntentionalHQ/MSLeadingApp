"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { Itinerary, Team, Student } from "@/lib/types";

export default function VerseCheckPage() {
  const { id } = useParams<{ id: string }>();
  const [it, setIt] = useState<Itinerary | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [done, setDone] = useState<Set<string>>(new Set());
  // How many points were already applied to each team for THIS itinerary via memory verse.
  const [applied, setApplied] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);
  const [flash, setFlash] = useState("");

  const load = async () => {
    const [{ data: it }, { data: t }, { data: s }, { data: r }, { data: events }] = await Promise.all([
      supabase.from("itineraries").select("*").eq("id", id).single(),
      supabase.from("teams").select("*").order("name"),
      supabase.from("students").select("*").order("name"),
      supabase.from("memory_verse_recites").select("student_id").eq("itinerary_id", id),
      supabase.from("score_events").select("team_id,points").eq("itinerary_id", id).eq("reason", "Memory verse recites"),
    ]);
    setIt(it as any); setTeams((t ?? []) as any); setStudents((s ?? []) as any);
    setDone(new Set((r ?? []).map((x: any) => x.student_id)));
    const a: Record<string, number> = {};
    for (const e of (events ?? [])) a[e.team_id] = (a[e.team_id] || 0) + e.points;
    setApplied(a);
  };
  useEffect(() => { load(); }, [id]);

  const toggle = async (studentId: string) => {
    const next = new Set(done);
    if (next.has(studentId)) {
      next.delete(studentId);
      await supabase.from("memory_verse_recites").delete().eq("itinerary_id", id).eq("student_id", studentId);
    } else {
      next.add(studentId);
      await supabase.from("memory_verse_recites").upsert({ itinerary_id: id, student_id: studentId, success: true });
    }
    setDone(next);
  };

  // Bump / lower the applied count for a team without needing per-student checks
  // (e.g. an extra kid we forgot to enter). Adjusts total_score by the delta.
  const bump = async (teamId: string, delta: number) => {
    const team = teams.find((x) => x.id === teamId);
    if (!team) return;
    const cur = applied[teamId] ?? 0;
    const next = Math.max(0, cur + delta);
    const diff = next - cur;
    if (diff === 0) return;
    await supabase.from("score_events").insert({ team_id: teamId, itinerary_id: id, points: diff, reason: "Memory verse recites" });
    await supabase.from("teams").update({ total_score: team.total_score + diff }).eq("id", teamId);
    setApplied({ ...applied, [teamId]: next });
    setTeams(teams.map((x) => (x.id === teamId ? { ...x, total_score: x.total_score + diff } : x)));
  };

  const syncFromChecks = async () => {
    setSaving(true);
    for (const t of teams) {
      const target = students.filter((s) => s.team_id === t.id && done.has(s.id)).length;
      const cur = applied[t.id] ?? 0;
      const diff = target - cur;
      if (diff !== 0) {
        await supabase.from("score_events").insert({ team_id: t.id, itinerary_id: id, points: diff, reason: "Memory verse recites" });
        await supabase.from("teams").update({ total_score: t.total_score + diff }).eq("id", t.id);
      }
    }
    setFlash("Synced to team totals ✓");
    setTimeout(() => setFlash(""), 2500);
    setSaving(false);
    load();
  };

  if (!it) return <p>Loading…</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1>Memory Verse Check</h1>
        <Link href={`/itineraries/${id}/lead`} className="btn btn-ghost">← Leader</Link>
      </div>

      {it.memory_verse && (
        <div className="card p-4 border-yellow-600">
          <div className="text-xs text-yellow-500">This week's verse</div>
          <div className="italic mt-1 whitespace-pre-line text-lg">{it.memory_verse}</div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        {teams.map((t) => {
          const teamStudents = students.filter((s) => s.team_id === t.id);
          const count = teamStudents.filter((s) => done.has(s.id)).length;
          const wasApplied = applied[t.id] ?? 0;
          return (
            <div key={t.id} className="card p-3">
              <div className="flex items-center justify-between">
                <div className="font-bold">{t.icon} {t.name}</div>
                <div className="text-2xl font-mono">{count}</div>
              </div>
              <div className="text-xs text-[#9fb0d3] mt-1">
                Applied so far: <span className="font-mono">{wasApplied}</span>
              </div>
              <div className="flex gap-1 mt-2">
                <button onClick={() => bump(t.id, -1)} className="btn btn-ghost flex-1">−1</button>
                <button onClick={() => bump(t.id, +1)} className="btn btn-ghost flex-1">+1</button>
              </div>
              <ul className="mt-2 space-y-1">
                {teamStudents.map((s) => (
                  <li key={s.id}>
                    <button onClick={() => toggle(s.id)} className={"w-full text-left p-2 rounded " + (done.has(s.id) ? "bg-green-700/40 border border-green-500" : "bg-[#0b1220] border border-[#1f2a44]")}>
                      {done.has(s.id) ? "✅ " : "☐ "}{s.name}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      <button onClick={syncFromChecks} disabled={saving} className="btn btn-primary btn-lg w-full">
        {flash || "Sync check-marks → team totals"}
      </button>
      <p className="text-xs text-[#9fb0d3]">Adjusts each team's applied points to match how many students are checked. Safe to press multiple times — it only applies the difference.</p>
    </div>
  );
}
