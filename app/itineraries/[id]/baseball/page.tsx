"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { Team, Question } from "@/lib/types";

type Difficulty = "single" | "double" | "triple" | "home_run";
const HIT_LABEL: Record<Difficulty, string> = { single: "Single", double: "Double", triple: "Triple", home_run: "Home Run" };
// Base value with-choices. Answering WITHOUT choices upgrades single→2, double→3.
const BASE_WITH_CHOICES: Record<Difficulty, 1 | 2 | 3 | 4> = { single: 1, double: 2, triple: 3, home_run: 4 };
const BASE_WITHOUT_CHOICES: Record<Difficulty, 1 | 2 | 3 | 4> = { single: 2, double: 3, triple: 3, home_run: 4 };
const MAX_INNINGS = 3;

type State = {
  inning: number;
  half: "top" | "bottom";
  batting: 0 | 1;
  outs: number;
  bases: [boolean, boolean, boolean];
  runs: [number, number];
  used: string[];
};

const initial: State = { inning: 1, half: "top", batting: 0, outs: 0, bases: [false, false, false], runs: [0, 0], used: [] };

function advance(bases: [boolean, boolean, boolean], n: 1 | 2 | 3 | 4): { bases: [boolean, boolean, boolean]; runs: number } {
  let runs = 0;
  const runners: number[] = [0];
  if (bases[0]) runners.push(1);
  if (bases[1]) runners.push(2);
  if (bases[2]) runners.push(3);
  const advanced = runners.map((b) => b + n);
  const newBases: [boolean, boolean, boolean] = [false, false, false];
  for (const b of advanced) {
    if (b >= 4) runs++;
    else if (b >= 1 && b <= 3) newBases[b - 1] = true;
  }
  return { bases: newBases, runs };
}

