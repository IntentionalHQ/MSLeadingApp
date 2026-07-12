"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { Itinerary } from "@/lib/types";

export default function NewItineraryPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<Itinerary[]>([]);
  const [pastItineraries, setPastItineraries] = useState<Itinerary[]>([]);
  const [title, setTitle] = useState("This Sunday");
  const [lesson, setLesson] = useState("");
  const [passage, setPassage] = useState("");
  const [verse, setVerse] = useState("");
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [sourceId, setSourceId] = useState<string>("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: t } = await supabase.from("itineraries").select("*").eq("is_template", true).order("created_at");
      const { data: p } = await supabase.from("itineraries").select("*").eq("is_template", false).order("created_at", { ascending: false }).limit(10);
      setTemplates(t ?? []);
      setPastItineraries(p ?? []);
      if (t && t[0]) setSourceId(t[0].id);
    })();
  }, []);

  const create = async () => {
    setBusy(true);
    const { data: newIt, error } = await supabase.from("itineraries").insert({
      title, lesson_title: lesson || null, bible_passage: passage || null,
      memory_verse: verse || null, scheduled_date: date, is_template: false,
    }).select().single();
    if (error || !newIt) { alert(error?.message ?? "Failed"); setBusy(false); return; }

    if (sourceId) {
      const { data: srcSections } = await supabase.from("itinerary_sections")
        .select("*").eq("itinerary_id", sourceId).order("position");
      if (srcSections && srcSections.length) {
        const clones = srcSections.map((s: any) => ({
          itinerary_id: newIt.id,
          position: s.position, title: s.title, section_type: s.section_type,
          start_time: s.start_time, duration_minutes: s.duration_minutes,
          instructions: s.instructions, script: s.script,
          discussion_questions: s.discussion_questions, notes: s.notes,
          completed: false,
        }));
        await supabase.from("itinerary_sections").insert(clones);
      }
    }
    router.push(`/itineraries/${newIt.id}/edit`);
  };

  return (
    <div className="space-y-4">
      <h1>New Sunday</h1>
      <div className="card p-4 space-y-3">
        <div><label>Title</label><input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
        <div><label>Date</label><input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
        <div><label>Lesson title</label><input value={lesson} onChange={(e) => setLesson(e.target.value)} placeholder="e.g. The Prodigal Son" /></div>
        <div><label>Bible passage</label><input value={passage} onChange={(e) => setPassage(e.target.value)} placeholder="e.g. Luke 15:11–32" /></div>
        <div><label>Memory verse</label><textarea rows={2} value={verse} onChange={(e) => setVerse(e.target.value)} /></div>
        <div>
          <label>Start from…</label>
          <select value={sourceId} onChange={(e) => setSourceId(e.target.value)}>
            <option value="">(Empty)</option>
            <optgroup label="Templates">
              {templates.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
            </optgroup>
            <optgroup label="Previous Sundays">
              {pastItineraries.map((t) => <option key={t.id} value={t.id}>{t.title} · {t.scheduled_date ?? ""}</option>)}
            </optgroup>
          </select>
        </div>
        <button disabled={busy} className="btn btn-primary" onClick={create}>{busy ? "Creating…" : "Create"}</button>
      </div>
    </div>
  );
}
