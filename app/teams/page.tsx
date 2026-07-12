"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Team, Student } from "@/lib/types";

export default function TeamsPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [newStudent, setNewStudent] = useState("");
  const [reason, setReason] = useState("");
  const [history, setHistory] = useState<any[]>([]);

  const load = async () => {
    const [{ data: t }, { data: s }, { data: h }] = await Promise.all([
      supabase.from("teams").select("*").order("name"),
      supabase.from("students").select("*").order("name"),
      supabase.from("score_events").select("*").order("created_at", { ascending: false }).limit(20),
    ]);
    setTeams((t ?? []) as any); setStudents((s ?? []) as any); setHistory(h ?? []);
  };
  useEffect(() => { load(); }, []);

  const addPoints = async (teamId: string, delta: number) => {
    await supabase.from("score_events").insert({ team_id: teamId, points: delta, reason: reason || null });
    const team = teams.find((t) => t.id === teamId);
    if (team) await supabase.from("teams").update({ total_score: team.total_score + delta }).eq("id", teamId);
    setReason(""); load();
  };

  const addStudent = async () => {
    if (!newStudent.trim()) return;
    await supabase.from("students").insert({ name: newStudent.trim() });
    setNewStudent(""); load();
  };

  const assign = async (studentId: string, teamId: string | null) => {
    await supabase.from("students").update({ team_id: teamId }).eq("id", studentId);
    load();
  };

  const randomAssign = async () => {
    const unassigned = students.filter((s) => !s.team_id);
    if (!unassigned.length || !teams.length) return;
    const shuffled = [...unassigned].sort(() => Math.random() - 0.5);
    for (let i = 0; i < shuffled.length; i++) {
      await supabase.from("students").update({ team_id: teams[i % teams.length].id }).eq("id", shuffled[i].id);
    }
    load();
  };

  const del = async (sid: string) => {
    if (!confirm("Remove student?")) return;
    await supabase.from("students").delete().eq("id", sid);
    load();
  };

  return (
    <div className="space-y-4">
      <h1>Teams & Students</h1>

      <div className="grid grid-cols-2 gap-3">
        {teams.map((t) => (
          <div key={t.id} className="card p-3">
            <div className="text-center text-3xl">{t.icon ?? "🏳️"}</div>
            <div className="text-center font-bold">{t.name}</div>
            <div className="text-center text-4xl font-mono my-2">{t.total_score}</div>
            <div className="flex gap-1 justify-center">
              <button onClick={() => addPoints(t.id, -1)} className="btn btn-ghost">-1</button>
              <button onClick={() => addPoints(t.id, +1)} className="btn btn-ghost">+1</button>
              <button onClick={() => addPoints(t.id, +5)} className="btn btn-primary">+5</button>
            </div>
            <ul className="mt-2 text-sm">
              {students.filter((s) => s.team_id === t.id).map((s) => (
                <li key={s.id} className="flex justify-between items-center">
                  <span>{s.name}</span>
                  <button onClick={() => assign(s.id, null)} className="text-xs text-[#9fb0d3]">unassign</button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="card p-3">
        <label>Reason for next point change (optional)</label>
        <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Answered a bonus question" />
      </div>

      <div className="card p-3">
        <h2>Unassigned</h2>
        <div className="flex gap-2 mt-2">
          <input value={newStudent} onChange={(e) => setNewStudent(e.target.value)} placeholder="Student name" />
          <button onClick={addStudent} className="btn btn-primary">Add</button>
        </div>
        <ul className="mt-2 space-y-1">
          {students.filter((s) => !s.team_id).map((s) => (
            <li key={s.id} className="flex justify-between items-center">
              <span>{s.name}</span>
              <div className="flex gap-1">
                {teams.map((t) => (
                  <button key={t.id} onClick={() => assign(s.id, t.id)} className="btn btn-ghost text-xs">→ {t.name}</button>
                ))}
                <button onClick={() => del(s.id)} className="btn btn-ghost text-xs">🗑</button>
              </div>
            </li>
          ))}
        </ul>
        {students.some((s) => !s.team_id) && (
          <button onClick={randomAssign} className="btn btn-ghost mt-2 w-full">🎲 Randomly Assign Unassigned</button>
        )}
      </div>

      <div className="card p-3">
        <h2>Recent Score Events</h2>
        <ul className="mt-2 text-sm space-y-1">
          {history.map((h) => {
            const t = teams.find((x) => x.id === h.team_id);
            return (
              <li key={h.id} className="flex justify-between">
                <span>{t?.name ?? "?"} {h.points > 0 ? "+" : ""}{h.points} {h.reason ? `— ${h.reason}` : ""}</span>
                <span className="text-[#9fb0d3]">{new Date(h.created_at).toLocaleString()}</span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
