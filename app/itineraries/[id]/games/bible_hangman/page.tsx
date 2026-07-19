"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { Team, GamePrompt } from "@/lib/types";
import { shuffle } from "@/lib/shuffle";

const MAX_WRONG = 6;
const WIN_TARGET = 3;
const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

// Cross-drawing stages, one per wrong guess (0..MAX_WRONG). 0 = nothing drawn.
function CrossArt({ wrong }: { wrong: number }) {
  const show = (n: number) => wrong >= n;
  return (
    <svg viewBox="0 0 160 200" className="w-40 h-52 mx-auto">
      {/* ground */}
      {show(1) && <line x1="20" y1="185" x2="140" y2="185" stroke="#9fb0d3" strokeWidth="3" />}
      {/* base of cross */}
      {show(2) && <rect x="70" y="140" width="20" height="45" fill="#8b5a2b" />}
      {/* vertical beam */}
      {show(3) && <rect x="72" y="40" width="16" height="105" fill="#8b5a2b" />}
      {/* horizontal beam */}
      {show(4) && <rect x="35" y="70" width="90" height="14" fill="#8b5a2b" />}
      {/* INRI plaque */}
      {show(5) && <rect x="66" y="48" width="28" height="10" fill="#f5c542" stroke="#8b5a2b" />}
      {/* rays */}
      {show(6) && (
        <g stroke="#f5c542" strokeWidth="2">
          <line x1="80" y1="20" x2="80" y2="35" />
          <line x1="50" y1="30" x2="60" y2="42" />
          <line x1="110" y1="30" x2="100" y2="42" />
        </g>
      )}
    </svg>
  );
}

