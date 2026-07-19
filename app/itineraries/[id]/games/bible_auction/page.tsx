"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { Team, Question } from "@/lib/types";

const STARTING_CASH = 500;
type Difficulty = Question["difficulty"];
const DIFFS: Difficulty[] = ["single", "double", "triple", "home_run"];
const DIFF_LABEL: Record<Difficulty, string> = {
  single: "Single (easy)", double: "Double (medium)", triple: "Triple (hard)", home_run: "Home Run (hardest)",
};

type Phase = "bid" | "question" | "answer";

const fmt = (n: number) => "$" + n.toLocaleString();

export default function BibleAuctionPage() {
  const { id } = useParams<{ id: string }>();
  const [teams, setTeams] = useState<Team[]>([]);
  const [cash, setCash] = useState<[number, number]>([STARTING_CASH, STARTING_CASH]);
  const [turn, setTurn] = useState<0 | 1>(0);
  const [phase, setPhase] = useState<Phase>("bid");
  const [bid, setBid] = useState<string>("");
  const [difficulty, setDifficulty] = useState<Difficulty>("single");
  const [current, setCurrent] = useState<Question | null>(null);
  const [used, setUsed] = useState<string[]>([]);
  const [showAnswer, setShowAnswer] = useState(false);
  const [rounds, setRounds] = useState<number>(0);
  const [gameOver, setGameOver] = useState<{ winnerIdx: number | null } | null>(null);
  const [saved, setSaved] = useState(false);
  const [history, setHistory] = useState<Array<{ team: string; bid: number; correct: boolean; question: string }>>([]);

  useEffect(() => {
    (async () => {
      const { data: t } = await supabase.from("teams").select("*").order("name");
      setTeams((t ?? []) as Team[]);
    })();
  }, []);

  const teamA = teams[0]; const teamB = teams[1];
  const currentTeam = turn === 0 ? teamA : teamB;
  const currentCash = cash[turn];

  const drawQuestion = async () => {
    const parsedBid = Math.floor(Number(bid));
    if (!bid || Number.isNaN(parsedBid) || parsedBid <= 0) { alert("Enter a bid amount"); return; }
    if (parsedBid > currentCash) { alert(`Max bid is ${fmt(currentCash)}`); return; }
    const { data } = await supabase
      .from("questions").select("*")
      .eq("difficulty", difficulty).eq("active", true)
      .limit(200);
    const pool = ((data ?? []) as Question[]).filter((q) => !used.includes(q.id));
    if (!pool.length) { alert("No more " + difficulty + " questions available. Pick another difficulty."); return; }
    const pick = pool[Math.floor(Math.random() * pool.length)];
    setCurrent(pick);
    setUsed((u) => [...u, pick.id]);
    setShowAnswer(false);
    setPhase("question");
  };

  const applyResult = (correct: boolean) => {
    if (!current) return;
    const parsedBid = Math.floor(Number(bid));
    setCash((c) => {
      const next: [number, number] = [...c] as [number, number];
      next[turn] += correct ? parsedBid : -parsedBid;
      if (next[turn] < 0) next[turn] = 0;
      return next;
    });
    setHistory((h) => [
      { team: currentTeam?.name ?? "", bid: parsedBid, correct, question: current.text },
      ...h,
    ].slice(0, 20));
    setRounds((r) => r + 1);
    setPhase("answer");
    setShowAnswer(true);
  };

  const nextTurn = () => {
    setPhase("bid");
    setBid("");
    setCurrent(null);
    setShowAnswer(false);
    setTurn((t) => (t === 0 ? 1 : 0));
  };

  const endGame = () => {
    const winnerIdx = cash[0] === cash[1] ? null : cash[0] > cash[1] ? 0 : 1;
    setGameOver({ winnerIdx });
  };

  const saveResults = async () => {
    if (!teamA || !teamB || saved) return;
    setSaved(true);
    // Convert cash to points: winner earns 1 point per round won, plus a bonus for finishing higher.
    // Simpler: award +1 to whichever team finished with more cash. Skip if tie.
    const winnerIdx = gameOver?.winnerIdx ?? (cash[0] === cash[1] ? null : cash[0] > cash[1] ? 0 : 1);
    if (winnerIdx !== null) {
      const winner = winnerIdx === 0 ? teamA : teamB;
      await supabase.from("score_events").insert({ team_id: winner.id, itinerary_id: id, points: 1, reason: "Bible Auction win" });
    }
    await supabase.from("game_results").insert({
      itinerary_id: id, game_type: "bible_auction",
      team_a_id: teamA.id, team_b_id: teamB.id,
      team_a_score: cash[0], team_b_score: cash[1],
      winner_team_id: winnerIdx === null ? null : (winnerIdx === 0 ? teamA.id : teamB.id),
      details: { rounds, starting_cash: STARTING_CASH },
    });
  };

  const reset = () => {
    setCash([STARTING_CASH, STARTING_CASH]); setTurn(0); setPhase("bid");
    setBid(""); setDifficulty("single"); setCurrent(null); setUsed([]);
    setShowAnswer(false); setRounds(0); setGameOver(null); setSaved(false); setHistory([]);
  };

  if (!teamA || !teamB) {
    return (
      <div className="card p-4">
        <h1>💰 Bible Auction</h1>
        <p className="mt-2 text-[#9fb0d3]">Need two teams to play. Set them up in Teams.</p>
        <Link href="/teams" className="btn btn-primary mt-3">Go to Teams</Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h1>💰 Bible Auction</h1>
        <Link href={`/itineraries/${id}/games`} className="btn btn-ghost">← All games</Link>
      </div>

      {/* Scoreboard */}
      <div className="grid grid-cols-2 gap-2">
        {[teamA, teamB].map((t, i) => (
          <div key={t.id} className={"card p-3 text-center " + (turn === i && !gameOver ? "border-blue-500" : "")}>
            <div className="text-xs text-[#9fb0d3]">{turn === i && !gameOver ? "Bidding now" : ""}</div>
            <div className="font-bold">{t.icon} {t.name}</div>
            <div className="text-3xl font-bold mt-1">{fmt(cash[i])}</div>
          </div>
        ))}
      </div>

      {gameOver ? (
        <div className="card p-6 text-center space-y-3">
          <div className="text-2xl">
            🎉 {gameOver.winnerIdx === null ? "It's a tie!" : `${(gameOver.winnerIdx === 0 ? teamA : teamB).name} wins!`}
          </div>
          <div className="text-sm text-[#9fb0d3]">
            Final: {teamA.name} {fmt(cash[0])} · {teamB.name} {fmt(cash[1])} · {rounds} round{rounds === 1 ? "" : "s"}
          </div>
          <div className="flex gap-2 justify-center">
            <button onClick={saveResults} disabled={saved} className="btn btn-primary btn-lg">{saved ? "Saved ✓" : "Save & Record"}</button>
            <button onClick={reset} className="btn btn-ghost btn-lg">Play Again</button>
          </div>
        </div>
      ) : (
        <div className="card p-4 space-y-3">
          {phase === "bid" && (
            <>
              <div className="text-center">
                <div className="text-sm text-[#9fb0d3]">{currentTeam?.name}'s turn</div>
                <div className="text-xs text-[#9fb0d3] mt-1">
                  Bank: <b>{fmt(currentCash)}</b> · Right answer doubles the bet · Wrong loses it
                </div>
              </div>
              <div>
                <label>Difficulty</label>
                <select value={difficulty} onChange={(e) => setDifficulty(e.target.value as Difficulty)}>
                  {DIFFS.map((d) => <option key={d} value={d}>{DIFF_LABEL[d]}</option>)}
                </select>
              </div>
              <div>
                <label>Bid amount</label>
                <input type="number" inputMode="numeric" min={1} max={currentCash} value={bid}
                  onChange={(e) => setBid(e.target.value)} placeholder={`1 to ${currentCash}`} />
              </div>
              <div className="grid grid-cols-4 gap-2">
                {[25, 50, 100, currentCash].map((n, i) => (
                  <button key={i} onClick={() => setBid(String(Math.min(n, currentCash)))} className="btn btn-ghost">
                    {n === currentCash ? "All in" : fmt(n)}
                  </button>
                ))}
              </div>
              <button onClick={drawQuestion} className="btn btn-primary btn-lg w-full">Lock Bid & Draw Question</button>
              <button onClick={endGame} className="btn btn-ghost w-full text-sm">End game now</button>
            </>
          )}

          {(phase === "question" || phase === "answer") && current && (
            <>
              <div className="flex items-center justify-between text-xs uppercase text-[#9fb0d3]">
                <span>{currentTeam?.name} · {DIFF_LABEL[current.difficulty]}</span>
                <span>Bid: <b className="text-white">{fmt(Math.floor(Number(bid)))}</b></span>
              </div>
              <div className="text-lg font-semibold">{current.text}</div>

              {current.format === "multiple_choice" && current.choices && (
                <div className="grid gap-1">
                  {current.choices.map((c, i) => <div key={i} className="p-2 rounded bg-[#0b1220] border border-[#1f2a44]">{c}</div>)}
                </div>
              )}

              {showAnswer && (
                <div className="p-3 rounded bg-[#0b1220] border border-yellow-600">
                  <div className="text-xs text-yellow-500 uppercase">Correct answer</div>
                  <div className="font-bold mt-1">{current.correct_answer}</div>
                </div>
              )}

              {phase === "question" ? (
                <>
                  {!showAnswer && (
                    <button onClick={() => setShowAnswer(true)} className="btn btn-ghost w-full">Peek at answer</button>
                  )}
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => applyResult(true)} className="btn btn-primary btn-lg">✅ Correct (+{fmt(Math.floor(Number(bid)))})</button>
                    <button onClick={() => applyResult(false)} className="btn btn-ghost btn-lg">❌ Wrong (−{fmt(Math.floor(Number(bid)))})</button>
                  </div>
                </>
              ) : (
                <button onClick={nextTurn} className="btn btn-primary btn-lg w-full">Next Team →</button>
              )}
            </>
          )}
        </div>
      )}

      {history.length > 0 && !gameOver && (
        <div className="card p-3">
          <div className="text-xs uppercase text-[#9fb0d3] mb-1">Recent rounds</div>
          <ol className="text-sm space-y-1">
            {history.slice(0, 5).map((h, i) => (
              <li key={i} className="flex justify-between gap-2">
                <span className="truncate">{h.team}: {h.question}</span>
                <span className={h.correct ? "text-green-400" : "text-red-400"}>
                  {h.correct ? "+" : "−"}{fmt(h.bid)}
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}

      <div className="text-xs text-[#9fb0d3] text-center">
        {rounds} round{rounds === 1 ? "" : "s"} played · {used.length} questions used
      </div>
    </div>
  );
}
