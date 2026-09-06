"use client";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Team } from "@/lib/types";
import { shuffle } from "@/lib/shuffle";
import {
  VERSE_HUNT_PROMPTS,
  VERSE_HUNT_WEIGHT,
  VERSE_HUNT_DIFF_LABEL,
  type VerseHuntPrompt,
  type VerseHuntDifficulty,
} from "@/lib/verseHunt";

// Verse Hunt — a twist on the Sword Drill.
// The leader reads a broad CATEGORY prompt. Teams search their Bibles together;
// the first person with a verse that fits stands and reads it. If the judge
// approves, that team scores (harder prompts score more). Every round is on a
// countdown — if it runs out, the round is a TIE and nobody scores, so a prompt
// that's too hard just ends fair.
//
// No question bank / no prep: prompts are the built-in pack in lib/verseHunt.ts.

const TIME_OPTIONS = [60, 90, 120] as const;
const DEFAULT_TIME = 90;

const DIFF_STYLE: Record<VerseHuntDifficulty, string> = {
  easy: "bg-green-900/40 text-green-300",
  medium: "bg-amber-900/40 text-amber-300",
  hard: "bg-red-900/40 text-red-300",
};

type Prompt = VerseHuntPrompt & { key: string };

// No-repeat shuffle bag: every prompt is used once (random order) before any
// repeat, and the same prompt won't straddle a reshuffle boundary.
type Bag = { draw: () => Prompt };
function makeBag(items: Prompt[]): Bag {
  let queue: Prompt[] = [];
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

type Screen = "loading" | "menu" | "teams" | "free" | "teams_done";
// outcome of a round: 0 -> Team A, 1 -> Team B, "tie" -> nobody
type Outcome = 0 | 1 | "tie" | null;

export default function VerseHuntGame({
  itineraryId,
  backHref,
  backLabel = "← All games",
}: {
  itineraryId: string | null;
  backHref: string;
  backLabel?: string;
}) {
  const [teams, setTeams] = useState<Team[]>([]);
  const [screen, setScreen] = useState<Screen>("loading");
  const [roundLen, setRoundLen] = useState<number>(DEFAULT_TIME);

  // The built-in pack, used as the offline fallback if the Supabase table is
  // empty or unreachable.
  const fallback = useMemo<Prompt[]>(
    () => VERSE_HUNT_PROMPTS.map((p, i) => ({ ...p, key: `local-${i}` })),
    []
  );
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const bag = useRef<Bag | null>(null);

  // Current round
  const [cur, setCur] = useState<Prompt | null>(null);
  const [roundNum, setRoundNum] = useState(0);
  const [timeLeft, setTimeLeft] = useState(DEFAULT_TIME);
  const [running, setRunning] = useState(false);
  const [outcome, setOutcome] = useState<Outcome>(null);
  const [showHint, setShowHint] = useState(false);

  // Teams scoring
  const [scores, setScores] = useState<[number, number]>([0, 0]);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    (async () => {
      const [{ data: t }, { data: rows }] = await Promise.all([
        supabase.from("teams").select("*").order("name"),
        supabase.from("verse_hunt_prompts").select("*").eq("active", true).limit(1000),
      ]);
      setTeams((t ?? []) as Team[]);

      // Load from Supabase when the table has rows; otherwise use the built-in pack.
      if (rows && rows.length > 0) {
        setPrompts(
          (rows as any[]).map((r) => ({
            key: r.id,
            text: r.text,
            difficulty: (r.difficulty as VerseHuntDifficulty) ?? "medium",
            hint: r.hint ?? "",
            books: r.books ?? "",
          }))
        );
      } else {
        setPrompts(fallback);
      }
      setScreen("menu");
    })();
  }, [fallback]);

  const teamA = teams[0];
  const teamB = teams[1];
  const hasTeams = !!(teamA && teamB);

  // ---- Timer ----------------------------------------------------------------
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setTimeLeft((t) => Math.max(0, t - 1)), 1000);
    return () => clearInterval(id);
  }, [running]);

  useEffect(() => {
    if (running && timeLeft === 0) endRound("tie");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, running]);

  // ---- Round flow -----------------------------------------------------------
  const deal = () => {
    if (!bag.current) bag.current = makeBag(prompts);
    setCur(bag.current.draw());
    setTimeLeft(roundLen);
    setRunning(false);
    setOutcome(null);
    setShowHint(false);
    setRoundNum((n) => n + 1);
  };

  const startTeams = () => {
    bag.current = makeBag(prompts);
    setScores([0, 0]);
    setSaved(false);
    setRoundNum(0);
    setScreen("teams");
    // deal first round after screen set
    setTimeout(deal, 0);
  };

  const startFree = () => {
    bag.current = makeBag(prompts);
    setRoundNum(0);
    setScreen("free");
    setTimeout(deal, 0);
  };

  const startTimer = () => {
    setTimeLeft(roundLen);
    setRunning(true);
  };

  const endRound = (result: Outcome) => {
    setRunning(false);
    setOutcome(result);
    if (screen === "teams" && cur && (result === 0 || result === 1)) {
      const pts = VERSE_HUNT_WEIGHT[cur.difficulty];
      setScores((s) => {
        const next: [number, number] = [...s] as [number, number];
        next[result] += pts;
        return next;
      });
    }
  };

  const saveResults = async () => {
    if (!teamA || !teamB || saved) return;
    setSaved(true);
    const points = scores;
    const winnerIdx = points[0] === points[1] ? null : points[0] > points[1] ? 0 : 1;
    for (let i = 0; i < 2; i++) {
      const team = i === 0 ? teamA : teamB;
      if (points[i] > 0) {
        await supabase.from("score_events").insert({ team_id: team.id, itinerary_id: itineraryId, points: points[i], reason: "Verse Hunt" });
        await supabase.from("teams").update({ total_score: team.total_score + points[i] }).eq("id", team.id);
      }
    }
    await supabase.from("game_results").insert({
      itinerary_id: itineraryId,
      game_type: "verse_hunt",
      team_a_id: teamA.id,
      team_b_id: teamB.id,
      team_a_score: points[0],
      team_b_score: points[1],
      winner_team_id: winnerIdx === null ? null : winnerIdx === 0 ? teamA.id : teamB.id,
      details: { rounds_played: roundNum },
    });
  };

  // ---------------------------------------------------------------------------
  const Header = (
    <div className="flex items-center justify-between gap-2">
      <h1>🔦 Verse Hunt</h1>
      <Link href={backHref} className="btn btn-ghost">{backLabel}</Link>
    </div>
  );

  const DiffPill = ({ d }: { d: VerseHuntDifficulty }) => (
    <span className={"text-[10px] uppercase tracking-wide px-2 py-0.5 rounded font-bold " + DIFF_STYLE[d]}>
      {VERSE_HUNT_DIFF_LABEL[d]}
    </span>
  );

  const timerColor =
    timeLeft <= 5 ? "text-red-400" : timeLeft <= 10 ? "text-amber-300" : "text-white";

  // Shared card that shows the prompt, timer, and hint.
  const PromptCard = ({ children }: { children: React.ReactNode }) =>
    cur ? (
      <div className="card p-4 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs uppercase text-[#9fb0d3]">Round {roundNum}</span>
          <div className="flex items-center gap-2">
            <DiffPill d={cur.difficulty} />
            <span className="text-[10px] text-[#9fb0d3]">
              worth {VERSE_HUNT_WEIGHT[cur.difficulty]} pt{VERSE_HUNT_WEIGHT[cur.difficulty] === 1 ? "" : "s"}
            </span>
          </div>
        </div>

        <div className="text-center text-2xl font-bold leading-snug py-2">"{cur.text}"</div>

        <div className={"text-center font-mono font-bold text-5xl tabular-nums " + timerColor}>
          {timeLeft}s
        </div>

        {cur.books && (
          <div className="rounded-lg bg-[#0f1830] border border-[#22304f] px-3 py-2 text-center">
            <div className="text-[10px] uppercase tracking-wide text-[#9fb0d3]">Stuck? Point them to a book</div>
            <div className="text-sm font-semibold text-blue-300 mt-0.5">📚 {cur.books}</div>
          </div>
        )}

        {showHint ? (
          <div className="text-center text-xs text-[#9fb0d3]">
            Judge's example: <b className="text-blue-300">{cur.hint}</b>
            <div className="mt-0.5">(kids can read <b>any</b> verse that fits)</div>
          </div>
        ) : (
          <div className="text-center">
            <button onClick={() => setShowHint(true)} className="text-xs text-[#9fb0d3] underline">
              Show judge's example
            </button>
          </div>
        )}

        {children}
      </div>
    ) : null;

  if (screen === "loading") {
    return (
      <div className="space-y-3">
        {Header}
        <p className="text-sm text-[#9fb0d3] text-center py-8">Loading prompts…</p>
      </div>
    );
  }

  // ---- Menu -----------------------------------------------------------------
  if (screen === "menu") {
    return (
      <div className="space-y-3">
        {Header}
        <p className="text-sm text-[#9fb0d3]">
          The leader reads a <b>category</b> out loud. Teams search their Bibles together — the first
          person with a verse that fits <b>stands up</b> and reads it. If the judge approves, that team
          scores. When the timer runs out, the round is a <b>tie</b> and nobody scores.
        </p>

        <div className="card p-4 space-y-2">
          <div className="text-xs uppercase text-[#9fb0d3]">Time per round</div>
          <div className="grid grid-cols-3 gap-2">
            {TIME_OPTIONS.map((t) => (
              <button
                key={t}
                onClick={() => setRoundLen(t)}
                className={
                  "btn " + (roundLen === t ? "btn-primary" : "btn-ghost")
                }
              >
                {t}s
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-2">
          <button
            onClick={startTeams}
            disabled={!hasTeams}
            className={"card p-4 text-left transition-colors " + (hasTeams ? "hover:border-blue-500" : "opacity-50 cursor-not-allowed")}
          >
            <div className="font-bold text-lg">⚔️ Teams</div>
            <div className="text-sm text-[#9fb0d3] mt-1">
              Your two teams race the same prompt. Tap the team that found it first — scores by
              difficulty (Easy 1, Medium 2, Hard 3).
            </div>
            {!hasTeams && <div className="text-[11px] text-amber-300 mt-2">Needs two teams — <Link href="/teams" className="underline">set up teams</Link> first.</div>}
          </button>

          <button onClick={startFree} className="card p-4 text-left hover:border-blue-500 transition-colors">
            <div className="font-bold text-lg">👥 Free Play</div>
            <div className="text-sm text-[#9fb0d3] mt-1">
              Just deals prompts with a timer — no scoring. Great for the whole group, or for three or
              more teams where you keep score on a whiteboard.
            </div>
          </button>
        </div>

        <p className="text-xs text-[#9fb0d3] text-center">{prompts.length} prompts loaded</p>
      </div>
    );
  }

  // ---- Teams ----------------------------------------------------------------
  if (screen === "teams") {
    const decided = outcome !== null;
    return (
      <div className="space-y-3">
        {Header}

        <div className="grid grid-cols-2 gap-2">
          {[teamA, teamB].map((t, i) => (
            <div key={t.id} className={"card p-3 text-center " + (outcome === i ? "ring-2 ring-green-400" : "")}>
              <div className="font-bold">{t.icon} {t.name}</div>
              <div className="text-3xl font-bold mt-1">{scores[i]}</div>
            </div>
          ))}
        </div>

        <PromptCard>
          {!running && !decided && (
            <button onClick={startTimer} className="btn btn-primary btn-lg w-full">
              ▶ Start Timer — read the prompt first
            </button>
          )}

          {running && (
            <div className="space-y-2">
              <div className="text-center text-xs text-[#9fb0d3]">Who stood up first with a verse the judge approves?</div>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => endRound(0)} className="btn btn-primary btn-lg">
                  {teamA.icon} {teamA.name} ✓
                </button>
                <button onClick={() => endRound(1)} className="btn btn-primary btn-lg">
                  {teamB.icon} {teamB.name} ✓
                </button>
              </div>
              <button onClick={() => endRound("tie")} className="btn btn-ghost w-full">
                No one got it — end round
              </button>
            </div>
          )}

          {decided && (
            <div className="space-y-3">
              <div className="text-center text-lg font-bold">
                {outcome === "tie"
                  ? "⏱ Tie — no one scored"
                  : `🎉 ${(outcome === 0 ? teamA : teamB).name} +${VERSE_HUNT_WEIGHT[cur!.difficulty]}`}
              </div>
              <button onClick={deal} className="btn btn-primary btn-lg w-full">Next Prompt →</button>
            </div>
          )}
        </PromptCard>

        <div className="text-center">
          <button onClick={() => setScreen("teams_done")} className="btn btn-ghost">Finish Game</button>
        </div>
      </div>
    );
  }

  // ---- Free Play ------------------------------------------------------------
  if (screen === "free") {
    const decided = outcome !== null;
    return (
      <div className="space-y-3">
        {Header}
        <PromptCard>
          {!running && !decided && (
            <button onClick={startTimer} className="btn btn-primary btn-lg w-full">▶ Start Timer</button>
          )}
          {running && (
            <button onClick={() => endRound("tie")} className="btn btn-ghost btn-lg w-full">Stop</button>
          )}
          {decided && (
            <button onClick={deal} className="btn btn-primary btn-lg w-full">Next Prompt →</button>
          )}
        </PromptCard>
        <div className="text-center">
          <button onClick={() => setScreen("menu")} className="btn btn-ghost">Change Mode</button>
        </div>
      </div>
    );
  }

  // ---- Teams done -----------------------------------------------------------
  if (screen === "teams_done") {
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
          <div className="text-2xl">🏁 Game over — {roundNum} round{roundNum === 1 ? "" : "s"}</div>
          <div className="text-lg">
            {scores[0] === scores[1] ? "It's a tie!" : `${(scores[0] > scores[1] ? teamA : teamB).name} wins!`}
          </div>
          <div className="flex gap-2 justify-center flex-wrap">
            <button onClick={saveResults} disabled={saved} className="btn btn-primary btn-lg">{saved ? "Saved ✓" : "Save & Record"}</button>
            <button onClick={startTeams} className="btn btn-ghost btn-lg">Play Again</button>
            <button onClick={() => setScreen("menu")} className="btn btn-ghost btn-lg">Change Mode</button>
            {itineraryId && <Link href={`/itineraries/${itineraryId}/summary`} className="btn btn-ghost btn-lg">To Summary</Link>}
          </div>
        </div>
      </div>
    );
  }

  return <div className="space-y-3">{Header}</div>;
}
