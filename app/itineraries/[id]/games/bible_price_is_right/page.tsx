"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { Team, PirQuestion } from "@/lib/types";

const WIN_TARGET = 5;

type Phase = "idle" | "bidding" | "revealed";

export default function BiblePriceIsRightPage() {
  const { id } = useParams<{ id: string }>();
  const [teams, setTeams] = useState<Team[]>([]);
  const [pool, setPool] = useState<PirQuestion[]>([]);
  const [used, setUsed] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [filterCat, setFilterCat] = useState<string>("all");
  const [scores, setScores] = useState<[number, number]>([0, 0]);
  const [current, setCurrent] = useState<PirQuestion | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [bidA, setBidA] = useState<string>("");
  const [bidB, setBidB] = useState<string>("");
  const [gameOver, setGameOver] = useState<{ winnerIdx: number | null } | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    (async () => {
      const [{ data: t }, { data: p }] = await Promise.all([
        supabase.from("teams").select("*").order("name"),
        supabase.from("pir_questions").select("*").eq("active", true).limit(500),
      ]);
      setTeams((t ?? []) as Team[]);
      const list = (p ?? []) as PirQuestion[];
      setPool(list);
      const cats = Array.from(new Set(list.map((q) => q.category).filter(Boolean))) as string[];
      setCategories(cats.sort());
    })();
  }, []);

  const teamA = teams[0]; const teamB = teams[1];

  const drawQuestion = () => {
    const remaining = pool.filter((q) => {
      if (used.includes(q.id)) return false;
      if (q.numeric_target === null) return false;
      if (filterCat !== "all" && q.category !== filterCat) return false;
      return true;
    });
    if (remaining.length === 0) { alert("No more questions in this category. Try another or reset."); return; }
    const pick = remaining[Math.floor(Math.random() * remaining.length)];
    setCurrent(pick);
    setUsed((u) => [...u, pick.id]);
    setBidA(""); setBidB("");
    setPhase("bidding");
  };

  const reveal = () => {
    if (!current || current.numeric_target === null) return;
    const target = current.numeric_target;
    const a = Number(bidA); const b = Number(bidB);
    const aValid = bidA !== "" && !Number.isNaN(a);
    const bValid = bidB !== "" && !Number.isNaN(b);
    let winnerIdx: 0 | 1 | null = null;
    if (aValid && bValid) {
      const aOver = a > target; const bOver = b > target;
      if (!aOver && !bOver) {
        winnerIdx = Math.abs(target - a) <= Math.abs(target - b) ? 0 : 1;
      } else if (!aOver && bOver) {
        winnerIdx = 0;
      } else if (aOver && !bOver) {
        winnerIdx = 1;
      } else {
        // both over — closest wins (kid-friendly, everyone still gets a point sometimes)
        winnerIdx = Math.abs(target - a) <= Math.abs(target - b) ? 0 : 1;
      }
    } else if (aValid) winnerIdx = 0;
    else if (bValid) winnerIdx = 1;

    if (winnerIdx !== null) {
      setScores((s) => {
        const next: [number, number] = [...s] as [number, number];
        next[winnerIdx!] += 1;
        const finalWinner = next[0] >= WIN_TARGET ? 0 : next[1] >= WIN_TARGET ? 1 : null;
        if (finalWinner !== null) setGameOver({ winnerIdx: finalWinner });
        return next;
      });
    }
    setPhase("revealed");
  };

  const nextQuestion = () => {
    setCurrent(null); setPhase("idle"); setBidA(""); setBidB("");
  };

  const saveResults = async () => {
    if (!teamA || !teamB || saved) return;
    setSaved(true);
    const points: [number, number] = scores;
    const winnerIdx = gameOver?.winnerIdx ?? (points[0] === points[1] ? null : points[0] > points[1] ? 0 : 1);
    for (let i = 0; i < 2; i++) {
      const team = i === 0 ? teamA : teamB;
      if (points[i] > 0) {
        await supabase.from("score_events").insert({ team_id: team.id, itinerary_id: id, points: points[i], reason: "Bible Price Is Right" });
      }
    }
    await supabase.from("game_results").insert({
      itinerary_id: id, game_type: "bible_price_is_right",
      team_a_id: teamA.id, team_b_id: teamB.id,
      team_a_score: points[0], team_b_score: points[1],
      winner_team_id: winnerIdx === null ? null : (winnerIdx === 0 ? teamA.id : teamB.id),
    });
  };

  const reset = () => {
    setScores([0, 0]); setCurrent(null); setUsed([]);
    setPhase("idle"); setBidA(""); setBidB("");
    setGameOver(null); setSaved(false);
  };

  const fmtTarget = (q: PirQuestion) => {
    if (q.numeric_target === null) return q.host_answer ?? "";
    const n = q.numeric_target;
    const nice = Number.isInteger(n) ? n.toLocaleString() : n.toLocaleString(undefined, { maximumFractionDigits: 2 });
    return `${nice}${q.unit ? " " + q.unit : ""}`;
  };

  if (!teamA || !teamB) {
    return (
      <div className="card p-4">
        <h1>🎯 Bible Price Is Right</h1>
        <p className="mt-2 text-[#9fb0d3]">Need two teams to play. Set them up in Teams.</p>
        <Link href="/teams" className="btn btn-primary mt-3">Go to Teams</Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h1>🎯 Bible Price Is Right</h1>
        <Link href={`/itineraries/${id}/games`} className="btn btn-ghost">← All games</Link>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {[teamA, teamB].map((t, i) => (
          <div key={t.id} className="card p-3 text-center">
            <div className="font-bold">{t.icon} {t.name}</div>
            <div className="text-3xl font-bold mt-1">{scores[i]}</div>
          </div>
        ))}
      </div>

      {gameOver ? (
        <div className="card p-6 text-center space-y-3">
          <div className="text-2xl">🎉 {gameOver.winnerIdx === null ? "It's a tie!" : `${(gameOver.winnerIdx === 0 ? teamA : teamB).name} wins!`}</div>
          <div className="flex gap-2 justify-center">
            <button onClick={saveResults} disabled={saved} className="btn btn-primary btn-lg">{saved ? "Saved ✓" : "Save & Record"}</button>
            <button onClick={reset} className="btn btn-ghost btn-lg">Play Again</button>
          </div>
        </div>
      ) : !current ? (
        <div className="card p-4 space-y-3">
          <div>
            <label>Category</label>
            <select value={filterCat} onChange={(e) => setFilterCat(e.target.value)}>
              <option value="all">Any category</option>
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="text-sm text-[#9fb0d3]">
            First to {WIN_TARGET} points wins. Closest without going over gets the point. If both go over, closest still wins.
          </div>
          <button onClick={drawQuestion} className="btn btn-primary btn-lg w-full">Draw a Question</button>
          {pool.length === 0 && (
            <div className="text-sm text-yellow-500">
              No PIR questions loaded yet — run <code>supabase/v5_migration.sql</code> then <code>supabase/seed_pir.sql</code>.
            </div>
          )}
        </div>
      ) : (
        <div className="card p-4 space-y-3">
          <div className="flex items-center justify-between text-xs uppercase text-[#9fb0d3]">
            <span>{current.category}</span>
            {current.unit && <span>Answer in {current.unit}</span>}
          </div>
          <div className="text-lg font-semibold">{current.question}</div>

          {phase === "bidding" && (
            <>
              <div className="grid grid-cols-2 gap-3">
                {[teamA, teamB].map((t, i) => (
                  <div key={t.id} className="space-y-1">
                    <label>{t.icon} {t.name}'s bid</label>
                    <input
                      type="number"
                      inputMode="decimal"
                      value={i === 0 ? bidA : bidB}
                      onChange={(e) => (i === 0 ? setBidA(e.target.value) : setBidB(e.target.value))}
                      placeholder="Enter number"
                    />
                  </div>
                ))}
              </div>
              <button onClick={reveal} className="btn btn-primary btn-lg w-full">Reveal Answer</button>
            </>
          )}

          {phase === "revealed" && (
            <>
              <div className="p-4 rounded bg-[#0b1220] border border-yellow-600 text-center">
                <div className="text-xs text-yellow-500 uppercase">Answer</div>
                <div className="text-3xl font-bold mt-1">{fmtTarget(current)}</div>
                {current.host_answer && (
                  <div className="text-sm text-[#9fb0d3] mt-2 italic">{current.host_answer}</div>
                )}
                {current.accepted_answer && current.accepted_answer !== current.host_answer && (
                  <div className="text-xs text-[#9fb0d3] mt-1">Accepted: {current.accepted_answer}</div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 text-center">
                {[teamA, teamB].map((t, i) => {
                  const bid = i === 0 ? bidA : bidB;
                  const target = current.numeric_target;
                  const n = Number(bid);
                  const over = target !== null && !Number.isNaN(n) && bid !== "" && n > target;
                  return (
                    <div key={t.id} className={"card p-2 " + (over ? "border-red-700" : "border-[#1f2a44]")}>
                      <div className="text-xs text-[#9fb0d3]">{t.name} bid</div>
                      <div className="text-xl font-bold">{bid === "" ? "—" : n.toLocaleString()}</div>
                      {over && <div className="text-xs text-red-400">Over</div>}
                    </div>
                  );
                })}
              </div>

              {current.background && (
                <div className="text-sm text-[#9fb0d3] mt-1">
                  <div className="text-xs uppercase">Background</div>
                  {current.background}
                </div>
              )}
              {(current.reference_1 || current.reference_2) && (
                <div className="text-xs text-[#9fb0d3]">
                  📖 {[current.reference_1, current.reference_2].filter(Boolean).join(" · ")}
                </div>
              )}

              <button onClick={nextQuestion} className="btn btn-primary btn-lg w-full">Next Question →</button>
            </>
          )}
        </div>
      )}

      <div className="text-xs text-[#9fb0d3] text-center">
        {used.length} of {pool.length} questions used
      </div>
    </div>
  );
}
