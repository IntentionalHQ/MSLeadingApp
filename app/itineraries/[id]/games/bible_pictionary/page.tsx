"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { Team, GamePrompt } from "@/lib/types";
import { shuffle } from "@/lib/shuffle";

const ROUND_SECONDS = 60;
const WIN_TARGET = 5;

type PickedPrompt = GamePrompt & { revealed: boolean };

export default function BiblePictionaryPage() {
  const { id } = useParams<{ id: string }>();
  const [teams, setTeams] = useState<Team[]>([]);
  const [pool, setPool] = useState<GamePrompt[]>([]);
  const [used, setUsed] = useState<string[]>([]);
  const [scores, setScores] = useState<[number, number]>([0, 0]);
  const [turn, setTurn] = useState<0 | 1>(0);
  const [current, setCurrent] = useState<PickedPrompt | null>(null);
  const [seconds, setSeconds] = useState<number>(ROUND_SECONDS);
  const [running, setRunning] = useState<boolean>(false);
  const [gameOver, setGameOver] = useState<{ winnerIdx: number | null } | null>(null);
  const [saved, setSaved] = useState<boolean>(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    (async () => {
      const [{ data: t }, { data: p }] = await Promise.all([
        supabase.from("teams").select("*").order("name"),
        supabase.from("game_prompts").select("*").eq("active", true).limit(500),
      ]);
      setTeams((t ?? []) as Team[]);
      setPool(shuffle((p ?? []) as GamePrompt[]));
    })();
  }, []);

  useEffect(() => {
    if (!running) { if (timerRef.current) clearInterval(timerRef.current); return; }
    timerRef.current = setInterval(() => {
      setSeconds((s) => {
        if (s <= 1) {
          setRunning(false);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [running]);

  const teamA = teams[0]; const teamB = teams[1];
  const currentTeam = turn === 0 ? teamA : teamB;

  const drawPrompt = () => {
    const remaining = pool.filter((p) => !used.includes(p.id));
    if (remaining.length === 0) { alert("No more prompts. Add some in the Prompts admin."); return; }
    const pick = remaining[Math.floor(Math.random() * remaining.length)];
    setCurrent({ ...pick, revealed: false });
    setUsed((u) => [...u, pick.id]);
    setSeconds(ROUND_SECONDS);
    setRunning(false);
  };

  const scored = () => {
    setScores((s) => {
      const next: [number, number] = [...s] as [number, number];
      next[turn] += 1;
      const winnerIdx = next[0] >= WIN_TARGET ? 0 : next[1] >= WIN_TARGET ? 1 : null;
      if (winnerIdx !== null) setGameOver({ winnerIdx });
      return next;
    });
    endRound();
  };

  const endRound = () => {
    setRunning(false);
    setCurrent(null);
    setSeconds(ROUND_SECONDS);
    setTurn((t) => (t === 0 ? 1 : 0));
  };

  const saveResults = async () => {
    if (!teamA || !teamB || saved) return;
    setSaved(true);
    const points: [number, number] = scores;
    const winnerIdx = gameOver?.winnerIdx ?? (points[0] === points[1] ? null : points[0] > points[1] ? 0 : 1);
    for (let i = 0; i < 2; i++) {
      const team = i === 0 ? teamA : teamB;
      if (points[i] > 0) {
        await supabase.from("score_events").insert({ team_id: team.id, itinerary_id: id, points: points[i], reason: "Bible Pictionary" });
      }
    }
    await supabase.from("game_results").insert({
      itinerary_id: id, game_type: "bible_pictionary",
      team_a_id: teamA.id, team_b_id: teamB.id,
      team_a_score: points[0], team_b_score: points[1],
      winner_team_id: winnerIdx === null ? null : (winnerIdx === 0 ? teamA.id : teamB.id),
    });
  };

  const reset = () => {
    setScores([0, 0]); setTurn(0); setCurrent(null); setUsed([]);
    setSeconds(ROUND_SECONDS); setRunning(false); setGameOver(null); setSaved(false);
  };

  const fmt = (n: number) => `${Math.floor(n / 60)}:${String(n % 60).padStart(2, "0")}`;

  if (!teamA || !teamB) {
    return (
      <div className="card p-4">
        <h1>🎨 Bible Pictionary</h1>
        <p className="mt-2 text-[#9fb0d3]">Need two teams to play. Set them up in Teams.</p>
        <Link href="/teams" className="btn btn-primary mt-3">Go to Teams</Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h1>🎨 Bible Pictionary</h1>
        <Link href={`/itineraries/${id}/games`} className="btn btn-ghost">← All games</Link>
      </div>

      {/* Scoreboard */}
      <div className="grid grid-cols-2 gap-2">
        {[teamA, teamB].map((t, i) => (
          <div key={t.id} className={"card p-3 text-center " + (turn === i && !gameOver ? "border-blue-500" : "")}>
            <div className="text-xs text-[#9fb0d3]">{turn === i && !gameOver ? "Drawing now" : ""}</div>
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
        <div className="card p-6 text-center space-y-3">
          <div className="text-lg">
            <b>{currentTeam?.name}</b>'s turn to draw
          </div>
          <div className="text-sm text-[#9fb0d3]">First to {WIN_TARGET} points wins.</div>
          <button onClick={drawPrompt} className="btn btn-primary btn-lg">Draw a Prompt</button>
        </div>
      ) : (
        <div className="card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-xs uppercase text-[#9fb0d3]">
              {current.category} · {current.difficulty}{current.testament ? ` · ${current.testament}` : ""}
            </div>
            <div className="font-mono text-2xl">{fmt(seconds)}</div>
          </div>

          {current.revealed ? (
            <div className="p-6 rounded bg-[#0b1220] border border-yellow-600 text-center">
              <div className="text-xs text-yellow-500 uppercase">Draw this — teammates don't peek</div>
              <div className="text-3xl font-bold mt-2">{current.text}</div>
              {current.hint && <div className="text-sm text-[#9fb0d3] mt-2">Hint: {current.hint}</div>}
            </div>
          ) : (
            <button onClick={() => setCurrent({ ...current, revealed: true })} className="btn btn-primary btn-lg w-full">
              👁 Show prompt to drawer
            </button>
          )}

          <div className="grid grid-cols-2 gap-2">
            {!running ? (
              <button onClick={() => setRunning(true)} disabled={!current.revealed} className="btn btn-primary btn-lg col-span-2 disabled:opacity-40">
                ▶ Start Timer
              </button>
            ) : (
              <button onClick={() => setRunning(false)} className="btn btn-ghost btn-lg col-span-2">⏸ Pause</button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button onClick={scored} className="btn btn-primary btn-lg">✅ Guessed it (+1)</button>
            <button onClick={endRound} className="btn btn-ghost btn-lg">Skip / Time's up</button>
          </div>
        </div>
      )}

      <div className="text-xs text-[#9fb0d3] text-center">
        {used.length} of {pool.length} prompts used
      </div>
    </div>
  );
}
