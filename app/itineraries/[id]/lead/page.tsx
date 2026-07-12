"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { Itinerary, Section, Team } from "@/lib/types";
import { SECTION_LABEL } from "@/lib/types";

export default function LeaderModePage() {
  const { id } = useParams<{ id: string }>();
  const [it, setIt] = useState<Itinerary | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [now, setNow] = useState(new Date());
  const [timerStart, setTimerStart] = useState<number | null>(null);

  const load = async () => {
    const { data: it } = await supabase.from("itineraries").select("*").eq("id", id).single();
    const { data: secs } = await supabase.from("itinerary_sections").select("*").eq("itinerary_id", id).order("position");
    const { data: t } = await supabase.from("teams").select("*").order("name");
    setIt(it as any); setSections((secs ?? []) as any); setTeams((t ?? []) as any);
  };
  useEffect(() => { load(); }, [id]);
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, []);

  const currentIdx = sections.findIndex((s) => !s.completed);
  const current = currentIdx >= 0 ? sections[currentIdx] : null;
  const upcoming = currentIdx >= 0 ? sections.slice(currentIdx + 1) : [];
  const totalSecs = sections.length;
  const doneSecs = sections.filter((s) => s.completed).length;

  const advance = async () => {
    if (!current) return;
    await supabase.from("itinerary_sections").update({ completed: true }).eq("id", current.id);
    setSections((prev) => prev.map((s) => (s.id === current.id ? { ...s, completed: true } : s)));
    setTimerStart(Date.now());
  };

  const elapsed = timerStart ? Math.floor((now.getTime() - timerStart) / 1000) : 0;
  const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");

  if (!it) return <p>Loading…</p>;

  const done = currentIdx === -1;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm text-[#9fb0d3]">
        <div>{now.toLocaleTimeString()}</div>
        <div>{doneSecs}/{totalSecs} sections</div>
      </div>
      <div className="w-full bg-[#1f2a44] rounded-full h-2 overflow-hidden">
        <div className="bg-blue-500 h-2" style={{ width: `${totalSecs ? (doneSecs / totalSecs) * 100 : 0}%` }} />
      </div>

      {done ? (
        <div className="card p-6 text-center space-y-3">
          <h1>🎉 Group Complete</h1>
          <Link href={`/itineraries/${id}/summary`} className="btn btn-primary btn-lg">Go to Summary</Link>
        </div>
      ) : current && (
        <div className="card p-4">
          <div className="text-xs uppercase text-[#9fb0d3]">{SECTION_LABEL[current.section_type]}</div>
          <div className="text-2xl font-bold mt-1">{current.title}</div>
          {current.start_time && <div className="text-sm text-[#9fb0d3] mt-1">Start: {current.start_time} · {current.duration_minutes ?? 0} min</div>}
          <div className="mt-2 text-3xl font-mono">{mm}:{ss}</div>

          {current.instructions && <div className="mt-3"><div className="text-xs text-[#9fb0d3]">Instructions</div><div>{current.instructions}</div></div>}
          {current.script && <div className="mt-3 p-3 rounded bg-[#0b1220] border border-[#1f2a44]"><div className="text-xs text-[#9fb0d3]">Say</div><div className="italic whitespace-pre-line">{current.script}</div></div>}
          {current.discussion_questions && <div className="mt-3"><div className="text-xs text-[#9fb0d3]">Discussion</div><div className="whitespace-pre-line">{current.discussion_questions}</div></div>}
          {current.notes && <div className="mt-3"><div className="text-xs text-[#9fb0d3]">Notes</div><div className="whitespace-pre-line">{current.notes}</div></div>}

          <div className="mt-4 flex flex-col gap-2">
            {current.section_type === "memory_verse_check" && (
              <Link href={`/itineraries/${id}/verse`} className="btn btn-ghost btn-lg">✅ Memory Verse Check</Link>
            )}
            {current.section_type === "group_game" && (
              <Link href={`/itineraries/${id}/baseball`} className="btn btn-ghost btn-lg">⚾ Bible Baseball</Link>
            )}
            {current.section_type === "score_recording" && (
              <Link href={`/itineraries/${id}/summary`} className="btn btn-ghost btn-lg">📝 Record Summary</Link>
            )}
            <button onClick={advance} className="btn btn-primary btn-lg">Next Section →</button>
          </div>
        </div>
      )}

      <div className="card p-4">
        <div className="flex items-center justify-between">
          <h2>Team Scores</h2>
          <Link href="/teams" className="text-sm text-blue-400">Manage</Link>
        </div>
        <div className="grid grid-cols-2 gap-2 mt-2">
          {teams.map((t) => (
            <div key={t.id} className="p-3 rounded bg-[#0b1220] border border-[#1f2a44] text-center">
              <div className="text-2xl">{t.icon ?? "🏳️"}</div>
              <div className="font-bold">{t.name}</div>
              <div className="text-3xl font-mono mt-1">{t.total_score}</div>
            </div>
          ))}
        </div>
      </div>

      {upcoming.length > 0 && (
        <div className="card p-4">
          <h2>Upcoming</h2>
          <ol className="mt-2 space-y-1 text-sm">
            {upcoming.map((s) => (
              <li key={s.id} className="flex justify-between">
                <span>{s.title}</span>
                <span className="text-[#9fb0d3]">{s.duration_minutes ?? "-"} min</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
