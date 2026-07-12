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
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    (async () => {
      const [{ data: it }, { data: t }, { data: s }, { data: r }] = await Promise.all([
        supabase.from("itineraries").select("*").eq("id", id).single(),
        supabase.from("teams").select("*").order("name"),
        supabase.from("students").select("*").order("name"),
        supabase.from("memory_verse_recites").select("student_id").eq("itinerary_id", id),
      ]);
      setIt(it as any); setTeams((t ?? []) as any); setStudents((s ?? []) as any);
      setDone(new Set((r ?? []).map((x: any) => x.student_id)));
    })();
  }, [id]);

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

  const applyPoints = async () => {
    for (const t of teams) {
      const count = students.filter((s) => s.team_id === t.id && done.has(s.id)).length;
      if (count > 0) {
        await supabase.from("score_events").insert({ team_id: t.id, itinerary_id: id, points: count, reason: "Memory verse recites" });
        await supabase.from("teams").update({ total_score: t.total_score + count }).eq("id", t.id);
      }
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  if (!it) return <p>Loading…</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1>Memory Verse Check</h1>
        <Link href={`/itineraries/${id}/lead`} className="btn btn-ghost">← Leader</Link>
      </div>

      {it.memory_verse && (
        <div className="card p-4">
          <div className="text-xs text-[#9fb0d3]">This week's verse</div>
          <div className="italic mt-1 whitespace-pre-line">{it.memory_verse}</div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        {teams.map((t) => {
          const teamStudents = students.filter((s) => s.team_id === t.id);
          const count = teamStudents.filter((s) => done.has(s.id)).length;
          return (
            <div key={t.id} className="card p-3">
              <div className="flex items-center justify-between">
                <div className="font-bold">{t.icon} {t.name}</div>
                <div className="text-2xl font-mono">{count}</div>
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

      <button onClick={applyPoints} className="btn btn-primary btn-lg w-full">
        {saved ? "Points added ✓" : "Add points to team totals"}
      </button>
      <p className="text-xs text-[#9fb0d3]">1 point per successful recital. Pressing again will add them again — only press once.</p>
    </div>
  );
}
