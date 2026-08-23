"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Team, Student, Contest } from "@/lib/types";
import { MASCOTS, pickMascots, type Mascot } from "@/lib/mascots";

// Human "time left" label for the active season, e.g. "3 weeks left" / "Ended".
function seasonTimeLeft(endDate: string | null): string | null {
  if (!endDate) return null;
  const end = new Date(endDate + "T23:59:59");
  const days = Math.ceil((end.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (days < 0) return "Season ended";
  if (days === 0) return "Ends today";
  if (days === 1) return "1 day left";
  if (days < 14) return `${days} days left`;
  const weeks = Math.round(days / 7);
  if (weeks < 9) return `${weeks} weeks left`;
  return `${Math.round(days / 30)} months left`;
}

export default function TeamsPage() {
  const [contest, setContest] = useState<Contest | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [newStudent, setNewStudent] = useState("");
  const [reason, setReason] = useState("");
  const [history, setHistory] = useState<any[]>([]);
  const [showNewContest, setShowNewContest] = useState(false);
  const [spinning, setSpinning] = useState<{ studentId: string; teamName: string } | null>(null);

  const load = async () => {
    const [{ data: c }, { data: t }, { data: s }, { data: h }] = await Promise.all([
      supabase.from("contests").select("*").eq("status", "active").maybeSingle(),
      supabase.from("teams").select("*").order("name"),
      supabase.from("students").select("*").order("name"),
      supabase.from("score_events").select("*").order("created_at", { ascending: false }).limit(20),
    ]);
    setContest(c as any);
    setTeams((t ?? []) as any); setStudents((s ?? []) as any); setHistory(h ?? []);
  };
  useEffect(() => { load(); }, []);

  const addPoints = async (teamId: string, delta: number) => {
    const team = teams.find((t) => t.id === teamId);
    if (!team) return;
    await supabase.from("score_events").insert({ team_id: teamId, points: delta, reason: reason || null, contest_id: contest?.id ?? null });
    await supabase.from("teams").update({ total_score: team.total_score + delta }).eq("id", teamId);
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

  const del = async (sid: string) => {
    if (!confirm("Remove student?")) return;
    await supabase.from("students").delete().eq("id", sid);
    load();
  };

  // Animated random assignment: one kid at a time, "spins" through team names, lands on a random team.
  const spinAssign = async () => {
    const unassigned = students.filter((s) => !s.team_id);
    if (!unassigned.length || teams.length < 2) return;
    const teamNames = teams.map((t) => t.name);
    for (const s of unassigned) {
      // spin: cycle team names ~8 times over ~1.2s
      const target = teams[Math.floor(Math.random() * teams.length)];
      for (let i = 0; i < 10; i++) {
        setSpinning({ studentId: s.id, teamName: teamNames[i % teamNames.length] });
        await new Promise((r) => setTimeout(r, 110));
      }
      setSpinning({ studentId: s.id, teamName: target.name });
      await new Promise((r) => setTimeout(r, 500));
      await supabase.from("students").update({ team_id: target.id }).eq("id", s.id);
    }
    setSpinning(null);
    load();
  };

  const archive = async () => {
    if (!contest) return;
    if (!confirm(`End season "${contest.name}"? Final scores will be saved to history, then teams reset for the next season.`)) return;
    const snapshot = {
      teams: teams.map((t) => ({ id: t.id, name: t.name, total_score: t.total_score })),
      students: students.map((s) => ({ id: s.id, name: s.name, team_id: s.team_id })),
    };
    await supabase.from("contests").update({ status: "archived", archived_at: new Date().toISOString(), snapshot }).eq("id", contest.id);
    // Reset scores + unassign kids for next contest
    for (const t of teams) await supabase.from("teams").update({ total_score: 0, contest_id: null }).eq("id", t.id);
    await supabase.from("students").update({ team_id: null }).not("id", "is", null);
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1>Teams & Students</h1>
        {contest ? (
          <button onClick={archive} className="btn btn-ghost">End Season & Reset</button>
        ) : (
          <button onClick={() => setShowNewContest(true)} className="btn btn-primary">+ New Season</button>
        )}
      </div>

      {contest && (
        <div className="card p-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-bold">{contest.name}</div>
              <div className="text-xs text-[#9fb0d3]">
                {contest.start_date ?? "—"} → {contest.end_date ?? "—"}
                {contest.duration_months ? ` · ${contest.duration_months} month${contest.duration_months === 1 ? "" : "s"}` : contest.weeks ? ` · ${contest.weeks} weeks` : ""}
              </div>
            </div>
            {(() => {
              const label = seasonTimeLeft(contest.end_date);
              return label ? <div className="text-xs font-semibold text-[#9fb0d3] text-right">{label}</div> : null;
            })()}
          </div>
        </div>
      )}

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
        <h2>Roster</h2>
        <div className="flex gap-2 mt-2">
          <input value={newStudent} onChange={(e) => setNewStudent(e.target.value)} placeholder="Student name" onKeyDown={(e) => { if (e.key === "Enter") addStudent(); }} />
          <button onClick={addStudent} className="btn btn-primary">Add</button>
        </div>
        {students.filter((s) => !s.team_id).length > 0 && (
          <>
            <h3 className="mt-3 text-sm font-semibold text-[#9fb0d3]">Unassigned</h3>
            <ul className="mt-1 space-y-1">
              {students.filter((s) => !s.team_id).map((s) => (
                <li key={s.id} className="flex justify-between items-center">
                  <span className={spinning?.studentId === s.id ? "font-bold text-yellow-400" : ""}>
                    {s.name}
                    {spinning?.studentId === s.id && <span className="ml-2 font-mono">→ {spinning.teamName}</span>}
                  </span>
                  <div className="flex gap-1">
                    {teams.map((t) => (
                      <button key={t.id} onClick={() => assign(s.id, t.id)} className="btn btn-ghost text-xs">→ {t.name}</button>
                    ))}
                    <button onClick={() => del(s.id)} className="btn btn-ghost text-xs">🗑</button>
                  </div>
                </li>
              ))}
            </ul>
            <button onClick={spinAssign} disabled={!!spinning} className="btn btn-primary mt-3 w-full btn-lg">
              🎲 Assign Teams (random)
            </button>
          </>
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

      <Link href="/summaries" className="btn btn-ghost w-full">📜 Past Seasons & Sundays</Link>

      {showNewContest && <NewSeasonModal teams={teams} onClose={() => setShowNewContest(false)} onCreated={() => { setShowNewContest(false); load(); }} />}
    </div>
  );
}

function NewSeasonModal({ teams, onClose, onCreated }: { teams: Team[]; onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState("");
  const [start, setStart] = useState(new Date().toISOString().slice(0, 10));
  const [end, setEnd] = useState("");
  const [months, setMonths] = useState(2); // default: teams last 2 months
  // One mascot per existing team row; the app picks a fresh pairing up front.
  const [picks, setPicks] = useState<Mascot[]>(() => pickMascots(Math.max(teams.length, 2)));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Derive end date from start + months
    if (start && months) {
      const d = new Date(start);
      d.setMonth(d.getMonth() + months);
      setEnd(d.toISOString().slice(0, 10));
    }
  }, [start, months]);

  const shuffle = () => setPicks(pickMascots(Math.max(teams.length, 2)));

  const setPickAt = (i: number, mascotName: string) => {
    const m = MASCOTS.find((x) => x.name === mascotName);
    if (!m) return;
    setPicks((prev) => prev.map((p, idx) => (idx === i ? m : p)));
  };

  const create = async () => {
    if (!name.trim() || saving) return;
    if (teams.length === 0) { alert("No team rows exist to assign mascots to."); return; }
    setSaving(true);
    const { data, error } = await supabase.from("contests").insert({
      name, start_date: start, end_date: end || null, duration_months: months, status: "active",
    }).select().single();
    if (error) { setSaving(false); alert(error.message); return; }
    // Give each team a fresh mascot, link to the new season, reset scores.
    for (let i = 0; i < teams.length; i++) {
      const m = picks[i] ?? picks[i % picks.length];
      await supabase.from("teams").update({
        name: m.name, mascot: m.name, icon: m.emoji,
        contest_id: (data as any).id, total_score: 0,
      }).eq("id", teams[i].id);
    }
    // Un-assign every student so the roster can be re-shuffled onto the new teams.
    // Student names are kept — only team_id is cleared.
    await supabase.from("students").update({ team_id: null }).not("id", "is", null);
    onCreated();
  };

  const chosenNames = new Set(picks.map((p) => p.name));

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="card p-4 w-full max-w-md space-y-3 max-h-[90vh] overflow-y-auto">
        <h2>New Season</h2>
        <div><label>Name</label><input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Fall 2026" /></div>
        <div className="grid grid-cols-2 gap-2">
          <div><label>Start</label><input type="date" value={start} onChange={(e) => setStart(e.target.value)} /></div>
          <div><label>Length (months)</label><input type="number" min={1} max={12} value={months} onChange={(e) => setMonths(parseInt(e.target.value) || 1)} /></div>
        </div>
        <div><label>Ends (auto)</label><input type="date" value={end} onChange={(e) => setEnd(e.target.value)} /></div>

        <div>
          <div className="flex items-center justify-between">
            <label>Team mascots</label>
            <button type="button" onClick={shuffle} className="btn btn-ghost text-xs">🎲 Shuffle</button>
          </div>
          <div className="space-y-2 mt-1">
            {teams.map((t, i) => {
              const m = picks[i] ?? picks[i % picks.length];
              return (
                <div key={t.id} className="flex items-center gap-2">
                  <span className="text-2xl w-8 text-center">{m?.emoji}</span>
                  <select
                    className="flex-1"
                    value={m?.name}
                    onChange={(e) => setPickAt(i, e.target.value)}
                  >
                    {MASCOTS.map((opt) => (
                      <option key={opt.name} value={opt.name} disabled={opt.name !== m?.name && chosenNames.has(opt.name)}>
                        {opt.emoji} {opt.name}
                      </option>
                    ))}
                  </select>
                </div>
              );
            })}
          </div>
        </div>

        <p className="text-xs text-[#9fb0d3]">Starting a new season renames the teams to the mascots above, resets all scores to 0, and un-assigns students (their names are kept) so you can re-shuffle the roster.</p>
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="btn btn-ghost">Cancel</button>
          <button onClick={create} disabled={saving} className="btn btn-primary">{saving ? "Starting…" : "Start Season"}</button>
        </div>
      </div>
    </div>
  );
}
