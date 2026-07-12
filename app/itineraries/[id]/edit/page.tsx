"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { Itinerary, Section, SectionType } from "@/lib/types";
import { SECTION_LABEL } from "@/lib/types";

export default function EditItineraryPage() {
  const { id } = useParams<{ id: string }>();
  const [it, setIt] = useState<Itinerary | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [editing, setEditing] = useState<string | null>(null);

  const load = async () => {
    const { data: it } = await supabase.from("itineraries").select("*").eq("id", id).single();
    const { data: secs } = await supabase.from("itinerary_sections").select("*").eq("itinerary_id", id).order("position");
    setIt(it as any);
    setSections((secs ?? []) as any);
  };
  useEffect(() => { load(); }, [id]);

  const updateItinerary = async (patch: Partial<Itinerary>) => {
    await supabase.from("itineraries").update(patch).eq("id", id);
    setIt((prev) => (prev ? { ...prev, ...patch } : prev));
  };

  const addSection = async () => {
    const pos = sections.length;
    const { data } = await supabase.from("itinerary_sections").insert({
      itinerary_id: id, position: pos, title: "New Section", section_type: "custom", duration_minutes: 5,
    }).select().single();
    if (data) setSections([...sections, data as any]);
  };

  const saveTemplate = async () => {
    if (!it) return;
    // Duplicate current itinerary as a template
    const { data: newIt } = await supabase.from("itineraries").insert({
      title: it.title + " (Template)", is_template: true,
    }).select().single();
    if (!newIt) return;
    await supabase.from("itinerary_sections").insert(sections.map((s) => ({
      itinerary_id: newIt.id, position: s.position, title: s.title, section_type: s.section_type,
      start_time: s.start_time, duration_minutes: s.duration_minutes,
      instructions: s.instructions, script: s.script,
      discussion_questions: s.discussion_questions, notes: s.notes,
    })));
    alert("Saved as template");
  };

  const move = async (idx: number, dir: -1 | 1) => {
    const j = idx + dir;
    if (j < 0 || j >= sections.length) return;
    const a = sections[idx], b = sections[j];
    const next = [...sections];
    next[idx] = { ...b, position: idx };
    next[j] = { ...a, position: j };
    setSections(next);
    await supabase.from("itinerary_sections").update({ position: idx }).eq("id", b.id);
    await supabase.from("itinerary_sections").update({ position: j }).eq("id", a.id);
  };

  const dup = async (s: Section) => {
    const pos = sections.length;
    const { data } = await supabase.from("itinerary_sections").insert({
      itinerary_id: id, position: pos, title: s.title + " (copy)", section_type: s.section_type,
      start_time: s.start_time, duration_minutes: s.duration_minutes,
      instructions: s.instructions, script: s.script,
      discussion_questions: s.discussion_questions, notes: s.notes,
    }).select().single();
    if (data) setSections([...sections, data as any]);
  };

  const del = async (sid: string) => {
    if (!confirm("Delete this section?")) return;
    await supabase.from("itinerary_sections").delete().eq("id", sid);
    setSections(sections.filter((s) => s.id !== sid));
  };

  const patchSection = async (sid: string, patch: Partial<Section>) => {
    setSections((prev) => prev.map((s) => (s.id === sid ? { ...s, ...patch } : s)));
    await supabase.from("itinerary_sections").update(patch).eq("id", sid);
  };

  if (!it) return <p>Loading…</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1>{it.title}</h1>
        <div className="flex gap-2">
          <button onClick={saveTemplate} className="btn btn-ghost">Save as Template</button>
          <Link href={`/itineraries/${id}/lead`} className="btn btn-primary">Start Group ▶</Link>
        </div>
      </div>

      <div className="card p-4 space-y-3">
        <div><label>Title</label><input defaultValue={it.title} onBlur={(e) => updateItinerary({ title: e.target.value })} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label>Date</label><input type="date" defaultValue={it.scheduled_date ?? ""} onBlur={(e) => updateItinerary({ scheduled_date: e.target.value || null })} /></div>
          <div><label>Lesson title</label><input defaultValue={it.lesson_title ?? ""} onBlur={(e) => updateItinerary({ lesson_title: e.target.value || null })} /></div>
        </div>
        <div><label>Bible passage</label><input defaultValue={it.bible_passage ?? ""} onBlur={(e) => updateItinerary({ bible_passage: e.target.value || null })} /></div>
        <div><label>Memory verse</label><textarea rows={2} defaultValue={it.memory_verse ?? ""} onBlur={(e) => updateItinerary({ memory_verse: e.target.value || null })} /></div>
      </div>

      <div className="space-y-2">
        {sections.map((s, i) => (
          <div key={s.id} className="card p-3">
            <div className="flex items-center gap-2">
              <span className="text-[#9fb0d3] text-sm w-6">{i + 1}.</span>
              <input value={s.title} onChange={(e) => patchSection(s.id, { title: e.target.value })} className="flex-1" />
              <select value={s.section_type} onChange={(e) => patchSection(s.id, { section_type: e.target.value as SectionType })} className="w-40">
                {Object.entries(SECTION_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            {editing === s.id && (
              <div className="mt-3 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div><label>Start time</label><input value={s.start_time ?? ""} onChange={(e) => patchSection(s.id, { start_time: e.target.value || null })} placeholder="10:30 AM" /></div>
                  <div><label>Duration (min)</label><input type="number" value={s.duration_minutes ?? ""} onChange={(e) => patchSection(s.id, { duration_minutes: e.target.value ? parseInt(e.target.value) : null })} /></div>
                </div>
                <div><label>Instructions</label><textarea rows={2} value={s.instructions ?? ""} onChange={(e) => patchSection(s.id, { instructions: e.target.value || null })} /></div>
                <div><label>Script (what to say)</label><textarea rows={2} value={s.script ?? ""} onChange={(e) => patchSection(s.id, { script: e.target.value || null })} /></div>
                <div><label>Discussion questions</label><textarea rows={2} value={s.discussion_questions ?? ""} onChange={(e) => patchSection(s.id, { discussion_questions: e.target.value || null })} /></div>
                <div><label>Notes</label><textarea rows={2} value={s.notes ?? ""} onChange={(e) => patchSection(s.id, { notes: e.target.value || null })} /></div>
              </div>
            )}
            <div className="flex gap-2 mt-2">
              <button onClick={() => setEditing(editing === s.id ? null : s.id)} className="btn btn-ghost">{editing === s.id ? "Close" : "Details"}</button>
              <button onClick={() => move(i, -1)} className="btn btn-ghost">↑</button>
              <button onClick={() => move(i, 1)} className="btn btn-ghost">↓</button>
              <button onClick={() => dup(s)} className="btn btn-ghost">Duplicate</button>
              <button onClick={() => del(s.id)} className="btn btn-ghost">🗑</button>
            </div>
          </div>
        ))}
        <button onClick={addSection} className="btn btn-ghost w-full">+ Add Section</button>
      </div>
    </div>
  );
}
