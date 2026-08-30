"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Team } from "@/lib/types";
import { shuffle } from "@/lib/shuffle";
import {
  GUESS_THE_FAKE_ROUNDS,
  type FakeRound,
  type FakeStatement,
  type Difficulty,
} from "@/lib/guessTheFake";

// Two truths and a lie — Bible edition.
// • Whole Group: play rounds one at a time, tap to reveal, keep a group tally.
// • Teams: alternates between two teams; each round pairs both teams on the SAME
//   difficulty so it's fair, and scores each correct answer.
// Questions are drawn from a no-repeat "shuffle bag": every question is used
// once before any repeats, and order within a pass is fully random.

const LETTERS = ["A", "B", "C"];
const TIERS: Difficulty[] = ["easy", "medium", "hard"];
const DIFF_LABEL: Record<Difficulty, string> = { easy: "Easy", medium: "Medium", hard: "Hard" };
const DIFF_STYLE: Record<Difficulty, string> = {
  easy: "bg-green-900/40 text-green-300",
  medium: "bg-amber-900/40 text-amber-300",
  hard: "bg-red-900/40 text-red-300",
};
// Harder questions are worth more in Teams mode.
const WEIGHT: Record<Difficulty, number> = { easy: 1, medium: 2, hard: 3 };

type Q = FakeRound & { key: string };

type Displayed = { q: Q; items: FakeStatement[]; fakeIdx: number };

// Shuffle the three statements so the fake lands anywhere, and remember where.
function present(q: Q): Displayed {
  const items = shuffle(q.statements.map((s) => ({ ...s })));
  return { q, items, fakeIdx: items.findIndex((s) => s.fake) };
}

// No-repeat shuffle bag: draws every item once (random order) before reshuffling,
// and won't repeat the very last item across a reshuffle boundary.
type Bag = { draw: () => Q };
function makeBag(items: Q[]): Bag {
  let queue: Q[] = [];
  let last: string | null = null;
  const refill = () => {
    queue = shuffle(items);
    if (last && queue.length > 1 && queue[0].key === last) {
      const j = 1 + Math.floor(Math.random() * (queue.length - 1));
      [queue[0], queue[j]] = [queue[j], queue[0]];
    }
  };
  return {
    draw() {
      if (queue.length === 0) refill();
      const item = queue.shift()!;
      last = item.key;
      return item;
    },
  };
}

type Screen = "loading" | "menu" | "group" | "team" | "group_done" | "team_done";

type TeamRound = {
  difficulty: Difficulty;
  byTeam: [Displayed, Displayed]; // byTeam[0] -> Team A, byTeam[1] -> Team B
  order: [0 | 1, 0 | 1]; // play order this round (lead alternates)
  step: 0 | 1; // which slot of `order` is currently up
  revealed: boolean;
  done?: boolean; // both teams have answered this round
};

