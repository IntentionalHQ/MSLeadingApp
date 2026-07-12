"use client";
import { useEffect, useState } from "react";
import { supabase, safeInsert, safeUpdate } from "@/lib/supabase";
import type { Team } from "@/lib/types";

export default function ScoreBar() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [ok, setOk] = useState(true);

  const load = async () => {
    const { data, error } = await supabase.from("teams").select("*").order("name");
    if (error) { setOk(false); return; }
    setTeams((data ?? []) as any);
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 2000);
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
    return () => { clearInterval(t); window.removeEventListener("focus", onFocus); };
  }, []);

  const bump = async (team: Team, delta: number) => {
    // Optimistic update — persist offline if needed
    setTeams((prev) => prev.map((t) => (t.id === team.id ? { ...t, total_score: t.total_score + delta } : t)));
    await safeInsert("score_events", { team_id: team.id, points: delta, reason: "Live tweak" });
    await safeUpdate("teams", { total_score: team.total_score + delta }, { id: team.id });
  };

  if (!ok || teams.length === 0) return null;

  return (
    <div className="sticky top-0 z-40 -mx-4 mb-3 px-2 py-2 bg-[#0b1220]/95 backdrop-blur border-b border-[#1f2a44]">
      <div className="max-w-3xl mx-auto flex items-center justify-center gap-2 flex-wrap">
        {teams.map((t, i) => (
          <div key={t.id} className="flex items-center gap-1">
            {i > 0 && <div className="text-[#3b4a70] text-lg px-1">vs</div>}
            <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-[#121a2b] border border-[#1f2a44]">
              <span className="text-xl">{t.icon ?? "🏳️"}</span>
              <span className="font-semibold text-sm">{t.name}</span>
              <span className="text-xl font-mono font-bold text-blue-300 tabular-nums mx-1">{t.total_score}</span>
              <button onClick={() => bump(t, -1)} className="px-2 py-0.5 rounded bg-[#1f2a44] hover:bg-[#28345a] text-sm leading-none" aria-label={`${t.name} minus 1`}>−</button>
              <button onClick={() => bump(t, +1)} className="px-2 py-0.5 rounded bg-blue-600 hover:bg-blue-500 text-sm leading-none" aria-label={`${t.name} plus 1`}>+</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
