"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { PirQuestion } from "@/lib/types";

type Draft = Partial<PirQuestion>;

const EMPTY: Draft = {
  question: "",
  host_answer: "",
  accepted_answer: "",
  numeric_target: null,
  unit: "",
  category: "",
  background: "",
  reference_1: "",
  reference_2: "",
  fact_type: "",
  source_url: "",
  active: true,
};

export default function PirAdminPage() {
  const [items, setItems] = useState<PirQuestion[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [filterCat, setFilterCat] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const load = async () => {
    let q = supabase.from("pir_questions").select("*").order("created_at", { ascending: false }).limit(500);
    if (filterCat !== "all") q = q.eq("category", filterCat);
    const { data } = await q;
    let list = (data ?? []) as PirQuestion[];
    if (search.trim()) list = list.filter((x) => x.question.toLowerCase().includes(search.toLowerCase()));
    setItems(list);
    // Also load full category list once
    const { data: allCats } = await supabase.from("pir_questions").select("category");
    const cats = Array.from(new Set(((allCats ?? []) as any[]).map((r) => r.category).filter(Boolean))) as string[];
    setCategories(cats.sort());
  };
  useEffect(() => { load(); }, [filterCat, search]);

  const save = async () => {
    if (!draft || !draft.question?.trim()) return;
    const payload: any = {
      question: draft.question.trim(),
      host_answer: draft.host_answer?.trim() || null,
      accepted_answer: draft.accepted_answer?.trim() || null,
      numeric_target: draft.numeric_target === null || draft.numeric_target === undefined || String(draft.numeric_target) === "" ? null : Number(draft.numeric_target),
      unit: draft.unit?.trim() || null,
      category: draft.category?.trim() || null,
      background: draft.background?.trim() || null,
      reference_1: draft.reference_1?.trim() || null,
      reference_2: draft.reference_2?.trim() || null,
      fact_type: draft.fact_type?.trim() || null,
      source_url: draft.source_url?.trim() || null,
      active: draft.active ?? true,
    };
    if (editingId) {
      await supabase.from("pir_questions").update(payload).eq("id", editingId);
    } else {
      await supabase.from("pir_questions").insert(payload);
    }
    setDraft(null); setEditingId(null);
    load();
  };

  const startEdit = (p: PirQuestion) => { setEditingId(p.id); setDraft({ ...p }); };
  const startNew = () => { setEditingId(null); setDraft({ ...EMPTY }); };

  const toggleActive = async (p: PirQuestion) => {
    await supabase.from("pir_questions").update({ active: !p.active }).eq("id", p.id);
    load();
  };
  const del = async (p: PirQuestion) => {
    if (!confirm(`Delete this question?`)) return;
    await supabase.from("pir_questions").delete().eq("id", p.id);
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/admin" className="text-xs text-[#9fb0d3]">← All banks</Link>
          <h1>Bible Price Is Right — Questions</h1>
        </div>
        <button onClick={startNew} className="btn btn-primary">+ New Question</button>
      </div>

      <div className="card p-3 space-y-2">
        <div className="flex gap-2 flex-wrap items-center">
          <span className="text-xs text-[#9fb0d3] uppercase">Category</span>
          <button onClick={() => setFilterCat("all")} className={"btn " + (filterCat === "all" ? "btn-primary" : "btn-ghost")}>All</button>
          {categories.map((c) => (
            <button key={c} onClick={() => setFilterCat(c)} className={"btn " + (filterCat === c ? "btn-primary" : "btn-ghost")}>{c}</button>
          ))}
        </div>
        <input placeholder="Search question text…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {draft && (
        <div className="card p-4 space-y-2">
          <div className="font-bold">{editingId ? "Edit question" : "New question"}</div>
          <div><label>Question</label>
            <textarea rows={2} value={draft.question ?? ""} onChange={(e) => setDraft({ ...draft, question: e.target.value })} placeholder="How many talents of gold did Solomon receive in one year?" />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div><label>Numeric target</label>
              <input type="number" value={draft.numeric_target ?? ""} onChange={(e) => setDraft({ ...draft, numeric_target: e.target.value === "" ? null : Number(e.target.value) })} placeholder="666" />
            </div>
            <div><label>Unit</label>
              <input value={draft.unit ?? ""} onChange={(e) => setDraft({ ...draft, unit: e.target.value })} placeholder="talents" />
            </div>
            <div><label>Category</label>
              <input value={draft.category ?? ""} onChange={(e) => setDraft({ ...draft, category: e.target.value })} placeholder="Money & Value" list="pir-cats" />
              <datalist id="pir-cats">
                {categories.map((c) => <option key={c} value={c} />)}
              </datalist>
            </div>
          </div>
          <div><label>Host answer</label>
            <input value={draft.host_answer ?? ""} onChange={(e) => setDraft({ ...draft, host_answer: e.target.value })} placeholder="666 talents." />
          </div>
          <div><label>Accepted answer / range</label>
            <input value={draft.accepted_answer ?? ""} onChange={(e) => setDraft({ ...draft, accepted_answer: e.target.value })} placeholder="Exact: 666  or  70–80 lb" />
          </div>
          <div><label>Background</label>
            <textarea rows={2} value={draft.background ?? ""} onChange={(e) => setDraft({ ...draft, background: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><label>Reference 1</label>
              <input value={draft.reference_1 ?? ""} onChange={(e) => setDraft({ ...draft, reference_1: e.target.value })} placeholder="1 Kings 10:14" />
            </div>
            <div><label>Reference 2</label>
              <input value={draft.reference_2 ?? ""} onChange={(e) => setDraft({ ...draft, reference_2: e.target.value })} placeholder="2 Chronicles 9:13" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><label>Fact type</label>
              <input value={draft.fact_type ?? ""} onChange={(e) => setDraft({ ...draft, fact_type: e.target.value })} placeholder="Exact biblical number" />
            </div>
            <div><label>Source URL</label>
              <input value={draft.source_url ?? ""} onChange={(e) => setDraft({ ...draft, source_url: e.target.value })} />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={save} className="btn btn-primary">Save to Supabase</button>
            <button onClick={() => { setDraft(null); setEditingId(null); }} className="btn btn-ghost">Cancel</button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {items.map((p) => (
          <div key={p.id} className={"card p-3 " + (!p.active ? "opacity-50" : "")}>
            <div className="flex items-start gap-2">
              <div className="flex-1">
                <div className="font-semibold">{p.question}</div>
                <div className="text-xs text-[#9fb0d3] mt-1">
                  {p.category ? `${p.category} · ` : ""}
                  {p.numeric_target !== null ? `target: ${p.numeric_target}${p.unit ? " " + p.unit : ""}` : "no numeric target"}
                  {p.accepted_answer ? ` · ${p.accepted_answer}` : ""}
                </div>
              </div>
              <div className="flex gap-1 shrink-0">
                <button onClick={() => toggleActive(p)} className="btn btn-ghost">{p.active ? "Disable" : "Enable"}</button>
                <button onClick={() => startEdit(p)} className="btn btn-ghost">Edit</button>
                <button onClick={() => del(p)} className="btn btn-ghost">🗑</button>
              </div>
            </div>
          </div>
        ))}
        {items.length === 0 && <div className="text-sm text-[#9fb0d3] text-center p-4">No questions. Add some above or run the seed SQL.</div>}
      </div>
    </div>
  );
}
