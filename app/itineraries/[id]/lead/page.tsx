"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { Itinerary, Section } from "@/lib/types";
import { SECTION_LABEL } from "@/lib/types";
import { gameLabel, gameRoutePath } from "@/lib/games";
import { buildTimeline } from "@/lib/schedule";
import { formatClock } from "@/lib/dates";
import PageHeader from "@/components/PageHeader";
import SaveIndicator from "@/components/outline/SaveIndicator";
import { useSaveState } from "@/components/outline/useBlurSave";

const SIX_HOURS = 6 * 60 * 60 * 1000;

export default function LeaderModePage() {
  const { id } = useParams<{ id: string }>();
  const { state: saveState, track } = useSaveState();
  const [it, setIt] = useState<Itinerary | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [now, setNow] = useState<number>(Date.now());
  const [gateDismissed, setGateDismissed] = useState(false);
  const [editingField, setEditingField] = useState<"script" | "discussion_questions" | null>(null);
  const didInit = useRef(false);

  const load = async () => {
    const { data: it } = await supabase.from("itineraries").select("*").eq("id", id).single();
    const { data: secs } = await supabase.from("itinerary_sections").select("*").eq("itinerary_id", id).order("position");
    setIt(it as any); setSections((secs ?? []) as any);
  };
  useEffect(() => { load(); }, [id]);
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);

  // Screen wake lock while leading.
  useEffect(() => {
    let lock: any = null;
    const grab = async () => { try { lock = await (navigator as any).wakeLock?.request("screen"); } catch {} };
    grab();
    const onVis = () => { if (document.visibilityState === "visible") grab(); };
    document.addEventListener("visibilitychange", onVis);
    return () => { lock?.release?.(); document.removeEventListener("visibilitychange", onVis); };
  }, []);

  const currentIdx = sections.findIndex((s) => !s.completed);
  const current = currentIdx >= 0 ? sections[currentIdx] : null;
  const totalSecs = sections.length;
  const doneSecs = sections.filter((s) => s.completed).length;
  const done = totalSecs > 0 && currentIdx === -1;

  const setLedNow = async () => {
    const iso = new Date().toISOString();
    setIt((p) => (p ? { ...p, led_at: iso } : p));
    await supabase.from("itineraries").update({ led_at: iso }).eq("id", id);
  };

  // On first load with a fresh (unstarted) group, stamp led_at so the group clock runs.
  useEffect(() => {
    if (didInit.current || !it || sections.length === 0) return;
    didInit.current = true;
    const anyDone = sections.some((s) => s.completed);
    if (!anyDone) {
      const stale = !it.led_at || (Date.now() - Date.parse(it.led_at)) > SIX_HOURS;
      if (stale) setLedNow();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [it, sections]);

  const restart = async () => {
    const iso = new Date().toISOString();
    setSections((prev) => prev.map((s) => ({ ...s, completed: false, completed_at: null })));
    setIt((p) => (p ? { ...p, led_at: iso } : p));
    setGateDismissed(true);
    await supabase.from("itinerary_sections").update({ completed: false, completed_at: null }).eq("itinerary_id", id);
    await supabase.from("itineraries").update({ led_at: iso }).eq("id", id);
  };

  const advance = async () => {
    if (!current) return;
    const iso = new Date().toISOString();
    setSections((prev) => prev.map((s) => (s.id === current.id ? { ...s, completed: true, completed_at: iso } : s)));
    await supabase.from("itinerary_sections").update({ completed: true, completed_at: iso }).eq("id", current.id);
  };

  const previous = async () => {
    const lastDone = [...sections].reverse().find((s) => s.completed);
    if (!lastDone) return;
    setSections((prev) => prev.map((s) => (s.id === lastDone.id ? { ...s, completed: false, completed_at: null } : s)));
    await supabase.from("itinerary_sections").update({ completed: false, completed_at: null }).eq("id", lastDone.id);
  };

  const patchCurrent = (patch: Partial<Section>) => {
    if (!current) return;
    setSections((prev) => prev.map((s) => (s.id === current.id ? { ...s, ...patch } : s)));
    return track(supabase.from("itinerary_sections").update(patch).eq("id", current.id));
  };

  const fmt = (secs: number) => {
    const s = Math.max(0, secs);
    return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  };

  if (!it) return <div className="card p-4">Loading…</div>;

  const timeline = buildTimeline(it.start_time, sections);
  const showGate = doneSecs > 0 && !done && !gateDismissed;

  const ledMs = it.led_at ? Date.parse(it.led_at) : now;
  const groupElapsed = Math.floor((now - ledMs) / 1000);

  const prevDoneAt = currentIdx > 0 ? sections[currentIdx - 1]?.completed_at : null;
  const sectionStartMs = Math.max(ledMs, prevDoneAt ? Date.parse(prevDoneAt) : ledMs);
  const sectionElapsed = Math.floor((now - sectionStartMs) / 1000);

  const targetSecs = (current?.duration_minutes ?? 0) * 60;
  const remaining = targetSecs - sectionElapsed;
  const timerClass =
    targetSecs === 0 ? "text-[#9fb0d3]" :
    remaining < 0 ? "text-red-400" :
    remaining <= 60 ? "text-amber-400" : "text-[#e6ecf5]";

  const curRow = currentIdx >= 0 ? timeline[currentIdx] : null;
  const nowMinutes = new Date(now).getHours() * 60 + new Date(now).getMinutes();
  const runningLate = curRow && curRow.endMin != null && nowMinutes > curRow.endMin + 2;

  return (
    <div className="space-y-3 pb-24">
      <PageHeader
        title={it.title}
        subtitle={`${doneSecs}/${totalSecs} · Group ${fmt(groupElapsed)}`}
        backHref={`/itineraries/${id}/edit`}
        backLabel="Outline"
      />
      <div className="w-full bg-[#1f2a44] rounded-full h-2 overflow-hidden">
        <div className="bg-blue-500 h-2" style={{ width: `${totalSecs ? (doneSecs / totalSecs) * 100 : 0}%` }} />
      </div>

      {done ? (
        <div className="card p-6 text-center space-y-3">
          <h1>🎉 Group Complete</h1>
          <div className="flex flex-wrap gap-2 justify-center">
            <button onClick={previous} className="btn btn-ghost">← Reopen last section</button>
            <button onClick={restart} className="btn btn-ghost">Start over</button>
            <Link href={`/itineraries/${id}/summary`} className="btn btn-primary btn-lg">Go to Summary</Link>
          </div>
        </div>
      ) : showGate ? (
        <div className="card p-6 space-y-3">
          <div className="text-lg">You're partway through this Sunday ({doneSecs} of {totalSecs} done).</div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setGateDismissed(true)} className="btn btn-primary btn-lg">Resume</button>
            <button onClick={restart} className="btn btn-ghost btn-lg">Start from the top</button>
          </div>
        </div>
      ) : current && (
        <div className="card p-4">
          <div className="text-xs uppercase text-[#9fb0d3]">{SECTION_LABEL[current.section_type]}</div>
          <div className="text-3xl font-bold mt-1">{current.title}</div>
          <div className="mt-2 flex items-baseline gap-3">
            <div className={`text-4xl font-mono font-bold tabular-nums ${timerClass}`}>
              {targetSecs === 0 ? fmt(sectionElapsed) : `${remaining < 0 ? "-" : ""}${fmt(Math.abs(remaining))}`}
            </div>
            <div className="text-xs text-[#9fb0d3]">
              {targetSecs === 0 ? "no target" : remaining < 0 ? "over" : "left"} · plan {current.duration_minutes ?? 0} min
            </div>
          </div>
          {curRow && curRow.startMin != null && (
            <div className="text-xs text-[#9fb0d3] mt-1">
              Planned {formatClock(curRow.startMin)} – {formatClock(curRow.endMin!)}
              {runningLate && <span className="text-amber-400"> · running late</span>}
            </div>
          )}

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

          {/* Script — with inline quick edit */}
          <div className="mt-3 p-3 rounded bg-[#0b1220] border border-[#1f2a44]">
            <div className="flex items-center justify-between">
              <div className="text-xs text-[#9fb0d3]">Say</div>
              {editingField === "script"
                ? <SaveIndicator state={saveState} />
                : <button className="text-xs text-[#9fb0d3] underline" onClick={() => setEditingField("script")}>Edit</button>}
            </div>
            {editingField === "script" ? (
              <div className="mt-1 space-y-2">
                <textarea rows={3} defaultValue={current.script ?? ""} onBlur={(e) => patchCurrent({ script: e.target.value || null })} />
                <button className="btn btn-ghost" onClick={() => setEditingField(null)}>Done</button>
              </div>
            ) : (
              <div className="italic whitespace-pre-line mt-1">{current.script || <span className="text-[#9fb0d3] not-italic">— tap Edit to add a script —</span>}</div>
            )}
          </div>

          {/* Discussion — with inline quick edit */}
          <div className="mt-3">
            <div className="flex items-center justify-between">
              <div className="text-xs text-[#9fb0d3]">Discussion</div>
              {editingField === "discussion_questions"
                ? <SaveIndicator state={saveState} />
                : <button className="text-xs text-[#9fb0d3] underline" onClick={() => setEditingField("discussion_questions")}>Edit</button>}
            </div>
            {editingField === "discussion_questions" ? (
              <div className="mt-1 space-y-2">
                <textarea rows={3} defaultValue={current.discussion_questions ?? ""} onBlur={(e) => patchCurrent({ discussion_questions: e.target.value || null })} />
                <button className="btn btn-ghost" onClick={() => setEditingField(null)}>Done</button>
              </div>
            ) : (
              <div className="whitespace-pre-line mt-1">{current.discussion_questions || <span className="text-[#9fb0d3]">— tap Edit to add questions —</span>}</div>
            )}
          </div>

          {/* Notes: save on blur */}
          <div className="mt-3">
            <div className="text-xs text-[#9fb0d3]">Notes (optional — visible here while leading)</div>
            <textarea
              rows={2}
              defaultValue={current.notes ?? ""}
              placeholder="Anything to remember for this section this week…"
              onBlur={(e) => patchCurrent({ notes: e.target.value || null })}
            />
          </div>

          <div className="mt-4 flex flex-col gap-2">
            {current.section_type === "memory_verse_check" && (
              <Link href={`/itineraries/${id}/verse`} className="btn btn-ghost btn-lg">✅ Open Memory Verse Check</Link>
            )}
            {current.section_type === "group_game" && (
              current.chosen_game && current.chosen_game !== "pick_at_time" ? (
                <>
                  <Link href={gameRoutePath(id, current.chosen_game)} className="btn btn-ghost btn-lg">🎮 Play {gameLabel(current.chosen_game)}</Link>
                  <Link href={`/itineraries/${id}/games`} className="btn btn-ghost">Change game</Link>
                </>
              ) : (
                <Link href={`/itineraries/${id}/games`} className="btn btn-ghost btn-lg">🎮 Choose a Game</Link>
              )
            )}
            {current.section_type === "score_recording" && (
              <Link href={`/itineraries/${id}/summary`} className="btn btn-ghost btn-lg">📝 Record Summary</Link>
            )}
          </div>
        </div>
      )}

      {!done && !showGate && currentIdx >= 0 && timeline.slice(currentIdx + 1).length > 0 && (
        <div className="card p-4">
          <h2>Upcoming</h2>
          <ol className="mt-2 space-y-1 text-sm">
            {timeline.slice(currentIdx + 1).map(({ section, startMin }) => (
              <li key={section.id} className="flex justify-between gap-2">
                <span className="truncate">{section.title}</span>
                <span className="text-[#9fb0d3] font-mono tabular-nums shrink-0">
                  {startMin != null && <span>{formatClock(startMin)} · </span>}{section.duration_minutes ?? 0} min
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {!done && !showGate && (
        <div className="fixed bottom-0 inset-x-0 z-40 p-3 bg-[#0b1220]/95 backdrop-blur border-t border-[#1f2a44]">
          <div className="max-w-3xl mx-auto grid grid-cols-3 gap-2">
            <button onClick={previous} disabled={doneSecs === 0} className="btn btn-ghost btn-lg">← Prev</button>
            <button onClick={advance} className="btn btn-primary btn-lg col-span-2">Next Section →</button>
          </div>
        </div>
      )}
    </div>
  );
}
