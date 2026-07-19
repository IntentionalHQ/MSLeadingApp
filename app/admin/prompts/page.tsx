"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { GamePrompt } from "@/lib/types";

const CATEGORIES: GamePrompt["category"][] = ["person", "place", "object", "story", "theme", "other"];
const DIFFS: GamePrompt["difficulty"][] = ["easy", "medium", "hard"];

type Draft = Partial<GamePrompt>;

const EMPTY: Draft = {
  text: "",
  category: "story",
  difficulty: "medium",
  testament: null,
  hint: "",
  banned_words: null,
  active: true,
};

export default function PromptsAdminPage() {
  const [items, setItems] = useState<GamePrompt[]>([]);
  const [filterCat, setFilterCat] = useState<GamePrompt["category"] | "all">("all");
  const [filterDiff, setFilterDiff] = useState<GamePrompt["difficulty"] | "all">("all");
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const load = async () => {
    let q = supabase.from("game_prompts").select("*").order("created_at", { ascending: false }).limit(500);
    if (filterCat !== "all") q = q.eq("category", filterCat);
    if (filterDiff !== "all") q = q.eq("difficulty", filterDiff);
    const { data } = await q;
    let list = (data ?? []) as GamePrompt[];
    if (search.trim()) list = list.filter((x) => x.text.toLowerCase().includes(search.toLowerCase()));
    setItems(list);
  };
  useEffect(() => { load(); }, [filterCat, filterDiff, search]);

  const save = async () => {
    if (!draft || !draft.text?.trim()) return;
    const payload: any = {
      text: draft.text.trim(),
      category: draft.category ?? "other",
      difficulty: draft.difficulty ?? "medium",
      testament: draft.testament || null,
      hint: draft.hint?.trim() || null,
      banned_words: draft.banned_words ?? null,
      active: draft.active ?? true,
    };
    if (editingId) {
      await supabase.from("game_prompts").update(payload).eq("id", editingId);
    } else {
      await supabase.from("game_prompts").insert(payload);
    }
    setDraft(null); setEditingId(null);
    load();
  };

  const startEdit = (p: GamePrompt) => { setEditingId(p.id); setDraft({ ...p }); };
  const startNew = () => { setEditingId(null); setDraft({ ...EMPTY }); };

  const toggleActive = async (p: GamePrompt) => {
    await supabase.from("game_prompts").update({ active: !p.active }).eq("id", p.id);
    load();
  };
  const del = async (p: GamePrompt) => {
    if (!confirm(`Delete "${p.text}"?`)) return;
    await supabase.from("game_prompts").delete().eq("id", p.id);
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1>Prompt Bank</h1>
          <div className="text-sm text-[#9fb0d3]">Shared by Bible Pictionary, Hangman, and (later) Taboo.</div>
        </div>
        <button onClick={startNew} className="btn btn-primary">+ New Prompt</button>
      </div>

      <div className="card p-3 space-y-2">
        <div className="flex gap-2 flex-wrap items-center">
          <span className="text-xs text-[#9fb0d3] uppercase">Category</span>
          <button onClick={() => setFilterCat("all")} className={"btn " + (filterCat === "all" ? "btn-primary" : "btn-ghost")}>All</button>
          {CATEGORIES.map((c) => (
            <button key={c} onClick={() => setFilterCat(c)} className={"btn " + (filterCat === c ? "btn-primary" : "btn-ghost")}>{c}</button>
          ))}
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          <span className="text-xs text-[#9fb0d3] uppercase">Difficulty</span>
          <button onClick={() => setFilterDiff("all")} className={"btn " + (filterDiff === "all" ? "btn-primary" : "btn-ghost")}>All</button>
          {DIFFS.map((d) => (
            <button key={d} onClick={() => setFilterDiff(d)} className={"btn " + (filterDiff === d ? "btn-primary" : "btn-ghost")}>{d}</button>
          ))}
        </div>
        <input placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {draft && (
        <div className="card p-4 space-y-2">
          <div className="font-bold">{editingId ? "Edit prompt" : "New prompt"}</div>
          <div><label>Answer / word</label>
            <input value={draft.text ?? ""} onChange={(e) => setDraft({ ...draft, text: e.target.value })} placeholder="Noah's Ark" />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div><label>Category</label>
              <select value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value as any })}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div><label>Difficulty</label>
              <select value={draft.difficulty} onChange={(e) => setDraft({ ...draft, difficulty: e.target.value as any })}>
                {DIFFS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div><label>Testament</label>
              <select value={draft.testament ?? ""} onChange={(e) => setDraft({ ...draft, testament: (e.target.value || null) as any })}>
                <option value="">—</option>
                <option value="OT">Old Testament</option>
                <option value="NT">New Testament</option>
              </select>
            </div>
          </div>
          <div><label>Hint (optional)</label>
            <input value={draft.hint ?? ""} onChange={(e) => setDraft({ ...draft, hint: e.target.value })} placeholder="Two of every kind" />
          </div>
          <div className="flex gap-2">
            <button onClick={save} className="btn btn-primary">Save</button>
            <button onClick={() => { setDraft(null); setEditingId(null); }} className="btn btn-ghost">Cancel</button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {items.map((p) => (
          <div key={p.id} className={"card p-3 " + (!p.active ? "opacity-50" : "")}>
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <div className="font-bold">{p.text}</div>
                <div className="text-xs text-[#9fb0d3]">
                  {p.category} · {p.difficulty}{p.testament ? ` · ${p.testament}` : ""}{p.hint ? ` · hint: ${p.hint}` : ""}
                </div>
              </div>
              <button onClick={() => toggleActive(p)} className="btn btn-ghost">{p.active ? "Disable" : "Enable"}</button>
              <button onClick={() => startEdit(p)} className="btn btn-ghost">Edit</button>
              <button onClick={() => del(p)} className="btn btn-ghost">🗑</button>
            </div>
          </div>
        ))}
        {items.length === 0 && <div className="text-sm text-[#9fb0d3] text-center p-4">No prompts. Add some above.</div>}
      </div>
    </div>
  );
}