export default function BaseballPage() {
  const { id } = useParams<{ id: string }>();
  const [teams, setTeams] = useState<Team[]>([]);
  const [state, setState] = useState<State>(initial);
  const [current, setCurrent] = useState<Question | null>(null);
  const [pickedDiff, setPickedDiff] = useState<Difficulty | null>(null);
  const [choicesRevealed, setChoicesRevealed] = useState(false);
  const [showAnswer, setShowAnswer] = useState(false);
  const [popFly, setPopFly] = useState(false);
  const [suddenDeath, setSuddenDeath] = useState(false);
  const [gameOver, setGameOver] = useState<{ winnerIdx: number | null } | null>(null);

  useEffect(() => {
    (async () => {
      const { data: t } = await supabase.from("teams").select("*").order("name");
      setTeams((t ?? []) as any);
    })();
  }, []);

  const teamA = teams[0], teamB = teams[1];
  const battingTeam = state.batting === 0 ? teamA : teamB;
  const fieldingTeam = state.batting === 0 ? teamB : teamA;

  const pickQuestion = async (diff: Difficulty) => {
    setPickedDiff(diff);
    setShowAnswer(false); setPopFly(false); setChoicesRevealed(false);
    const { data } = await supabase
      .from("questions").select("*")
      .eq("difficulty", diff).eq("active", true)
      .limit(200);
    const pool = ((data ?? []) as Question[]).filter((q) => !state.used.includes(q.id));
    if (!pool.length) { alert("No more " + HIT_LABEL[diff] + " questions available"); return; }
    const pick = pool[Math.floor(Math.random() * pool.length)];
    setCurrent(pick);
    setState((s) => ({ ...s, used: [...s.used, pick.id] }));
  };

  const nextHalfIfDone = (outs: number, prevState: State): State => {
    if (outs < 3) return { ...prevState, outs };
    if (prevState.half === "top") {
      return { ...prevState, half: "bottom", batting: 1, outs: 0, bases: [false, false, false] };
    } else {
      const nextInning = prevState.inning + 1;
      if (nextInning > MAX_INNINGS) {
        return { ...prevState, outs: 3 };
      }
      return { ...prevState, inning: nextInning, half: "top", batting: 0, outs: 0, bases: [false, false, false] };
    }
  };

  const correct = () => {
    if (!current || !pickedDiff) return;
    if (suddenDeath) {
      const nextRuns: [number, number] = [state.runs[0], state.runs[1]];
      nextRuns[state.batting] += 1;
      setState((s) => ({ ...s, runs: nextRuns }));
      endGame(nextRuns);
      return;
    }
    const bases = choicesRevealed ? BASE_WITH_CHOICES[pickedDiff] : BASE_WITHOUT_CHOICES[pickedDiff];
    const { bases: newBases, runs: scored } = advance(state.bases, bases);
    setState((s) => {
      const runs: [number, number] = [...s.runs] as [number, number];
      runs[s.batting] += scored;
      return { ...s, bases: newBases, runs };
    });
    clearAtBat();
  };

  const wrong = () => {
    if (!current) return;
    if (popFly) {
      // Direct wrong on pop fly (fielding team was already asked and skipped)
      applyOuts(1);
      return;
    }
    setPopFly(true);
  };

  const popFlyResult = (otherCorrect: boolean) => {
    setPopFly(false);
    if (otherCorrect) {
      // Pop fly caught: 2 outs (batter's out + bonus out)
      applyOuts(2);
    } else {
      // Fielding team missed the pop fly → still 1 out (batter's original miss)
      applyOuts(1);
    }
  };

  const applyOuts = (n: number) => {
    if (suddenDeath) {
      setState((s) => ({ ...s, batting: (s.batting === 0 ? 1 : 0) as 0 | 1, outs: 0, bases: [false, false, false] }));
      clearAtBat();
      return;
    }
    setState((s) => {
      const outs = s.outs + n;
      const next = nextHalfIfDone(outs, s);
      if (outs >= 3 && s.inning >= MAX_INNINGS && s.half === "bottom") {
        setTimeout(() => endGame(s.runs), 0);
      }
      return next;
    });
    clearAtBat();
  };

  const clearAtBat = () => { setCurrent(null); setPickedDiff(null); setShowAnswer(false); setChoicesRevealed(false); };

  const endGame = (finalRuns: [number, number]) => {
    if (finalRuns[0] === finalRuns[1] && !suddenDeath) {
      setSuddenDeath(true);
      alert("Tied! Sudden death Home Run round.");
      return;
    }
    const winnerIdx = finalRuns[0] > finalRuns[1] ? 0 : finalRuns[0] < finalRuns[1] ? 1 : null;
    setGameOver({ winnerIdx });
  };

  const recordGame = async () => {
    if (!gameOver || !teamA || !teamB) return;
    const winner = gameOver.winnerIdx === null ? null : gameOver.winnerIdx === 0 ? teamA.id : teamB.id;
    await supabase.from("game_results").insert({
      itinerary_id: id, game_type: "bible_baseball",
      team_a_id: teamA.id, team_b_id: teamB.id,
      team_a_score: state.runs[0], team_b_score: state.runs[1],
      winner_team_id: winner,
      details: { innings: state.inning, sudden_death: suddenDeath },
    });
    for (let i = 0; i < 2; i++) {
      const team = i === 0 ? teamA : teamB;
      const winBonus = winner === team.id ? 3 : 0;
      const runs = state.runs[i];
      const delta = winBonus + runs;
      if (delta > 0) {
        await supabase.from("teams").update({ total_score: team.total_score + delta }).eq("id", team.id);
      }
      if (runs > 0) {
        await supabase.from("score_events").insert({ team_id: team.id, itinerary_id: id, points: runs, reason: "Bible Baseball runs" });
      }
      if (winBonus > 0) {
        await supabase.from("score_events").insert({ team_id: team.id, itinerary_id: id, points: winBonus, reason: "Bible Baseball win" });
      }
    }
    alert("Game recorded.");
  };

  const restart = () => { setState(initial); setGameOver(null); setSuddenDeath(false); setPopFly(false); clearAtBat(); };

  if (teams.length < 2) return <p className="p-4">Need at least two teams. Go to <Link href="/teams" className="text-blue-400">Teams</Link>.</p>;

  const previewBases = pickedDiff ? (choicesRevealed ? BASE_WITH_CHOICES[pickedDiff] : BASE_WITHOUT_CHOICES[pickedDiff]) : 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h1>⚾ Bible Baseball</h1>
        <Link href={`/itineraries/${id}/lead`} className="btn btn-ghost">← Leader</Link>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {[teamA, teamB].map((t, i) => (
          <div key={t.id} className={"card p-3 text-center " + (state.batting === i && !gameOver ? "ring-2 ring-yellow-400" : "")}>
            <div className="text-3xl">{t.icon}</div>
            <div className="font-bold">{t.name}</div>
            <div className="text-4xl font-mono">{state.runs[i]}</div>
            {state.batting === i && !gameOver && <div className="text-xs text-yellow-400 mt-1">BATTING</div>}
          </div>
        ))}
      </div>

      <div className="card p-3 flex justify-around text-center">
        <div><div className="text-xs text-[#9fb0d3]">Inning</div><div className="font-mono text-lg">{state.half === "top" ? "▲" : "▼"} {state.inning}</div></div>
        <div><div className="text-xs text-[#9fb0d3]">Outs</div><div className="font-mono text-lg">{state.outs}</div></div>
        <div><div className="text-xs text-[#9fb0d3]">Bases</div><div className="font-mono text-lg">{state.bases.map((b, i) => (b ? (i + 1) : "·")).join(" ")}</div></div>
        {suddenDeath && <div className="text-red-400 font-bold">SUDDEN DEATH</div>}
      </div>

      {gameOver ? (
        <div className="card p-6 text-center space-y-3">
          <div className="text-2xl font-bold">
            {gameOver.winnerIdx === null ? "Tie" : `${(gameOver.winnerIdx === 0 ? teamA : teamB).name} win!`}
          </div>
          <div className="flex gap-2 justify-center">
            <button onClick={recordGame} className="btn btn-primary">Save Result</button>
            <button onClick={restart} className="btn btn-ghost">New Game</button>
            <Link href={`/itineraries/${id}/summary`} className="btn btn-ghost">To Summary</Link>
          </div>
        </div>
      ) : !current ? (
        <div className="card p-3">
          <div className="text-sm text-[#9fb0d3] mb-2">{battingTeam?.name} at bat — pick a difficulty.</div>
          <div className="grid grid-cols-2 gap-2">
            {(["single", "double", "triple", "home_run"] as Difficulty[]).map((d) => (
              <button key={d} onClick={() => pickQuestion(d)} className="btn btn-primary btn-lg" disabled={suddenDeath && d !== "home_run"}>
                {HIT_LABEL[d]}
              </button>
            ))}
          </div>
          {suddenDeath && <p className="text-xs text-[#9fb0d3] mt-2">Only Home Runs in sudden death.</p>}
          <p className="text-xs text-[#9fb0d3] mt-2">
            Bonus rule: Answer a Single without seeing the choices = <b>Double</b>. Double without choices = <b>Triple</b>.
          </p>
        </div>
      ) : (
        <div className="card p-4 space-y-3">
          <div className="text-xs uppercase text-[#9fb0d3]">
            {HIT_LABEL[pickedDiff!]} · {battingTeam?.name}
            {pickedDiff && (pickedDiff === "single" || pickedDiff === "double") && (
              <span className="ml-2 text-yellow-400">
                {choicesRevealed ? `(→ ${previewBases} base${previewBases > 1 ? "s" : ""})` : `(→ ${previewBases} bases if correct without choices)`}
              </span>
            )}
          </div>
          <div className="text-lg font-semibold">{current.text}</div>

          {current.choices && !choicesRevealed && (pickedDiff === "single" || pickedDiff === "double") && (
            <button onClick={() => setChoicesRevealed(true)} className="btn btn-ghost">
              Show Choices (drops to {BASE_WITH_CHOICES[pickedDiff]} base{BASE_WITH_CHOICES[pickedDiff] > 1 ? "s" : ""})
            </button>
          )}
          {current.choices && (choicesRevealed || pickedDiff === "triple" || pickedDiff === "home_run") && (
            <ul className="space-y-1">
              {current.choices.map((c) => (
                <li key={c} className="p-2 rounded bg-[#0b1220] border border-[#1f2a44]">{c}</li>
              ))}
            </ul>
          )}
          {showAnswer && (
            <div className="p-3 rounded bg-green-900/30 border border-green-500">
              <div className="text-xs text-green-400">Answer</div>
              <div className="font-semibold">{current.correct_answer}</div>
            </div>
          )}
          {!popFly ? (
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setShowAnswer(true)} className="btn btn-ghost">Show Answer</button>
              <button onClick={correct} className="btn btn-primary">✅ Correct</button>
              <button onClick={wrong} className="btn btn-danger">❌ Wrong</button>
              <button onClick={clearAtBat} className="btn btn-ghost">⏭ Skip</button>
            </div>
          ) : (
            <div className="p-3 rounded bg-yellow-900/30 border border-yellow-500 space-y-2">
              <div className="text-sm">Pop Fly! Offer the question to {fieldingTeam?.name}. If they get it right, that's <b>2 outs</b>.</div>
              <div className="flex gap-2">
                <button onClick={() => popFlyResult(true)} className="btn btn-primary">{fieldingTeam?.name} Correct (2 outs)</button>
                <button onClick={() => popFlyResult(false)} className="btn btn-danger">Wrong / Skip (1 out)</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