export default function GuessTheFakeGame({
  itineraryId,
  backHref,
  backLabel = "← All games",
}: {
  itineraryId: string | null;
  backHref: string;
  backLabel?: string;
}) {
  const [teams, setTeams] = useState<Team[]>([]);
  const [allQ, setAllQ] = useState<Q[]>([]);
  const [screen, setScreen] = useState<Screen>("loading");

  // Group mode
  const groupBag = useRef<Bag | null>(null);
  const [gCur, setGCur] = useState<Displayed | null>(null);
  const [gRevealed, setGRevealed] = useState(false);
  const [gRound, setGRound] = useState(0);
  const [gRight, setGRight] = useState(0);
  const [gAnswered, setGAnswered] = useState(0);

  // Team mode
  const tierBags = useRef<Partial<Record<Difficulty, Bag>>>({});
  const availTiers = useRef<Difficulty[]>([]);
  const lead = useRef<0 | 1>(0);
  const [tRound, setTRound] = useState<TeamRound | null>(null);
  const [tRoundNum, setTRoundNum] = useState(0);
  const [scores, setScores] = useState<[number, number]>([0, 0]);
  const [answered, setAnswered] = useState<[number, number]>([0, 0]);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    (async () => {
      const [{ data: t }, { data: rows }] = await Promise.all([
        supabase.from("teams").select("*").order("name"),
        supabase.from("gtf_questions").select("*").eq("active", true).limit(1000),
      ]);
      setTeams((t ?? []) as Team[]);

      let qs: Q[];
      if (rows && rows.length > 0) {
        // From Supabase: rebuild statements + fake flag from the row columns.
        qs = (rows as any[]).map((r) => ({
          key: r.id,
          topic: r.topic,
          difficulty: (r.difficulty as Difficulty) ?? "medium",
          testament: r.testament ?? null,
          explanation: r.explanation ?? "",
          statements: [
            { text: r.statement_1, fake: r.fake_index === 1 },
            { text: r.statement_2, fake: r.fake_index === 2 },
            { text: r.statement_3, fake: r.fake_index === 3 },
          ],
        }));
      } else {
        // Offline fallback: the built-in pack.
        qs = GUESS_THE_FAKE_ROUNDS.map((r, i) => ({ ...r, key: `local-${i}` }));
      }
      setAllQ(qs);
      setScreen("menu");
    })();
  }, []);

  const teamA = teams[0];
  const teamB = teams[1];
  const hasTeams = !!(teamA && teamB);

  // ---- Whole Group ----------------------------------------------------------
  const startGroup = () => {
    groupBag.current = makeBag(allQ);
    setGRight(0);
    setGAnswered(0);
    setGRound(0);
    setScreen("group");
    nextGroup();
  };

  const nextGroup = () => {
    if (!groupBag.current) return;
    setGCur(present(groupBag.current.draw()));
    setGRevealed(false);
    setGRound((n) => n + 1);
  };

  const scoreGroup = (right: boolean) => {
    setGAnswered((n) => n + 1);
    if (right) setGRight((n) => n + 1);
    nextGroup();
  };

  // ---- Teams ----------------------------------------------------------------
  const startTeam = () => {
    const counts: Record<Difficulty, Q[]> = { easy: [], medium: [], hard: [] };
    for (const q of allQ) counts[q.difficulty]?.push(q);
    // A tier is usable only if it has at least 2 questions (one per team).
    availTiers.current = TIERS.filter((d) => counts[d].length >= 2);
    tierBags.current = {};
    for (const d of availTiers.current) tierBags.current[d] = makeBag(counts[d]);
    lead.current = 0;
    setScores([0, 0]);
    setAnswered([0, 0]);
    setTRoundNum(0);
    setSaved(false);
    setScreen("team");
    nextTeamRound();
  };

  const nextTeamRound = () => {
    const tiers = availTiers.current;
    if (tiers.length === 0) return;
    const difficulty = tiers[Math.floor(Math.random() * tiers.length)];
    const bag = tierBags.current[difficulty]!;
    const q1 = bag.draw();
    let q2 = bag.draw();
    if (q2.key === q1.key) q2 = bag.draw(); // safety; won't happen when tier >= 2
    const first = lead.current;
    setTRound({
      difficulty,
      byTeam: [present(q1), present(q2)],
      order: first === 0 ? [0, 1] : [1, 0],
      step: 0,
      revealed: false,
    });
    lead.current = first === 0 ? 1 : 0;
    setTRoundNum((n) => n + 1);
  };

  const revealTeam = () => setTRound((r) => (r ? { ...r, revealed: true } : r));

  const scoreTeam = (right: boolean) => {
    if (!tRound) return;
    const team = tRound.order[tRound.step];
    setAnswered((a) => {
      const next: [number, number] = [...a] as [number, number];
      next[team] += 1;
      return next;
    });
    if (right) {
      const pts = WEIGHT[tRound.difficulty];
      setScores((s) => {
        const next: [number, number] = [...s] as [number, number];
        next[team] += pts;
        return next;
      });
    }
    setTRound((r) => {
      if (!r) return r;
      if (r.step === 0) return { ...r, step: 1, revealed: false };
      // both teams have played this round
      return { ...r, step: 1, revealed: true, done: true };
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
        await supabase.from("score_events").insert({ team_id: team.id, itinerary_id: itineraryId, points: points[i], reason: "Guess the Fake" });
        await supabase.from("teams").update({ total_score: team.total_score + points[i] }).eq("id", team.id);
      }
    }
    await supabase.from("game_results").insert({
      itinerary_id: itineraryId,
      game_type: "guess_the_fake",
      team_a_id: teamA.id,
      team_b_id: teamB.id,
      team_a_score: points[0],
      team_b_score: points[1],
      winner_team_id: winnerIdx === null ? null : winnerIdx === 0 ? teamA.id : teamB.id,
      details: { rounds_played: tRoundNum, answered_a: answered[0], answered_b: answered[1] },
    });
  };

  // ---------------------------------------------------------------------------
  const Header = (
    <div className="flex items-center justify-between gap-2">
      <h1>🕵️ Guess the Fake</h1>
      <Link href={backHref} className="btn btn-ghost">{backLabel}</Link>
    </div>
  );

  const StatementList = ({ d, revealed }: { d: Displayed; revealed: boolean }) => (
    <div className="grid gap-2">
      {d.items.map((s, i) => {
        const isFake = revealed && i === d.fakeIdx;
        const isTrue = revealed && i !== d.fakeIdx;
        return (
          <div
            key={i}
            className={
              "rounded-lg border-2 p-3 flex items-start gap-3 transition-all " +
              (isFake ? "border-red-500 bg-red-900/40 ring-2 ring-red-400 " : "") +
              (isTrue ? "border-green-600 bg-green-900/20 " : "") +
              (!revealed ? "border-[#2a3a5c] " : "")
            }
          >
            <span className={"text-sm font-bold text-white px-2.5 py-1 rounded " + (isFake ? "bg-red-600" : isTrue ? "bg-green-700" : "bg-[#1f2a44]")}>{LETTERS[i]}</span>
            <div className="flex-1">
              <div className="font-semibold">{s.text}</div>
              {isFake && <div className="text-[11px] text-red-300 mt-1">❌ This one is FAKE</div>}
              {isTrue && <div className="text-[11px] text-green-400 mt-1">✅ True</div>}
            </div>
          </div>
        );
      })}
    </div>
  );

  const DiffPill = ({ d }: { d: Difficulty }) => (
    <span className={"text-[10px] uppercase tracking-wide px-2 py-0.5 rounded font-bold " + DIFF_STYLE[d]}>{DIFF_LABEL[d]}</span>
  );

  if (screen === "loading") {
    return (
      <div className="space-y-3">
        {Header}
        <p className="text-sm text-[#9fb0d3] text-center py-8">Loading questions…</p>
      </div>
    );
  }

  // ---- Menu -----------------------------------------------------------------
  if (screen === "menu") {
    return (
      <div className="space-y-3">
        {Header}
        <p className="text-sm text-[#9fb0d3]">
          Read the three statements out loud. Two are <b>true</b>, one is <b>fake</b>. Pick a mode:
        </p>
        <div className="grid gap-2">
          <button onClick={startGroup} className="card p-4 text-left hover:border-blue-500 transition-colors">
            <div className="font-bold text-lg">👥 Whole Group</div>
            <div className="text-sm text-[#9fb0d3] mt-1">
              Go through rounds one at a time — everyone guesses together. Optional right/wrong tally.
            </div>
          </button>
          <button
            onClick={startTeam}
            disabled={!hasTeams}
            className={"card p-4 text-left transition-colors " + (hasTeams ? "hover:border-blue-500" : "opacity-50 cursor-not-allowed")}
          >
            <div className="font-bold text-lg">⚔️ Teams</div>
            <div className="text-sm text-[#9fb0d3] mt-1">
              Two teams alternate. Each round both teams get the <b>same difficulty</b>. Correct answers score by difficulty — Easy 1, Medium 2, Hard 3.
            </div>
            {!hasTeams && <div className="text-[11px] text-amber-300 mt-2">Needs two teams — <Link href="/teams" className="underline">set up teams</Link> first.</div>}
          </button>
        </div>
        <p className="text-xs text-[#9fb0d3] text-center">{allQ.length} questions loaded</p>
      </div>
    );
  }

  // ---- Whole Group ----------------------------------------------------------
  if (screen === "group") {
    return (
      <div className="space-y-3">
        {Header}
        <div className="flex items-center justify-between text-sm">
          <span className="text-[#9fb0d3]">Round {gRound}</span>
          <span className="text-[#9fb0d3]">Correct: <b className="text-white">{gRight}</b> / {gAnswered}</span>
        </div>
        {gCur && (
          <div className="card p-4 space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase text-[#9fb0d3]">{gCur.q.topic}</span>
              <DiffPill d={gCur.q.difficulty} />
            </div>
            <div className="text-center text-sm text-[#9fb0d3]">Which statement is the fake?</div>
            <StatementList d={gCur} revealed={gRevealed} />
            {gRevealed && <div className="text-xs text-[#9fb0d3] text-center">💡 {gCur.q.explanation}</div>}

            {!gRevealed ? (
              <button onClick={() => setGRevealed(true)} className="btn btn-primary btn-lg w-full">👁 Reveal the Fake</button>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                <button onClick={() => scoreGroup(true)} className="btn btn-ghost">✓ Right</button>
                <button onClick={() => scoreGroup(false)} className="btn btn-ghost">✗ Wrong</button>
                <button onClick={nextGroup} className="btn btn-primary">Next →</button>
              </div>
            )}
          </div>
        )}
        <div className="text-center">
          <button onClick={() => setScreen("group_done")} className="btn btn-ghost">Finish</button>
        </div>
      </div>
    );
  }

  if (screen === "group_done") {
    return (
      <div className="space-y-3">
        {Header}
        <div className="card p-6 text-center space-y-3">
          <div className="text-2xl">🏁 Nice work!</div>
          <div className="text-lg">Group got <b>{gRight}</b> of {gAnswered} right{gAnswered > 0 ? ` (${Math.round((gRight / gAnswered) * 100)}%)` : ""}.</div>
          <div className="flex gap-2 justify-center flex-wrap">
            <button onClick={startGroup} className="btn btn-primary btn-lg">Play Again</button>
            <button onClick={() => setScreen("menu")} className="btn btn-ghost btn-lg">Change Mode</button>
          </div>
        </div>
      </div>
    );
  }

  // ---- Teams ----------------------------------------------------------------
  if (screen === "team" && tRound) {
    const roundDone = tRound.done === true;
    const currentTeamIdx = tRound.order[tRound.step];
    const currentTeam = currentTeamIdx === 0 ? teamA : teamB;
    const d = tRound.byTeam[currentTeamIdx];

    return (
      <div className="space-y-3">
        {Header}

        <div className="grid grid-cols-2 gap-2">
          {[teamA, teamB].map((t, i) => {
            const active = !roundDone && currentTeamIdx === i;
            return (
              <div key={t.id} className={"card p-3 text-center " + (active ? "ring-2 ring-blue-400" : "")}>
                <div className="font-bold">{t.icon} {t.name}</div>
                <div className="text-3xl font-bold mt-1">{scores[i]}</div>
                {active && <div className="text-[11px] text-blue-300 mt-1">Your turn</div>}
              </div>
            );
          })}
        </div>

        <div className="card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase text-[#9fb0d3]">Round {tRoundNum}</span>
            <div className="flex items-center gap-2">
              <DiffPill d={tRound.difficulty} />
              <span className="text-[10px] text-[#9fb0d3]">worth {WEIGHT[tRound.difficulty]} pt{WEIGHT[tRound.difficulty] === 1 ? "" : "s"}</span>
            </div>
          </div>

          {roundDone ? (
            <div className="text-center space-y-3 py-2">
              <div className="text-lg">Round {tRoundNum} complete</div>
              <button onClick={nextTeamRound} className="btn btn-primary btn-lg w-full">Next Round →</button>
            </div>
          ) : (
            <>
              <div className="text-center text-sm">
                <span className="font-bold text-white">{currentTeam.icon} {currentTeam.name}</span>
                <span className="text-[#9fb0d3]"> — which statement is the fake?</span>
              </div>
              <StatementList d={d} revealed={tRound.revealed} />
              {tRound.revealed && <div className="text-xs text-[#9fb0d3] text-center">💡 {d.q.explanation}</div>}

              {!tRound.revealed ? (
                <button onClick={revealTeam} className="btn btn-primary btn-lg w-full">👁 Reveal the Fake</button>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => scoreTeam(true)} className="btn btn-primary">✓ Correct (+{WEIGHT[tRound.difficulty]})</button>
                  <button onClick={() => scoreTeam(false)} className="btn btn-ghost">✗ Incorrect</button>
                </div>
              )}
            </>
          )}
        </div>

        <div className="text-center">
          <button onClick={() => setScreen("team_done")} className="btn btn-ghost">Finish Game</button>
        </div>
      </div>
    );
  }

  if (screen === "team_done") {
    return (
      <div className="space-y-3">
        {Header}
        <div className="grid grid-cols-2 gap-2">
          {[teamA, teamB].map((t, i) => (
            <div key={t.id} className="card p-3 text-center">
              <div className="font-bold">{t.icon} {t.name}</div>
              <div className="text-3xl font-bold mt-1">{scores[i]}</div>
            </div>
          ))}
        </div>
        <div className="card p-6 text-center space-y-3">
          <div className="text-2xl">🏁 Game over — {tRoundNum} round{tRoundNum === 1 ? "" : "s"}</div>
          <div className="text-lg">
            {scores[0] === scores[1] ? "It's a tie!" : `${(scores[0] > scores[1] ? teamA : teamB).name} wins!`}
          </div>
          <div className="flex gap-2 justify-center flex-wrap">
            <button onClick={saveResults} disabled={saved} className="btn btn-primary btn-lg">{saved ? "Saved ✓" : "Save & Record"}</button>
            <button onClick={startTeam} className="btn btn-ghost btn-lg">Play Again</button>
            <button onClick={() => setScreen("menu")} className="btn btn-ghost btn-lg">Change Mode</button>
            {itineraryId && <Link href={`/itineraries/${itineraryId}/summary`} className="btn btn-ghost btn-lg">To Summary</Link>}
          </div>
        </div>
      </div>
    );
  }

  return <div className="space-y-3">{Header}</div>;
}
