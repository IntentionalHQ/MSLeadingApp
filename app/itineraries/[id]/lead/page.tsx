"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { Itinerary, Section } from "@/lib/types";
import { SECTION_LABEL } from "@/lib/types";

export default function LeaderModePage() {
  const { id } = useParams<{ id: string }>();
  const [it, setIt] = useState<Itinerary | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [now, setNow] = useState(new Date());
  const [sectionStart, setSectionStart] = useState<number>(Date.now());
  const [groupStart] = useState<number>(Date.now());

  const load = async () => {
    const { data: it } = await supabase.from("itineraries").select("*").eq("id", id).single();
    const { data: secs } = await supabase.from("itinerary_sections").select("*").eq("itinerary_id", id).order("position");
    setIt(it as any); setSections((secs ?? []) as any);
  };
  useEffect(() => { load(); }, [id]);
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, []);

  const currentIdx = sections.findIndex((s) => !s.completed);
  const current = currentIdx >= 0 ? sections[currentIdx] : null;
  const upcoming = currentIdx >= 0 ? sections.slice(currentIdx + 1) : [];
  const totalSecs = sections.length;
  const doneSecs = sections.filter((s) => s.completed).length;

  // Reset section timer whenever the "current" section actually changes.
  useEffect(() => { setSectionStart(Date.now()); }, [current?.id]);

  const advance = async () => {
    if (!current) return;
    await supabase.from("itinerary_sections").update({ completed: true }).eq("id", current.id);
    setSections((prev) => prev.map((s) => (s.id === current.id ? { ...s, completed: true } : s)));
  };

  const previous = async () => {
    // Un-complete the most recently completed section
    const lastDone = [...sections].reverse().find((s) => s.completed);
    if (!lastDone) return;
    await supabase.from("itinerary_sections").update({ completed: false }).eq("id", lastDone.id);
    setSections((prev) => prev.map((s) => (s.id === lastDone.id ? { ...s, completed: false } : s)));
  };

  const fmt = (secs: number) => {
    const mm = String(Math.floor(secs / 60)).padStart(2, "0");
    const ss = String(secs % 60).padStart(2, "0");
    return `${mm}:${ss}`;
  };
  const sectionElapsed = Math.max(0, Math.floor((now.getTime() - sectionStart) / 1000));
  const groupElapsed = Math.max(0, Math.floor((now.getTime() - groupStart) / 1000));

  if (!it) return <p>Loading…</p>;

  const done = currentIdx === -1;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm text-[#9fb0d3]">
        <div>Group: {fmt(groupElapsed)}</div>
        <div>{now.toLocaleTimeString()}</div>
        <div>{doneSecs}/{totalSecs}</div>
      </div>
      <div className="w-full bg-[#1f2a44] rounded-full h-2 overflow-hidden">
        <div className="bg-blue-500 h-2" style={{ width: `${totalSecs ? (doneSecs / totalSecs) * 100 : 0}%` }} />
      </div>

      {done ? (
        <div className="card p-6 text-center space-y-3">
          <h1>🎉 Group Complete</h1>
          <div className="flex gap-2 justify-center">
            <button onClick={previous} className="btn btn-ghost">← Reopen last section</button>
            <Link href={`/itineraries/${id}/summary`} className="btn btn-primary btn-lg">Go to Summary</Link>
          </div>
        </div>
      ) : current && (
        <div className="card p-4">
          <div className="text-xs uppercase text-[#9fb0d3]">{SECTION_LABEL[current.section_type]}</div>
          <div className="text-2xl font-bold mt-1">{current.title}</div>
          <div className="text-xs text-[#9fb0d3] mt-1">
            Target: {current.duration_minutes ?? 0} min · Elapsed: <span className="font-mono">{fmt(sectionElapsed)}</span>
          </div>

          {/* Section-type-specific inline content */}
          {current.section_type === "memory_verse" && it.memory_verse && (
            <div className="mt-3 p-3 rounded bg-[#0b1220] border border-yellow-600">
              <div className="text-xs text-yellow-500">This week's verse</div>
              <div className="italic text-lg mt-1 whitespace-pre-line">{it.memory_verse}</div>
            </div>
          )}
          {current.section_type === "bible_reading" && it.bible_passage && (
            <div className="mt-3 p-3 rounded bg-[#0b1220] border border-blue-600">
              <div className="text-xs text-blue-400">Read together</div>
              <div className="text-lg font-semibold mt-1">{it.bible_passage}</div>
              {it.lesson_title && <div className="text-sm text-[#9fb0d3] mt-1">Lesson: {it.lesson_title}</div>}
            </div>
          )}

          {current.instructions && <div className="mt-3"><div className="text-xs text-[#9fb0d3]">Instructions</div><div>{current.instructions}</div></div>}
          {current.script && <div className="mt-3 p-3 rounded bg-[#0b1220] border border-[#1f2a44]"><div className="text-xs text-[#9fb0d3]">Say</div><div className="italic whitespace-pre-line">{current.script}</div></div>}
          {current.discussion_questions && <div className="mt-3"><div className="text-xs text-[#9fb0d3]">Discussion</div><div className="whitespace-pre-line">{current.discussion_questions}</div></div>}

          {/* Inline-editable notes: save on blur */}
          <div className="mt-3">
            <div className="text-xs text-[#9fb0d3]">Notes (optional — visible here while leading)</div>
            <textarea
              rows={2}
              defaultValue={current.notes ?? ""}
              placeholder="Anything to remember for this section this week…"
              onBlur={async (e) => {
                const value = e.target.value || null;
                await supabase.from("itinerary_sections").update({ notes: value }).eq("id", current.id);
                setSections((prev) => prev.map((s) => (s.id === current.id ? { ...s, notes: value } : s)));
              }}
            />
          </div>

          <div className="mt-4 flex flex-col gap-2">
            {current.section_type === "memory_verse_check" && (
              <Link href={`/itineraries/${id}/verse`} className="btn btn-ghost btn-lg">✅ Open Memory Verse Check</Link>
            )}
            {current.section_type === "group_game" && (
              <Link href={`/itineraries/${id}/${current.chosen_game || "baseball"}`} className="btn btn-ghost btn-lg">
                ⚾ Play {gameLabel(current.chosen_game)}
              </Link>
            )}
            {current.section_type === "score_recording" && (
              <Link href={`/itineraries/${id}/summary`} className="btn btn-ghost btn-lg">📝 Record Summary</Link>
            )}
            <div className="grid grid-cols-3 gap-2">
              <button onClick={previous} disabled={doneSecs === 0} className="btn btn-ghost btn-lg disabled:opacity-40">← Previous</button>
              <button onClick={advance} className="btn btn-primary btn-lg col-span-2">Next Section →</button>
            </div>
          </div>
        </div>
      )}

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

function gameLabel(g: string | null | undefined) {
  if (!g || g === "bible_baseball") return "Bible Baseball";
  return g;
}
