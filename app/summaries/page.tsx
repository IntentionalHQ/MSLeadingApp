"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function SummariesPage() {
  const [items, setItems] = useState<any[]>([]);
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("summaries").select("*").order("date", { ascending: false });
      setItems(data ?? []);
    })();
  }, []);

  return (
    <div className="space-y-4">
      <h1>Group Summaries</h1>
      {items.length === 0 && <p className="text-sm text-[#9fb0d3]">No summaries yet.</p>}
      <ul className="space-y-2">
        {items.map((s) => (
          <li key={s.id} className="card p-3">
            <div className="flex justify-between">
              <div className="font-bold">{s.lesson_title ?? "Sunday"}</div>
              <div className="text-sm text-[#9fb0d3]">{s.date}</div>
            </div>
            <div className="text-sm">{s.bible_passage ?? ""}</div>
            <div className="text-sm text-[#9fb0d3] mt-1">Game: {s.game_played ?? "—"}</div>
            {s.team_points && (
              <ul className="mt-2 text-sm">
                {Object.entries(s.team_points).map(([tid, p]: any) => (
                  <li key={tid} className="flex justify-between">
                    <span>{p.name}</span>
                    <span>+{p.points_this_group} · verses {p.memory_verse_success} · total {p.new_total}</span>
                  </li>
                ))}
              </ul>
            )}
            {s.leader_notes && <div className="mt-2 text-sm italic">"{s.leader_notes}"</div>}
          </li>
        ))}
      </ul>
    </div>
  );
}
