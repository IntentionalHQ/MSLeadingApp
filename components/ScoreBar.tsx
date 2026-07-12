"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
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
    // Live-update every 2s (cheap, one row per team). Also refresh on focus.
    const t = setInterval(load, 2000);
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    // Register the PWA service worker once, from a client-only path.
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
    return () => { clearInterval(t); window.removeEventListener("focus", onFocus); };
  }, []);

  if (!ok || teams.length === 0) return null;

  return (
    <div className="sticky top-0 z-40 -mx-4 mb-3 px-4 py-2 bg-[#0b1220]/95 backdrop-blur border-b border-[#1f2a44]">
      <div className="max-w-3xl mx-auto flex items-center justify-center gap-3">
        {teams.map((t, i) => (
          <div key={t.id} className="flex items-center gap-2">
            {i > 0 && <div className="text-[#3b4a70] text-lg">vs</div>}
            <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-[#121a2b] border border-[#1f2a44]">
              <span className="text-xl">{t.icon ?? "🏳️"}</span>
              <span className="font-semibold">{t.name}</span>
              <span className="text-2xl font-mono font-bold text-blue-300 tabular-nums">{t.total_score}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
