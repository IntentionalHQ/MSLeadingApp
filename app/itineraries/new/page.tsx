"use client";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { Itinerary, Section } from "@/lib/types";
import { SECTION_ICON } from "@/lib/types";
import { todayLocal, parseClock } from "@/lib/dates";
import { totalMinutes } from "@/lib/schedule";
import PageHeader from "@/components/PageHeader";

function niceDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
function defaultTitle(dateStr: string): string {
  return `Sunday ${niceDate(dateStr)}`;
}

function NewSundayInner() {
  const router = useRouter();
  const params = useSearchParams();
  const [templates, setTemplates] = useState<Itinerary[]>([]);
  const [past, setPast] = useState<Itinerary[]>([]);
  const [date, setDate] = useState<string>(todayLocal());
  const [title, setTitle] = useState<string>(defaultTitle(todayLocal()));
  const [titleTouched, setTitleTouched] = useState(false);
  const [lesson, setLesson] = useState("");
  const [passage, setPassage] = useState("");
  const [verse, setVerse] = useState("");
  const [startTime, setStartTime] = useState("");
  const [startTouched, setStartTouched] = useState(false);
  const [startErr, setStartErr] = useState(false);
  const [slot, setSlot] = useState("");
  const [slotTouched, setSlotTouched] = useState(false);
  const [sourceId, setSourceId] = useState("");
  const [preview, setPreview] = useState<Section[]>([]);
  const [busy, setBusy] = useState(false);
  const [createErr, setCreateErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: t } = await supabase.from("itineraries").select("*").eq("is_template", true).order("created_at");
      const { data: p } = await supabase.from("itineraries").select("*").eq("is_template", false)
        .order("scheduled_date", { ascending: false, nullsFirst: false }).limit(10);
      const templates = (t ?? []) as Itinerary[];
      const past = (p ?? []) as Itinerary[];
      setTemplates(templates);
      setPast(past);
      const from = params.get("from");
      if (from && [...templates, ...past].some((x) => x.id === from)) setSourceId(from);
      else if (past[0]) setSourceId(past[0].id);
      else if (templates[0]) setSourceId(templates[0].id);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load preview sections + copy timeline defaults when the source changes.
  useEffect(() => {
    if (!sourceId) { setPreview([]); return; }
    (async () => {
      const { data } = await supabase.from("itinerary_sections").select("*").eq("itinerary_id", sourceId).order("position");
      setPreview((data ?? []) as Section[]);
    })();
    const src = [...templates, ...past].find((x) => x.id === sourceId);
    if (src) {
      if (!startTouched && src.start_time) setStartTime(src.start_time);
      if (!slotTouched && src.slot_minutes != null) setSlot(String(src.slot_minutes));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceId]);

  const onDateChange = (v: string) => {
    setDate(v);
    if (!titleTouched && v) setTitle(defaultTitle(v));
  };

  const create = async () => {
    const st = startTime.trim();
    if (st && parseClock(st) === null) { setStartErr(true); return; }
    setStartErr(false);
    setCreateErr(null);
    setBusy(true);
    const { data: newIt, error } = await supabase.from("itineraries").insert({
      title, lesson_title: lesson || null, bible_passage: passage || null,
      memory_verse: verse || null, scheduled_date: date, is_template: false,
      start_time: st || null, slot_minutes: slot ? parseInt(slot, 10) : null,
    }).select().single();
    if (error || !newIt) { setCreateErr(error?.message ?? "Could not create this Sunday. Try again."); setBusy(false); return; }

    if (sourceId) {
      const { data: srcSections } = await supabase.from("itinerary_sections")
        .select("*").eq("itinerary_id", sourceId).order("position");
      if (srcSections && srcSections.length) {
        await supabase.from("itinerary_sections").insert(srcSections.map((s: any) => ({
          itinerary_id: newIt.id, position: s.position, title: s.title, section_type: s.section_type,
          duration_minutes: s.duration_minutes, instructions: s.instructions, script: s.script,
          discussion_questions: s.discussion_questions, notes: s.notes, chosen_game: s.chosen_game,
          completed: false, completed_at: null,
        })));
      }
    }
    router.push(`/itineraries/${newIt.id}/edit`);
  };

  return (
    <div className="space-y-4">
      <PageHeader title="New Sunday" backHref="/itineraries" backLabel="Sundays" />
      <div className="card p-4 space-y-3">
        <div>
          <label>Title</label>
          <input value={title} onChange={(e) => { setTitle(e.target.value); setTitleTouched(true); }} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label>Date</label>
            <input type="date" value={date} onChange={(e) => onDateChange(e.target.value)} />
          </div>
          <div>
            <label>Start time</label>
            <input value={startTime} placeholder="10:30 AM" onChange={(e) => { setStartTime(e.target.value); setStartTouched(true); setStartErr(false); }} />
            {startErr && <div className="text-xs text-red-400 mt-1">Use a time like 10:30 AM</div>}
          </div>
          <div>
            <label>Slot length (min)</label>
            <input type="number" inputMode="numeric" min={0} value={slot} placeholder="60" onChange={(e) => { setSlot(e.target.value); setSlotTouched(true); }} />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div><label>Lesson title</label><input value={lesson} onChange={(e) => setLesson(e.target.value)} placeholder="e.g. The Prodigal Son" /></div>
          <div><label>Bible passage</label><input value={passage} onChange={(e) => setPassage(e.target.value)} placeholder="e.g. Luke 15:11–32" /></div>
        </div>
        <div><label>Memory verse</label><textarea rows={2} value={verse} onChange={(e) => setVerse(e.target.value)} /></div>
        <div>
          <label>Start from…</label>
          <select value={sourceId} onChange={(e) => setSourceId(e.target.value)}>
            <option value="">(Empty)</option>
            <optgroup label="Templates">
              {templates.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
            </optgroup>
            <optgroup label="Previous Sundays">
              {past.map((t) => <option key={t.id} value={t.id}>{t.title}{t.scheduled_date ? ` · ${t.scheduled_date}` : ""}</option>)}
            </optgroup>
          </select>
        </div>

        {sourceId && preview.length > 0 && (
          <div className="card p-3 space-y-1">
            <div className="text-xs text-[#9fb0d3]">Copies {preview.length} section{preview.length === 1 ? "" : "s"}:</div>
            <ul className="text-sm space-y-0.5">
              {preview.map((s) => (
                <li key={s.id} className="flex justify-between gap-2">
                  <span className="truncate"><span className="mr-1" aria-hidden>{SECTION_ICON[s.section_type]}</span>{s.title}</span>
                  <span className="text-[#9fb0d3] font-mono tabular-nums shrink-0">{s.duration_minutes ?? 0} min</span>
                </li>
              ))}
            </ul>
            <div className="text-xs text-[#9fb0d3] font-mono tabular-nums pt-1 border-t border-[#1f2a44]">Total {totalMinutes(preview)} min</div>
          </div>
        )}

        {createErr && <div className="text-sm text-red-400">{createErr}</div>}
        <button disabled={busy} className="btn btn-primary" onClick={create}>{busy ? "Creating…" : "Create & edit outline"}</button>
      </div>
    </div>
  );
}

export default function NewItineraryPage() {
  return (
    <Suspense fallback={<div className="card p-4">Loading…</div>}>
      <NewSundayInner />
    </Suspense>
  );
}
