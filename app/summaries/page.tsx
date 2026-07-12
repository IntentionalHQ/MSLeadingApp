"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Contest } from "@/lib/types";

export default function SummariesPage() {
  const [contests, setContests] = useState<Contest[]>([]);
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const [{ data: c }, { data: s }] = await Promise.all([
        supabase.from("contests").select("*").eq("status", "archived").order("archived_at", { ascending: false }),
        supabase.from("summaries").select("*").order("date", { ascending: false }),
      ]);
      setContests((c ?? []) as any);
      setItems(s ?? []);
    })();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1>Past Contests</h1>
        {contests.length === 0 ? (
          <p className="text-sm text-[#9fb0d3] mt-2">No archived contests yet.</p>
        ) : (
          <ul className="space-y-2 mt-2">
            {contests.map((c) => {
              const snap = c.snapshot ?? {};
              const teamRows = (snap.teams ?? []) as Array<{ name: string; total_score: number }>;
              const winner = [...teamRows].sort((a, b) => b.total_score - a.total_score)[0];
              return (
                <li key={c.id} className="card p-3">
                  <div className="flex justify-between">
                    <div>
                      <div className="font-bold">{c.name}</div>
                      <div className="text-xs text-[#9fb0d3]">{c.start_date ?? "—"} → {c.end_date ?? "—"} · {c.weeks ?? "?"} weeks</div>
                    </div>
                    {winner && <div className="text-right"><div className="text-xs text-[#9fb0d3]">Winner</div><div className="font-semibold">🏆 {winner.name}</div></div>}
                  </div>
                  {teamRows.length > 0 && (
                    <ul className="mt-2 text-sm">
                      {teamRows.map((t, i) => (
                        <li key={i} className="flex justify-between">
                          <span>{t.name}</span>
                          <span className="font-mono">{t.total_score}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div>
        <h1>Group Summaries</h1>
        {items.length === 0 && <p className="text-sm text-[#9fb0d3] mt-2">No summaries yet.</p>}
        <ul className="space-y-2 mt-2">
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
    </div>
  );
}
