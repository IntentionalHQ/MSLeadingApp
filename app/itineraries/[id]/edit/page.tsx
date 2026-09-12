"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { Itinerary, Section, SectionType } from "@/lib/types";
import { SECTION_DEFAULTS } from "@/lib/types";
import { buildTimeline, timelineSummary } from "@/lib/schedule";
import { parseClock, formatClock } from "@/lib/dates";
import PageHeader from "@/components/PageHeader";
import Confirm from "@/components/Confirm";
import DateInput from "@/components/DateInput";
import SectionRow from "@/components/outline/SectionRow";
import SectionPalette from "@/components/outline/SectionPalette";
import TimelineFooter from "@/components/outline/TimelineFooter";
import SaveIndicator from "@/components/outline/SaveIndicator";
import { useSaveState } from "@/components/outline/useBlurSave";
import PlanFileMenu from "@/components/outline/PlanFileMenu";
import type { ParsedPlan, PastOutline } from "@/lib/planXlsx";
import { todayLocal } from "@/lib/dates";

export default function EditItineraryPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { state, track } = useSaveState();
  const [it, setIt] = useState<Itinerary | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [templateName, setTemplateName] = useState<string | null>(null); // non-null = prompt open
  const [dupTime, setDupTime] = useState<string | null>(null); // non-null = "duplicate for another service" prompt open
  const [dupErr, setDupErr] = useState<string | null>(null);
  const [dupBusy, setDupBusy] = useState(false);
  const [startErr, setStartErr] = useState(false);
  const [dragging, setDragging] = useState<{ id: string; overIndex: number } | null>(null);

  const listRef = useRef<HTMLDivElement | null>(null);
  const rectsRef = useRef<DOMRect[]>([]);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const load = async () => {
    const { data: it } = await supabase.from("itineraries").select("*").eq("id", id).single();
    const { data: secs } = await supabase.from("itinerary_sections").select("*").eq("itinerary_id", id).order("position");
    setIt(it as any);
    setSections((secs ?? []) as any);
  };
  useEffect(() => { load(); }, [id]);

  // Close overflow menu on outside click / Escape.
  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setMenuOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [menuOpen]);

  // Drag: track pointer moves on the document while dragging a handle.
  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: PointerEvent) => {
      const rects = rectsRef.current;
      // overIndex is an insertion slot: 0..n, where n means "after the last row".
      let over = rects.length;
      for (let i = 0; i < rects.length; i++) {
        const mid = rects[i].top + rects[i].height / 2;
        if (e.clientY < mid) { over = i; break; }
      }
      setDragging((d) => (d && d.overIndex !== over ? { ...d, overIndex: over } : d));
    };
    const onUp = () => {
      if (dragging) {
        const from = sections.findIndex((s) => s.id === dragging.id);
        if (from !== -1) {
          // Removing the dragged row shifts every later slot up by one.
          const to = dragging.overIndex > from ? dragging.overIndex - 1 : dragging.overIndex;
          if (to !== from) reorder(from, to);
        }
      }
      setDragging(null);
    };
    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
    return () => { document.removeEventListener("pointermove", onMove); document.removeEventListener("pointerup", onUp); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragging, sections]);

  const patchItinerary = (patch: Partial<Itinerary>) => {
    setIt((p) => (p ? { ...p, ...patch } : p));
    return track(supabase.from("itineraries").update(patch).eq("id", id));
  };
  const patchSection = (sid: string, patch: Partial<Section>) => {
    setSections((p) => p.map((s) => (s.id === sid ? { ...s, ...patch } : s)));
    return track(supabase.from("itinerary_sections").update(patch).eq("id", sid));
  };

  const addSection = async (type: SectionType) => {
    const def = SECTION_DEFAULTS[type];
    const { data } = await supabase.from("itinerary_sections").insert({
      itinerary_id: id, position: sections.length, title: def.title, section_type: type,
      duration_minutes: def.duration,
      chosen_game: type === "group_game" ? "pick_at_time" : null,
    }).select().single();
    if (data) {
      const row = data as Section;
      setSections((p) => [...p, row]);
      setExpanded(row.id);
      setTimeout(() => document.getElementById(`section-${row.id}`)?.scrollIntoView({ block: "center", behavior: "smooth" }), 60);
    }
  };

  const reorder = (from: number, to: number) => {
    if (from === to || from < 0 || to < 0 || from >= sections.length || to >= sections.length) return;
    const next = [...sections];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    const renumbered = next.map((s, i) => ({ ...s, position: i }));
    const changed = renumbered.filter((s) => sections.find((p) => p.id === s.id)?.position !== s.position);
    setSections(renumbered);
    if (changed.length) {
      track(Promise.all(changed.map((s) => supabase.from("itinerary_sections").update({ position: s.position }).eq("id", s.id))) as any);
    }
  };

  const duplicate = async (s: Section) => {
    const { data } = await supabase.from("itinerary_sections").insert({
      itinerary_id: id, position: sections.length, title: `${s.title} (copy)`, section_type: s.section_type,
      duration_minutes: s.duration_minutes, instructions: s.instructions, script: s.script,
      discussion_questions: s.discussion_questions, notes: s.notes, chosen_game: s.chosen_game,
      completed: false, completed_at: null,
    }).select().single();
    if (data) setSections((p) => [...p, data as Section]);
  };

  const remove = async (sid: string) => {
    await supabase.from("itinerary_sections").delete().eq("id", sid);
    const remaining = sections.filter((s) => s.id !== sid).map((s, i) => ({ ...s, position: i }));
    const changed = remaining.filter((s) => sections.find((p) => p.id === s.id)?.position !== s.position);
    setSections(remaining);
    if (expanded === sid) setExpanded(null);
    if (changed.length) {
      track(Promise.all(changed.map((s) => supabase.from("itinerary_sections").update({ position: s.position }).eq("id", s.id))) as any);
    }
  };

  const saveTemplate = async (name: string) => {
    if (!it) return;
    await track((async () => {
      const { data: newIt, error } = await supabase.from("itineraries").insert({
        title: name, is_template: true, start_time: it.start_time, slot_minutes: it.slot_minutes,
        lesson_title: it.lesson_title, bible_passage: it.bible_passage, memory_verse: it.memory_verse,
      }).select().single();
      if (error || !newIt) return { error: error ?? "failed" };
      if (sections.length) {
        const { error: e2 } = await supabase.from("itinerary_sections").insert(sections.map((s) => ({
          itinerary_id: newIt.id, position: s.position, title: s.title, section_type: s.section_type,
          duration_minutes: s.duration_minutes, instructions: s.instructions, script: s.script,
          discussion_questions: s.discussion_questions, notes: s.notes, chosen_game: s.chosen_game,
          completed: false, completed_at: null,
        })));
        if (e2) return { error: e2 };
      }
      return {};
    })());
    setTemplateName(null);
    setMenuOpen(false);
  };

  // Copy this plan (lesson, passage, verse, sections) as a second service on the
  // same date with a different start time. Progress flags start fresh.
  const duplicateService = async () => {
    if (!it || dupBusy) return;
    const st = (dupTime ?? "").trim();
    if (!st || parseClock(st) === null) { setDupErr("Use a time like 11:00 AM"); return; }
    setDupErr(null);
    setDupBusy(true);
    // Strip a trailing " · 9:00 AM" so duplicating a duplicate doesn't stack times.
    const baseTitle = it.title.replace(/\s*·\s*\d{1,2}(:\d{2})?\s*[AaPp][Mm]?$/, "");
    const { data: newIt, error } = await supabase.from("itineraries").insert({
      title: `${baseTitle} · ${formatClock(parseClock(st)!)}`, is_template: false,
      scheduled_date: it.scheduled_date, start_time: st, slot_minutes: it.slot_minutes,
      lesson_title: it.lesson_title, bible_passage: it.bible_passage, memory_verse: it.memory_verse,
    }).select().single();
    if (error || !newIt) { setDupErr(error?.message ?? "Could not duplicate."); setDupBusy(false); return; }
    if (sections.length) {
      const { error: e2 } = await supabase.from("itinerary_sections").insert(sections.map((s) => ({
        itinerary_id: newIt.id, position: s.position, title: s.title, section_type: s.section_type,
        duration_minutes: s.duration_minutes, instructions: s.instructions, script: s.script,
        discussion_questions: s.discussion_questions, notes: s.notes, chosen_game: s.chosen_game,
        completed: false, completed_at: null,
      })));
      if (e2) { setDupErr(e2.message); setDupBusy(false); return; }
    }
    router.push(`/itineraries/${newIt.id}/edit`);
  };

  // The four most recent Sundays dated before this plan, with their sections,
  // for the AI planning template.
  const loadPast = async (): Promise<PastOutline[]> => {
    const before = it?.scheduled_date ?? todayLocal();
    const { data: its } = await supabase.from("itineraries").select("*")
      .eq("is_template", false).neq("id", id).lt("scheduled_date", before)
      .order("scheduled_date", { ascending: false }).limit(4);
    const list = (its ?? []) as Itinerary[];
    if (!list.length) return [];
    const { data: secs } = await supabase.from("itinerary_sections").select("*")
      .in("itinerary_id", list.map((x) => x.id)).order("position");
    const all = (secs ?? []) as Section[];
    return list.map((itinerary) => ({ itinerary, sections: all.filter((s) => s.itinerary_id === itinerary.id) }));
  };

  // Replace this Sunday's outline with an uploaded plan. Blank plan fields keep
  // their current values; sections are fully replaced.
  const applyImport = async (plan: ParsedPlan) => {
    if (!it) return;
    const patch: Partial<Itinerary> = {};
    for (const [k, v] of Object.entries(plan.itinerary)) if (v !== null && v !== undefined && v !== "") (patch as any)[k] = v;
    if (Object.keys(patch).length) {
      const { error } = await supabase.from("itineraries").update(patch).eq("id", id);
      if (error) throw error;
    }
    const { error: delErr } = await supabase.from("itinerary_sections").delete().eq("itinerary_id", id);
    if (delErr) throw delErr;
    const { data: inserted, error: insErr } = await supabase.from("itinerary_sections").insert(plan.sections.map((s, i) => ({
      itinerary_id: id, position: i, title: s.title, section_type: s.section_type,
      duration_minutes: s.duration_minutes, chosen_game: s.chosen_game,
      instructions: s.instructions, script: s.script, discussion_questions: s.discussion_questions, notes: s.notes,
      completed: false, completed_at: null,
    }))).select();
    if (insErr) throw insErr;
    setIt((p) => (p ? { ...p, ...patch, led_at: p.led_at } : p));
    setSections((inserted ?? []) as Section[]);
    setExpanded(null);
  };

  const resetProgress = async () => {
    setMenuOpen(false);
    setSections((p) => p.map((s) => ({ ...s, completed: false, completed_at: null })));
    setIt((p) => (p ? { ...p, led_at: null } : p));
    await track((async () => {
      await supabase.from("itinerary_sections").update({ completed: false, completed_at: null }).eq("itinerary_id", id);
      const { error } = await supabase.from("itineraries").update({ led_at: null }).eq("id", id);
      return { error };
    })());
  };

  const deleteSunday = async () => {
    await supabase.from("itinerary_sections").delete().eq("itinerary_id", id);
    await supabase.from("itineraries").delete().eq("id", id);
    router.push("/itineraries");
  };

  const onStartTimeBlur = (value: string) => {
    const v = value.trim();
    if (v && parseClock(v) === null) { setStartErr(true); return; }
    setStartErr(false);
    if ((v || null) !== (it?.start_time ?? null)) patchItinerary({ start_time: v || null });
  };

  const startDrag = (sectionId: string) => (e: React.PointerEvent) => {
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    rectsRef.current = listRef.current ? Array.from(listRef.current.children).map((el) => el.getBoundingClientRect()) : [];
    const idx = sections.findIndex((s) => s.id === sectionId);
    setDragging({ id: sectionId, overIndex: idx });
  };

  if (!it) return <div className="card p-4">Loading…</div>;

  const timeline = buildTimeline(it.start_time, sections);
  const anyCompleted = sections.some((s) => s.completed);

  return (
    <div className="space-y-4 pb-20">
      <PageHeader
        title={it.title}
        subtitle={timelineSummary(it.start_time, sections)}
        backHref="/itineraries"
        backLabel="Sundays"
        right={
          <div className="flex items-center gap-2">
            <SaveIndicator state={state} />
            <PlanFileMenu itinerary={it} sections={sections} loadPast={loadPast} onApply={applyImport} />
            <Link href={`/itineraries/${id}/lead`} className="btn btn-primary">▶ Lead</Link>
            <div className="relative" ref={menuRef}>
              <button type="button" className="btn btn-ghost" aria-label="More actions" onClick={() => setMenuOpen((o) => !o)}>⋯</button>
              {menuOpen && (
                <div className="absolute right-0 mt-1 w-56 card p-1 z-50">
                  <button type="button" className="btn btn-ghost w-full justify-start" onClick={() => { setDupTime(""); setDupErr(null); setMenuOpen(false); }}>Duplicate for another service…</button>
                  <button type="button" className="btn btn-ghost w-full justify-start" onClick={() => { setTemplateName(`${it.title} Template`); setMenuOpen(false); }}>Save as template…</button>
                  {anyCompleted && (
                    <button type="button" className="btn btn-ghost w-full justify-start" onClick={resetProgress}>Reset progress</button>
                  )}
                  <Confirm label="Delete Sunday" confirmLabel="Delete Sunday" className="btn btn-ghost w-full justify-start text-red-400" onConfirm={deleteSunday} />
                </div>
              )}
            </div>
          </div>
        }
      />

      {dupTime !== null && (
        <div className="card p-4 space-y-2">
          <div className="font-semibold">Duplicate for another service</div>
          <p className="text-sm text-[#9fb0d3]">Copies every section, the lesson, passage, and verse onto a second plan for {it.scheduled_date ?? "the same date"}. Progress starts fresh.</p>
          <label>Start time of the other service</label>
          <input value={dupTime} placeholder="11:00 AM" autoFocus onChange={(e) => { setDupTime(e.target.value); setDupErr(null); }} onKeyDown={(e) => { if (e.key === "Enter") duplicateService(); }} />
          {dupErr && <div className="text-xs text-red-400">{dupErr}</div>}
          <div className="flex gap-2">
            <button type="button" className="btn btn-primary" disabled={dupBusy} onClick={duplicateService}>{dupBusy ? "Duplicating…" : "Duplicate"}</button>
            <button type="button" className="btn btn-ghost" onClick={() => setDupTime(null)}>Cancel</button>
          </div>
        </div>
      )}

      {templateName !== null && (
        <div className="card p-4 space-y-2">
          <label>Template name</label>
          <input value={templateName} onChange={(e) => setTemplateName(e.target.value)} autoFocus />
          <div className="flex gap-2">
            <button type="button" className="btn btn-primary" onClick={() => saveTemplate(templateName.trim() || `${it.title} Template`)}>Save</button>
            <button type="button" className="btn btn-ghost" onClick={() => setTemplateName(null)}>Cancel</button>
          </div>
        </div>
      )}

      {/* Details */}
      <div className="card p-4 space-y-3">
        <div>
          <label>Title</label>
          <input defaultValue={it.title} onBlur={(e) => { if (e.target.value !== it.title) patchItinerary({ title: e.target.value }); }} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label>Date</label>
            <DateInput value={it.scheduled_date ?? ""} onChange={(v) => { if ((v || null) !== it.scheduled_date) patchItinerary({ scheduled_date: v || null }); }} />
          </div>
          <div>
            <label>Start time</label>
            <input defaultValue={it.start_time ?? ""} placeholder="10:30 AM" onBlur={(e) => onStartTimeBlur(e.target.value)} />
            {startErr && <div className="text-xs text-red-400 mt-1">Use a time like 10:30 AM</div>}
          </div>
          <div>
            <label>Slot length (min)</label>
            <input type="number" inputMode="numeric" min={0} defaultValue={it.slot_minutes ?? ""} placeholder="60"
              onBlur={(e) => { const v = e.target.value ? parseInt(e.target.value, 10) : null; if (v !== it.slot_minutes) patchItinerary({ slot_minutes: v }); }} />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label>Lesson title</label>
            <input defaultValue={it.lesson_title ?? ""} onBlur={(e) => { if ((e.target.value || null) !== it.lesson_title) patchItinerary({ lesson_title: e.target.value || null }); }} />
          </div>
          <div>
            <label>Bible passage</label>
            <input id="bible_passage" defaultValue={it.bible_passage ?? ""} onBlur={(e) => { if ((e.target.value || null) !== it.bible_passage) patchItinerary({ bible_passage: e.target.value || null }); }} />
          </div>
        </div>
      </div>

      {/* Sections */}
      <div ref={listRef} className="space-y-2">
        {sections.map((s, i) => (
          <div key={s.id}>
            {dragging && dragging.overIndex === i && <div className="h-0.5 bg-blue-500 rounded mb-2" />}
            <SectionRow
              section={s}
              index={i}
              row={timeline[i]}
              expanded={expanded === s.id}
              dragging={dragging?.id === s.id}
              memoryVerse={it.memory_verse}
              onVerseChange={(v) => patchItinerary({ memory_verse: v })}
              biblePassage={it.bible_passage}
              onToggle={() => setExpanded((cur) => (cur === s.id ? null : s.id))}
              onPatch={(patch) => patchSection(s.id, patch)}
              onMove={(dir) => reorder(i, i + dir)}
              onDuplicate={() => duplicate(s)}
              onDelete={() => remove(s.id)}
              isFirst={i === 0}
              isLast={i === sections.length - 1}
              dragHandleProps={{ onPointerDown: startDrag(s.id) }}
            />
          </div>
        ))}
        {dragging && dragging.overIndex === sections.length && <div className="h-0.5 bg-blue-500 rounded" />}
        {sections.length === 0 && <div className="card p-4 text-sm text-[#9fb0d3]">No sections yet — add one below.</div>}
      </div>

      <SectionPalette onAdd={addSection} />

      <TimelineFooter startTime={it.start_time} slotMinutes={it.slot_minutes} sections={sections} />
    </div>
  );
}
