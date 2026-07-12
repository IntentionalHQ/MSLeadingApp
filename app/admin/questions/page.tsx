"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Question } from "@/lib/types";

const DIFFS: Question["difficulty"][] = ["single", "double", "triple", "home_run"];
const DIFF_LABEL: Record<string, string> = { single: "Single", double: "Double", triple: "Triple", home_run: "Home Run" };

export default function QuestionsAdminPage() {
  const [items, setItems] = useState<Question[]>([]);
  const [filter, setFilter] = useState<Question["difficulty"] | "all">("all");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Question | null>(null);
  const [creating, setCreating] = useState(false);

  const load = async () => {
    let q = supabase.from("questions").select("*").order("created_at", { ascending: false }).limit(500);
    if (filter !== "all") q = q.eq("difficulty", filter);
    const { data } = await q;
    let list = (data ?? []) as Question[];
    if (search.trim()) list = list.filter((x) => x.text.toLowerCase().includes(search.toLowerCase()));
    setItems(list);
  };
  useEffect(() => { load(); }, [filter, search]);

  const save = async (q: Partial<Question>, isNew: boolean) => {
    if (isNew) {
      const { data } = await supabase.from("questions").insert(q).select().single();
      if (data) {
        await supabase.from("question_game_uses").insert({ question_id: (data as any).id, game_type: "bible_baseball", role: (data as any).difficulty });
      }
    } else if (editing) {
      await supabase.from("questions").update(q).eq("id", editing.id);
      await supabase.from("question_game_uses").upsert({ question_id: editing.id, game_type: "bible_baseball", role: q.difficulty ?? editing.difficulty });
    }
    setEditing(null); setCreating(false);
    load();
  };

  const toggleActive = async (q: Question) => {
    await supabase.from("questions").update({ active: !q.active }).eq("id", q.id);
    load();
  };

  const del = async (q: Question) => {
    if (!confirm("Delete this question?")) return;
    await supabase.from("questions").delete().eq("id", q.id);
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1>Question Bank</h1>
        <button onClick={() => setCreating(true)} className="btn btn-primary">+ New</button>
      </div>

      <div className="card p-3 space-y-2">
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setFilter("all")} className={"btn " + (filter === "all" ? "btn-primary" : "btn-ghost")}>All</button>
          {DIFFS.map((d) => (
            <button key={d} onClick={() => setFilter(d)} className={"btn " + (filter === d ? "btn-primary" : "btn-ghost")}>{DIFF_LABEL[d]}</button>
          ))}
        </div>
        <input placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="text-sm text-[#9fb0d3]">{items.length} shown</div>
      <ul className="space-y-2">
        {items.map((q) => (
          <li key={q.id} className={"card p-3 " + (q.active ? "" : "opacity-50")}>
            <div className="flex justify-between items-start gap-2">
              <div>
                <div className="text-xs text-[#9fb0d3]">{DIFF_LABEL[q.difficulty]} · {q.format}</div>
                <div className="font-semibold">{q.text}</div>
                <div className="text-sm text-green-400 mt-1">Answer: {q.correct_answer}</div>
                {q.choices && <div className="text-xs text-[#9fb0d3] mt-1">{q.choices.join(" · ")}</div>}
              </div>
              <div className="flex flex-col gap-1">
                <button onClick={() => setEditing(q)} className="btn btn-ghost">Edit</button>
                <button onClick={() => toggleActive(q)} className="btn btn-ghost">{q.active ? "Hide" : "Show"}</button>
                <button onClick={() => del(q)} className="btn btn-ghost">🗑</button>
              </div>
            </div>
          </li>
        ))}
      </ul>

      {(editing || creating) && <QEditor initial={editing} onCancel={() => { setEditing(null); setCreating(false); }} onSave={(q) => save(q, creating)} />}
    </div>
  );
}

function QEditor({ initial, onCancel, onSave }: { initial: Question | null; onCancel: () => void; onSave: (q: Partial<Question>) => void }) {
  const [text, setText] = useState(initial?.text ?? "");
  const [answer, setAnswer] = useState(initial?.correct_answer ?? "");
  const [difficulty, setDifficulty] = useState<Question["difficulty"]>(initial?.difficulty ?? "single");
  const [format, setFormat] = useState<Question["format"]>(initial?.format ?? "multiple_choice");
  const [choices, setChoices] = useState<string>((initial?.choices ?? ["A) ", "B) ", "C) ", "D) "]).join("\n"));
  const [active, setActive] = useState(initial?.active ?? true);

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
      <div className="card p-4 w-full max-w-lg space-y-3 max-h-full overflow-auto">
        <h2>{initial ? "Edit" : "New"} Question</h2>
        <div><label>Question</label><textarea rows={3} value={text} onChange={(e) => setText(e.target.value)} /></div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label>Difficulty</label>
            <select value={difficulty} onChange={(e) => setDifficulty(e.target.value as Question["difficulty"])}>
              {DIFFS.map((d) => <option key={d} value={d}>{DIFF_LABEL[d]}</option>)}
            </select>
          </div>
          <div>
            <label>Format</label>
            <select value={format} onChange={(e) => setFormat(e.target.value as Question["format"])}>
              <option value="multiple_choice">Multiple Choice</option>
              <option value="open_answer">Open Answer</option>
            </select>
          </div>
        </div>
        {format === "multiple_choice" && (
          <div><label>Choices (one per line, prefix A)/B)/C)/D))</label><textarea rows={4} value={choices} onChange={(e) => setChoices(e.target.value)} /></div>
        )}
        <div><label>Correct Answer</label><input value={answer} onChange={(e) => setAnswer(e.target.value)} /></div>
        <label className="flex items-center gap-2"><input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="w-4 h-4" /> Active</label>
        <div className="flex gap-2 justify-end">
          <button onClick={onCancel} className="btn btn-ghost">Cancel</button>
          <button
            onClick={() => onSave({
              text, correct_answer: answer, difficulty, format, active,
              choices: format === "multiple_choice" ? choices.split("\n").map((s) => s.trim()).filter(Boolean) : null,
            })}
            className="btn btn-primary"
          >Save</button>
        </div>
      </div>
    </div>
  );
}
