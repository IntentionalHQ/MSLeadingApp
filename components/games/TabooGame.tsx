"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Team, GamePrompt } from "@/lib/types";
import { shuffle } from "@/lib/shuffle";

const ROUND_SECONDS = 60;
const WIN_TARGET = 8;

// Words too common to be worth banning when we auto-derive a Taboo card
// from the prompt text + hint (used only when banned_words isn't set).
const STOP = new Set([
  "the", "a", "an", "and", "or", "of", "to", "in", "on", "for", "with", "from",
  "by", "at", "is", "was", "were", "are", "be", "his", "her", "he", "she", "they",
  "them", "who", "what", "when", "into", "out", "up", "down", "over", "under",
  "that", "this", "it", "its", "as", "vs", "vs.", "not", "no", "yes", "you",
  "your", "my", "our", "we", "us", "one", "two", "three", "first", "last",
]);

// Turn a phrase into a de-duplicated list of "meaty" words worth banning.
function meatyWords(phrase: string | null | undefined): string[] {
  if (!phrase) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of phrase.split(/[^A-Za-z']+/)) {
    const w = raw.replace(/^'+|'+$/g, "");
    if (w.length < 3) continue;
    const key = w.toLowerCase();
    if (STOP.has(key) || seen.has(key)) continue;
    seen.add(key);
    out.push(w);
  }
  return out;
}

// Banned words for a card: use the seeded list if present, otherwise derive
// them from the answer itself plus the hint so the card is playable today.
function bannedFor(p: GamePrompt): string[] {
  if (p.banned_words && p.banned_words.length) return p.banned_words;
  const derived = [...meatyWords(p.text), ...meatyWords(p.hint)];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const w of derived) {
    const key = w.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(w);
  }
  return out.slice(0, 6);
}

