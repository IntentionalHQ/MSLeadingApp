"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Team, Question } from "@/lib/types";
import { shuffle } from "@/lib/shuffle";

// Each corner is one answer choice. Kids physically move to the corner they
// think is right, then the leader reveals. Built for a big group (40 kids) —
// everyone participates on every question.
const CORNERS = [
  { key: "A", label: "Top Left", color: "border-red-500", chip: "bg-red-600" },
  { key: "B", label: "Top Right", color: "border-blue-500", chip: "bg-blue-600" },
  { key: "C", label: "Bottom Left", color: "border-green-500", chip: "bg-green-600" },
  { key: "D", label: "Bottom Right", color: "border-yellow-500", chip: "bg-yellow-600" },
];

// Choices are stored like "B) A scarlet cord"; strip the "X) " label so we can
// match against correct_answer (which has no label).
function stripLabel(choice: string): string {
  return choice.replace(/^\s*[A-Da-d]\s*[).:-]\s*/, "").trim();
}

function correctIndex(q: Question): number {
  if (!q.choices) return -1;
  const target = q.correct_answer.trim().toLowerCase();
  let idx = q.choices.findIndex((c) => stripLabel(c).toLowerCase() === target);
  if (idx === -1) idx = q.choices.findIndex((c) => c.toLowerCase().includes(target));
  return idx;
}