export default function BibleHangmanPage() {
  const { id } = useParams<{ id: string }>();
  const [teams, setTeams] = useState<Team[]>([]);
  const [pool, setPool] = useState<GamePrompt[]>([]);
  const [used, setUsed] = useState<string[]>([]);
  const [scores, setScores] = useState<[number, number]>([0, 0]);
  const [turn, setTurn] = useState<0 | 1>(0);
  const [current, setCurrent] = useState<GamePrompt | null>(null);
  const [guessed, setGuessed] = useState<string[]>([]);
  const [showHint, setShowHint] = useState(false);
  const [gameOver, setGameOver] = useState<{ winnerIdx: number | null } | null>(null);
  const [saved, setSaved] = useState(false);

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

  const teamA = teams[0]; const teamB = teams[1];
  const currentTeam = turn === 0 ? teamA : teamB;

  const drawPrompt = () => {
    const remaining = pool.filter((p) => !used.includes(p.id));
    if (remaining.length === 0) { alert("No more prompts. Add some in the Prompts admin."); return; }
    const pick = remaining[Math.floor(Math.random() * remaining.length)];
    setCurrent(pick);
    setUsed((u) => [...u, pick.id]);
    setGuessed([]);
    setShowHint(false);
  };

  const answerLetters = (current?.text.toUpperCase().replace(/[^A-Z]/g, "").split("") ?? []);
  const uniqueLetters = new Set(answerLetters);
  const wrong = guessed.filter((g) => !uniqueLetters.has(g)).length;
  const revealedAll = current ? Array.from(uniqueLetters).every((l) => guessed.includes(l)) : false;
  const lost = wrong >= MAX_WRONG;
  const roundDone = current && (revealedAll || lost);

  const guess = (letter: string) => {
    if (!current || roundDone || guessed.includes(letter)) return;
    setGuessed((g) => [...g, letter]);
  };

  const awardAndAdvance = (winner: 0 | 1 | null) => {
    if (winner !== null) {
      setScores((s) => {
        const next: [number, number] = [...s] as [number, number];
        next[winner] += 1;
        const winnerIdx = next[0] >= WIN_TARGET ? 0 : next[1] >= WIN_TARGET ? 1 : null;
        if (winnerIdx !== null) setGameOver({ winnerIdx });
        return next;
      });
    }
    setCurrent(null);
    setGuessed([]);
    setShowHint(false);
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
        await supabase.from("score_events").insert({ team_id: team.id, itinerary_id: id, points: points[i], reason: "Bible Hangman" });
      }
    }
    await supabase.from("game_results").insert({
      itinerary_id: id, game_type: "bible_hangman",
      team_a_id: teamA.id, team_b_id: teamB.id,
      team_a_score: points[0], team_b_score: points[1],
      winner_team_id: winnerIdx === null ? null : (winnerIdx === 0 ? teamA.id : teamB.id),
    });
  };

  const reset = () => {
    setScores([0, 0]); setTurn(0); setCurrent(null); setUsed([]);
    setGuessed([]); setShowHint(false); setGameOver(null); setSaved(false);
  };

  if (!teamA || !teamB) {
    return (
      <div className="card p-4">
        <h1>✝️ Bible Hangman</h1>
        <p className="mt-2 text-[#9fb0d3]">Need two teams to play. Set them up in Teams.</p>
        <Link href="/teams" className="btn btn-primary mt-3">Go to Teams</Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h1>✝️ Bible Hangman</h1>
        <Link href={`/itineraries/${id}/games`} className="btn btn-ghost">← All games</Link>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {[teamA, teamB].map((t, i) => (
          <div key={t.id} className={"card p-3 text-center " + (turn === i && !gameOver ? "border-blue-500" : "")}>
            <div className="text-xs text-[#9fb0d3]">{turn === i && !gameOver ? "Guessing now" : ""}</div>
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
          <div className="text-lg"><b>{currentTeam?.name}</b>'s turn</div>
          <div className="text-sm text-[#9fb0d3]">Solve within {MAX_WRONG} wrong letters. First to {WIN_TARGET} wins.</div>
          <button onClick={drawPrompt} className="btn btn-primary btn-lg">Draw a Word</button>
        </div>
      ) : (
        <div className="card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-xs uppercase text-[#9fb0d3]">
              {current.category} · {current.difficulty}{current.testament ? ` · ${current.testament}` : ""}
            </div>
            <div className="text-sm text-[#9fb0d3]">Wrong: {wrong} / {MAX_WRONG}</div>
          </div>

          <CrossArt wrong={wrong} />

          {/* Word display */}
          <div className="text-center text-2xl font-mono tracking-wider min-h-[2.5rem]">
            {current.text.split("").map((ch, idx) => {
              const up = ch.toUpperCase();
              if (!/[A-Z]/.test(up)) return <span key={idx} className="mx-1">{ch}</span>;
              const shown = guessed.includes(up) || roundDone;
              return (
                <span key={idx} className="inline-block mx-0.5 border-b-2 border-[#9fb0d3] px-2">
                  {shown ? up : " "}
                </span>
              );
            })}
          </div>

          {/* Hint */}
          <div className="text-center">
            {current.hint && !showHint && !roundDone && (
              <button onClick={() => setShowHint(true)} className="btn btn-ghost text-sm">Show hint</button>
            )}
            {showHint && current.hint && (
              <div className="text-sm text-[#9fb0d3] italic">Hint: {current.hint}</div>
            )}
          </div>

          {/* Letter grid */}
          {!roundDone && (
            <div className="grid grid-cols-9 gap-1">
              {ALPHABET.map((L) => {
                const isGuessed = guessed.includes(L);
                const isCorrect = isGuessed && uniqueLetters.has(L);
                return (
                  <button
                    key={L}
                    disabled={isGuessed}
                    onClick={() => guess(L)}
                    className={
                      "py-2 rounded text-sm font-bold " +
                      (isGuessed
                        ? isCorrect ? "bg-green-700 text-white" : "bg-red-800 text-white opacity-60"
                        : "bg-[#1f2a44] hover:bg-[#2a3654] text-white")
                    }
                  >
                    {L}
                  </button>
                );
              })}
            </div>
          )}

          {roundDone && (
            <div className="space-y-2">
              <div className="text-center text-lg">
                {revealedAll ? `✅ Solved: ${current.text}` : `❌ The answer was: ${current.text}`}
              </div>
              <div className="grid grid-cols-3 gap-2">
                <button onClick={() => awardAndAdvance(revealedAll ? turn : null)} className="btn btn-primary col-span-2">
                  {revealedAll ? `+1 to ${currentTeam?.name}` : "Next team's turn"}
                </button>
                <button onClick={() => awardAndAdvance(null)} className="btn btn-ghost">Skip point</button>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="text-xs text-[#9fb0d3] text-center">
        {used.length} of {pool.length} prompts used
      </div>
    </div>
  );
}