export default function TabooGame({ itineraryId, backHref, backLabel = "← All games" }: { itineraryId: string | null; backHref: string; backLabel?: string }) {
  const [teams, setTeams] = useState<Team[]>([]);
  const [pool, setPool] = useState<GamePrompt[]>([]);
  const [used, setUsed] = useState<string[]>([]);
  const [scores, setScores] = useState<[number, number]>([0, 0]);
  const [turn, setTurn] = useState<0 | 1>(0);
  const [current, setCurrent] = useState<GamePrompt | null>(null);
  const [seconds, setSeconds] = useState<number>(ROUND_SECONDS);
  const [running, setRunning] = useState<boolean>(false);
  const [roundActive, setRoundActive] = useState<boolean>(false);
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
        if (s <= 1) return 0;
        return s - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [running]);

  // When the clock hits zero, close out the round.
  useEffect(() => {
    if (roundActive && seconds === 0) endRound();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seconds, roundActive]);

  const teamA = teams[0]; const teamB = teams[1];
  const currentTeam = turn === 0 ? teamA : teamB;

  const nextCard = () => {
    const remaining = pool.filter((p) => !used.includes(p.id));
    if (remaining.length === 0) {
      alert("No more cards. Add prompts in the Prompts admin, or Reset to reuse them.");
      endRound();
      return;
    }
    const pick = remaining[Math.floor(Math.random() * remaining.length)];
    setCurrent(pick);
    setUsed((u) => [...u, pick.id]);
  };

  const startRound = () => {
    setRoundActive(true);
    setRunning(true);
    setSeconds(ROUND_SECONDS);
    nextCard();
  };

  const gotIt = () => {
    setScores((s) => {
      const next: [number, number] = [...s] as [number, number];
      next[turn] += 1;
      const winnerIdx = next[0] >= WIN_TARGET ? 0 : next[1] >= WIN_TARGET ? 1 : null;
      if (winnerIdx !== null) { setGameOver({ winnerIdx }); setRunning(false); setRoundActive(false); setCurrent(null); }
      return next;
    });
    if (!gameOver) nextCard();
  };

  const pass = () => nextCard();

  const endRound = () => {
    setRunning(false);
    setRoundActive(false);
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
        await supabase.from("score_events").insert({ team_id: team.id, itinerary_id: itineraryId, points: points[i], reason: "Bible Taboo" });
        await supabase.from("teams").update({ total_score: team.total_score + points[i] }).eq("id", team.id);
      }
    }
    await supabase.from("game_results").insert({
      itinerary_id: itineraryId, game_type: "bible_taboo",
      team_a_id: teamA.id, team_b_id: teamB.id,
      team_a_score: points[0], team_b_score: points[1],
      winner_team_id: winnerIdx === null ? null : (winnerIdx === 0 ? teamA.id : teamB.id),
    });
  };

  const reset = () => {
    setScores([0, 0]); setTurn(0); setCurrent(null); setUsed([]);
    setSeconds(ROUND_SECONDS); setRunning(false); setRoundActive(false); setGameOver(null); setSaved(false);
  };

  const fmt = (n: number) => `${Math.floor(n / 60)}:${String(n % 60).padStart(2, "0")}`;

  if (!teamA || !teamB) {
    return (
      <div className="card p-4">
        <h1>🚫 Bible Taboo</h1>
        <p className="mt-2 text-[#9fb0d3]">Need two teams to play. Set them up in Teams.</p>
        <Link href="/teams" className="btn btn-primary mt-3">Go to Teams</Link>
      </div>
    );
  }

  const banned = current ? bannedFor(current) : [];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h1>🚫 Bible Taboo</h1>
        <Link href={backHref} className="btn btn-ghost">{backLabel}</Link>
      </div>

      {/* Scoreboard */}
      <div className="grid grid-cols-2 gap-2">
        {[teamA, teamB].map((t, i) => (
          <div key={t.id} className={"card p-3 text-center " + (turn === i && !gameOver ? "ring-2 ring-yellow-400" : "")}>
            <div className="text-xs text-[#9fb0d3]">{turn === i && !gameOver ? "Describing now" : ""}</div>
            <div className="font-bold">{t.icon} {t.name}</div>
            <div className="text-3xl font-bold mt-1">{scores[i]}</div>
          </div>
        ))}
      </div>

      {gameOver ? (
        <div className="card p-6 text-center space-y-3">
          <div className="text-2xl">🎉 {gameOver.winnerIdx === null ? "It's a tie!" : `${(gameOver.winnerIdx === 0 ? teamA : teamB).name} wins!`}</div>
          <div className="flex gap-2 justify-center flex-wrap">
            <button onClick={saveResults} disabled={saved} className="btn btn-primary btn-lg">{saved ? "Saved ✓" : "Save & Record"}</button>
            <button onClick={reset} className="btn btn-ghost btn-lg">Play Again</button>
            {itineraryId && <Link href={`/itineraries/${itineraryId}/summary`} className="btn btn-ghost btn-lg">To Summary</Link>}
          </div>
        </div>
      ) : !roundActive ? (
        <div className="card p-6 text-center space-y-3">
          <div className="text-lg"><b>{currentTeam?.name}</b>'s turn to describe</div>
          <div className="text-sm text-[#9fb0d3]">
            One player describes each answer to their team without saying the word or any
            banned words. {ROUND_SECONDS}s per round — score as many as you can. First to {WIN_TARGET} wins.
          </div>
          <button onClick={startRound} className="btn btn-primary btn-lg">▶ Start Round</button>
        </div>
      ) : (
        <div className="card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-xs uppercase text-[#9fb0d3]">
              {current?.category}{current?.testament ? ` · ${current.testament}` : ""} · {current?.difficulty}
            </div>
            <div className="font-mono text-2xl">{fmt(seconds)}</div>
          </div>

          <div className="p-5 rounded bg-[#0b1220] border border-yellow-600 text-center">
            <div className="text-[11px] uppercase tracking-wide text-yellow-500">Describe this</div>
            <div className="text-3xl font-bold mt-1">{current?.text}</div>
          </div>

          <div className="rounded bg-[#160b0b] border border-red-700 p-3">
            <div className="text-[11px] uppercase tracking-wide text-red-400 mb-1">🚫 Don't say</div>
            {banned.length ? (
              <div className="flex flex-wrap gap-2 justify-center">
                {banned.map((w) => (
                  <span key={w} className="px-2 py-1 rounded bg-red-900/40 border border-red-700 text-sm font-semibold">{w}</span>
                ))}
              </div>
            ) : (
              <div className="text-sm text-[#9fb0d3] text-center">Just don't say the answer itself.</div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button onClick={gotIt} className="btn btn-primary btn-lg">✅ Got it (+1)</button>
            <button onClick={pass} className="btn btn-ghost btn-lg">⏭ Pass</button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {running ? (
              <button onClick={() => setRunning(false)} className="btn btn-ghost">⏸ Pause</button>
            ) : (
              <button onClick={() => setRunning(true)} className="btn btn-ghost">▶ Resume</button>
            )}
            <button onClick={endRound} className="btn btn-danger">⏹ End Round</button>
          </div>
        </div>
      )}

      <div className="text-xs text-[#9fb0d3] text-center">
        {used.length} of {pool.length} cards used
      </div>
    </div>
  );
}