export default function FourCornersGame({ itineraryId, backHref, backLabel = "← All games" }: { itineraryId: string | null; backHref: string; backLabel?: string }) {
  const [teams, setTeams] = useState<Team[]>([]);
  const [pool, setPool] = useState<Question[]>([]);
  const [used, setUsed] = useState<string[]>([]);
  const [current, setCurrent] = useState<Question | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [scores, setScores] = useState<[number, number]>([0, 0]);
  const [asked, setAsked] = useState(0);
  const [finished, setFinished] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    (async () => {
      const [{ data: t }, { data: q }] = await Promise.all([
        supabase.from("teams").select("*").order("name"),
        supabase.from("questions").select("*").eq("active", true).eq("format", "multiple_choice").limit(500),
      ]);
      setTeams((t ?? []) as Team[]);
      // Four Corners needs exactly four choices with a matchable answer.
      const usable = ((q ?? []) as Question[]).filter(
        (x) => Array.isArray(x.choices) && x.choices.length === 4 && correctIndex(x) !== -1
      );
      setPool(shuffle(usable));
    })();
  }, []);

  const teamA = teams[0]; const teamB = teams[1];

  const nextQuestion = () => {
    const remaining = pool.filter((p) => !used.includes(p.id));
    if (remaining.length === 0) { alert("No more questions in the bank."); return; }
    const pick = remaining[Math.floor(Math.random() * remaining.length)];
    setCurrent(pick);
    setUsed((u) => [...u, pick.id]);
    setRevealed(false);
    setAsked((n) => n + 1);
  };

  const award = (i: 0 | 1) => {
    setScores((s) => {
      const next: [number, number] = [...s] as [number, number];
      next[i] += 1;
      return next;
    });
  };

  const saveResults = async () => {
    if (!teamA || !teamB || saved) return;
    setSaved(true);
    const points = scores;
    const winnerIdx = points[0] === points[1] ? null : points[0] > points[1] ? 0 : 1;
    for (let i = 0; i < 2; i++) {
      const team = i === 0 ? teamA : teamB;
      if (points[i] > 0) {
        await supabase.from("score_events").insert({ team_id: team.id, itinerary_id: itineraryId, points: points[i], reason: "Four Corners" });
        await supabase.from("teams").update({ total_score: team.total_score + points[i] }).eq("id", team.id);
      }
    }
    await supabase.from("game_results").insert({
      itinerary_id: itineraryId, game_type: "four_corners",
      team_a_id: teamA.id, team_b_id: teamB.id,
      team_a_score: points[0], team_b_score: points[1],
      winner_team_id: winnerIdx === null ? null : (winnerIdx === 0 ? teamA.id : teamB.id),
      details: { questions_asked: asked },
    });
  };

  const reset = () => {
    setScores([0, 0]); setUsed([]); setCurrent(null); setRevealed(false);
    setAsked(0); setFinished(false); setSaved(false);
  };

  const hasTeams = !!(teamA && teamB);
  const answerIdx = current ? correctIndex(current) : -1;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h1>📍 Four Corners</h1>
        <Link href={backHref} className="btn btn-ghost">{backLabel}</Link>
      </div>

      {/* Optional team scoreboard — split the room into your two teams, or ignore it and just play. */}
      {hasTeams && (
        <div className="grid grid-cols-2 gap-2">
          {[teamA, teamB].map((t, i) => (
            <div key={t.id} className="card p-3 text-center">
              <div className="font-bold">{t.icon} {t.name}</div>
              <div className="text-3xl font-bold mt-1">{scores[i]}</div>
            </div>
          ))}
        </div>
      )}

      {finished ? (
        <div className="card p-6 text-center space-y-3">
          <div className="text-2xl">🏁 Game over — {asked} question{asked === 1 ? "" : "s"} played</div>
          {hasTeams && (
            <div className="text-lg">
              {scores[0] === scores[1] ? "It's a tie!" : `${(scores[0] > scores[1] ? teamA : teamB).name} wins!`}
            </div>
          )}
          <div className="flex gap-2 justify-center flex-wrap">
            {hasTeams && <button onClick={saveResults} disabled={saved} className="btn btn-primary btn-lg">{saved ? "Saved ✓" : "Save & Record"}</button>}
            <button onClick={reset} className="btn btn-ghost btn-lg">Play Again</button>
            {itineraryId && <Link href={`/itineraries/${itineraryId}/summary`} className="btn btn-ghost btn-lg">To Summary</Link>}
          </div>
        </div>
      ) : !current ? (
        <div className="card p-6 text-center space-y-3">
          <div className="text-sm text-[#9fb0d3]">
            Label the four corners of the room <b>A</b>, <b>B</b>, <b>C</b>, <b>D</b>. Read each
            question, kids run to the corner of their answer, then reveal. Great for a big group —
            everyone answers every time.
          </div>
          <button onClick={nextQuestion} className="btn btn-primary btn-lg">Start — First Question</button>
        </div>
      ) : (
        <div className="card p-4 space-y-3">
          <div className="text-xs uppercase text-[#9fb0d3]">Question {asked}</div>
          <div className="text-xl font-semibold text-center">{current.text}</div>

          <div className="grid grid-cols-2 gap-2">
            {current.choices!.map((choice, i) => {
              const c = CORNERS[i];
              const isAnswer = revealed && i === answerIdx;
              const dim = revealed && i !== answerIdx;
              return (
                <div
                  key={i}
                  className={
                    "rounded-lg border-2 p-3 min-h-[84px] flex flex-col justify-between transition-all " +
                    c.color +
                    (isAnswer ? " bg-green-900/40 ring-2 ring-green-400" : "") +
                    (dim ? " opacity-40" : "")
                  }
                >
                  <div className="flex items-center justify-between">
                    <span className={"text-xs font-bold text-white px-2 py-0.5 rounded " + c.chip}>{c.key}</span>
                    <span className="text-[10px] text-[#9fb0d3]">{c.label}</span>
                  </div>
                  <div className="font-semibold mt-1">{stripLabel(choice)}</div>
                  {isAnswer && <div className="text-[11px] text-green-400 mt-1">✅ Correct</div>}
                </div>
              );
            })}
          </div>

          {!revealed ? (
            <button onClick={() => setRevealed(true)} className="btn btn-primary btn-lg w-full">👁 Reveal Answer</button>
          ) : (
            <div className="space-y-2">
              {hasTeams && (
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => award(0)} className="btn btn-ghost">+1 {teamA.name}</button>
                  <button onClick={() => award(1)} className="btn btn-ghost">+1 {teamB.name}</button>
                </div>
              )}
              <button onClick={nextQuestion} className="btn btn-primary btn-lg w-full">Next Question →</button>
            </div>
          )}

          <div className="flex justify-between items-center pt-1">
            <span className="text-xs text-[#9fb0d3]">{used.length} of {pool.length} used</span>
            <button onClick={() => setFinished(true)} className="btn btn-ghost">Finish Game</button>
          </div>
        </div>
      )}

      {pool.length === 0 && (
        <p className="text-xs text-[#9fb0d3] text-center">Loading questions… (need 4-choice questions in the bank)</p>
      )}
    </div>
  );
}
