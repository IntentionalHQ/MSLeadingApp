"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { shuffle } from "@/lib/shuffle";
import {
  TRUE_FALSE_QUESTIONS,
  type TFQuestion,
  type TFDifficulty,
} from "@/lib/trueFalse";

// True or False Showdown — a last-student-standing elimination game.
// Label two sides of the room TRUE and FALSE. Read a statement; students move to
// the side they believe. Reveal the answer — everyone on the wrong side sits down
// and watches. Keep going until one student is left standing.
//
// The leader's phone reads out the statements, reveals answers, and (optionally)
// keeps the "still standing" count. Difficulty ramps up as the crowd thins.
// Questions come from a no-repeat shuffle bag per difficulty, so nothing repeats
// until that tier is exhausted.

const TIERS: TFDifficulty[] = ["easy", "medium", "hard"];
const DIFF_LABEL: Record<TFDifficulty, string> = { easy: "Easy", medium: "Medium", hard: "Hard" };
const DIFF_STYLE: Record<TFDifficulty, string> = {
  easy: "bg-green-900/40 text-green-300",
  medium: "bg-amber-900/40 text-amber-300",
  hard: "bg-red-900/40 text-red-300",
};

type Q = TFQuestion & { key: string };

// No-repeat shuffle bag: draws every item once (random order) before reshuffling.
type Bag = { draw: () => Q | null; size: number };
function makeBag(items: Q[]): Bag {
  let queue: Q[] = [];
  return {
    size: items.length,
    draw() {
      if (items.length === 0) return null;
      if (queue.length === 0) queue = shuffle(items);
      return queue.shift()!;
    },
  };
}

// Which difficulty to serve on a given round. When "ramp" is on, the game starts
// easy and gets harder as more rounds go by (and the crowd shrinks). Falls back
// to whatever tiers actually have questions.
function pickTier(round: number, ramp: boolean, avail: TFDifficulty[]): TFDifficulty {
  if (!ramp) return avail[Math.floor(Math.random() * avail.length)];
  let want: TFDifficulty;
  if (round <= 3) want = "easy";
  else if (round <= 9) want = "medium";
  else want = "hard";
  if (avail.includes(want)) return want;
  // Degrade gracefully toward whatever's left (prefer harder, then easier).
  const order: TFDifficulty[] = want === "easy" ? ["easy", "medium", "hard"] : want === "medium" ? ["medium", "hard", "easy"] : ["hard", "medium", "easy"];
  return order.find((t) => avail.includes(t)) ?? avail[0];
}

type Screen = "loading" | "menu" | "play" | "winner";

export default function TrueFalseShowdownGame({
  itineraryId,
  backHref,
  backLabel = "← All games",
}: {
  itineraryId: string | null;
  backHref: string;
  backLabel?: string;
}) {
  const [screen, setScreen] = useState<Screen>("loading");
  const [count, setCount] = useState(0);

  // Menu options
  const [startInput, setStartInput] = useState("");
  const [ramp, setRamp] = useState(true);

  // Play state
  const bags = useRef<Partial<Record<TFDifficulty, Bag>>>({});
  const availTiers = useRef<TFDifficulty[]>([]);
  const [round, setRound] = useState(0);
  const [tier, setTier] = useState<TFDifficulty>("easy");
  const [cur, setCur] = useState<Q | null>(null);
  const [revealed, setRevealed] = useState(false);

  // Optional "still standing" counter (0 = not tracking)
  const [tracking, setTracking] = useState(false);
  const [standing, setStanding] = useState(0);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: rows } = await supabase
        .from("tf_questions")
        .select("*")
        .eq("active", true)
        .limit(2000);

      let qs: Q[];
      if (rows && rows.length > 0) {
        qs = (rows as any[]).map((r) => ({
          key: r.id,
          statement: r.statement,
          answer: !!r.answer,
          difficulty: (r.difficulty as TFDifficulty) ?? "medium",
          testament: r.testament ?? null,
          reference: r.reference ?? "",
          explanation: r.explanation ?? "",
        }));
      } else {
        // Offline fallback: the built-in pack.
        qs = TRUE_FALSE_QUESTIONS.map((q, i) => ({ ...q, key: `local-${i}` }));
      }
      setCount(qs.length);

      const byTier: Record<TFDifficulty, Q[]> = { easy: [], medium: [], hard: [] };
      for (const q of qs) (byTier[q.difficulty] ?? byTier.medium).push(q);
      availTiers.current = TIERS.filter((t) => byTier[t].length > 0);
      bags.current = {};
      for (const t of availTiers.current) bags.current[t] = makeBag(byTier[t]);

      setScreen("menu");
    })();
  }, []);

  const start = () => {
    const n = parseInt(startInput, 10);
    const willTrack = Number.isFinite(n) && n >= 2;
    setTracking(willTrack);
    setStanding(willTrack ? n : 0);
    setRound(0);
    setSaved(false);
    setScreen("play");
    next(1);
  };

  const next = (roundNum?: number) => {
    const r = roundNum ?? round + 1;
    const t = pickTier(r, ramp, availTiers.current);
    let q = bags.current[t]?.draw() ?? null;
    // If that tier somehow ran dry, try any other tier.
    if (!q) {
      for (const alt of availTiers.current) {
        q = bags.current[alt]?.draw() ?? null;
        if (q) { setTier(alt); break; }
      }
    } else {
      setTier(t);
    }
    setCur(q);
    setRevealed(false);
    setRound(r);
  };

  const setStandingSafe = (n: number) => setStanding(Math.max(0, n));

  const declareWinner = () => {
    setScreen("winner");
    void saveResult();
  };

  const saveResult = async () => {
    if (saved) return;
    setSaved(true);
    try {
      await supabase.from("game_results").insert({
        itinerary_id: itineraryId,
        game_type: "true_false_showdown",
        team_a_score: 0,
        team_b_score: 0,
        details: {
          rounds_played: round,
          tracked: tracking,
          questions_available: count,
        },
      });
    } catch {
      // Recording is best-effort; the game already happened in the room.
    }
  };

  // ---------------------------------------------------------------------------
  const Header = (
    <div className="flex items-center justify-between gap-2">
      <h1>⚖️ True or False Showdown</h1>
      <Link href={backHref} className="btn btn-ghost">{backLabel}</Link>
    </div>
  );

  const DiffPill = ({ d }: { d: TFDifficulty }) => (
    <span className={"text-[10px] uppercase tracking-wide px-2 py-0.5 rounded font-bold " + DIFF_STYLE[d]}>{DIFF_LABEL[d]}</span>
  );

  if (screen === "loading") {
    return (
      <div className="space-y-3">
        {Header}
        <p className="text-sm text-[#9fb0d3] text-center py-8">Loading statements…</p>
      </div>
    );
  }

  // ---- Menu -----------------------------------------------------------------
  if (screen === "menu") {
    return (
      <div className="space-y-3">
        {Header}
        <div className="card p-4 space-y-2 text-sm text-[#9fb0d3]">
          <p>
            Pick two sides of the room: <b className="text-green-300">TRUE</b> on one side,
            <b className="text-red-300"> FALSE</b> on the other. Read each statement out loud —
            students run to the side they believe. Reveal the answer; everyone on the wrong side
            <b> sits down and watches</b>. Last student still standing wins.
          </p>
          <p className="text-xs">Statements get harder as the game goes on.</p>
        </div>

        <div className="card p-4 space-y-3">
          <div>
            <label className="text-xs uppercase text-[#9fb0d3]">Students playing (optional)</label>
            <input
              type="number"
              inputMode="numeric"
              min={2}
              value={startInput}
              onChange={(e) => setStartInput(e.target.value)}
              placeholder="e.g. 24 — leave blank to skip the counter"
              className="mt-1 w-full rounded-lg bg-[#0f1830] border border-[#22304f] px-3 py-2 text-white placeholder:text-[#5b6b8c]"
            />
            <p className="text-[11px] text-[#9fb0d3] mt-1">
              Enter a number and the app tracks how many are still standing. Leave blank to just
              call out statements and eyeball the room.
            </p>
          </div>

          <button
            onClick={() => setRamp((v) => !v)}
            className="flex items-center justify-between w-full rounded-lg bg-[#0f1830] border border-[#22304f] px-3 py-2"
          >
            <span className="text-sm">Ramp difficulty (easy → hard)</span>
            <span className={"text-xs font-bold px-2 py-0.5 rounded " + (ramp ? "bg-green-700 text-white" : "bg-[#1f2a44] text-[#9fb0d3]")}>{ramp ? "ON" : "OFF"}</span>
          </button>

          <button onClick={start} className="btn btn-primary btn-lg w-full">Start Showdown</button>
        </div>

        <p className="text-xs text-[#9fb0d3] text-center">{count} statements loaded</p>
      </div>
    );
  }

  // ---- Winner ---------------------------------------------------------------
  if (screen === "winner") {
    return (
      <div className="space-y-3">
        {Header}
        <div className="card p-6 text-center space-y-3">
          <div className="text-4xl">🏆</div>
          <div className="text-2xl font-bold">We have a winner!</div>
          <div className="text-lg text-[#9fb0d3]">Lasted {round} round{round === 1 ? "" : "s"}.</div>
          <div className="flex gap-2 justify-center flex-wrap pt-1">
            <button onClick={() => setScreen("menu")} className="btn btn-primary btn-lg">Play Again</button>
            {itineraryId && <Link href={`/itineraries/${itineraryId}/summary`} className="btn btn-ghost btn-lg">To Summary</Link>}
          </div>
        </div>
      </div>
    );
  }

  // ---- Play -----------------------------------------------------------------
  const answerIsTrue = cur?.answer === true;

  return (
    <div className="space-y-3">
      {Header}

      <div className="flex items-center justify-between text-sm">
        <span className="text-[#9fb0d3]">Round <b className="text-white">{round}</b></span>
        <div className="flex items-center gap-2">
          <DiffPill d={tier} />
          {tracking && (
            <span className="text-[#9fb0d3]">Standing: <b className="text-white">{standing}</b></span>
          )}
        </div>
      </div>

      {cur && (
        <div className="card p-4 space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            {cur.testament && <span className="text-[10px] uppercase text-[#9fb0d3]">{cur.testament === "OT" ? "Old Testament" : "New Testament"}</span>}
          </div>

          <div className="text-center text-xl font-semibold leading-snug">{cur.statement}</div>

          {/* The two sides of the room. */}
          <div className="grid grid-cols-2 gap-2">
            <div className={
              "rounded-lg border-2 p-4 text-center transition-all " +
              (revealed
                ? answerIsTrue
                  ? "border-green-500 bg-green-900/40 ring-2 ring-green-400"
                  : "border-[#22304f] opacity-40"
                : "border-green-700 bg-green-900/10")
            }>
              <div className="text-2xl">✅</div>
              <div className="font-bold text-green-300 mt-1">TRUE</div>
              {revealed && answerIsTrue && <div className="text-[11px] text-green-400 mt-1">Correct side</div>}
            </div>
            <div className={
              "rounded-lg border-2 p-4 text-center transition-all " +
              (revealed
                ? !answerIsTrue
                  ? "border-red-500 bg-red-900/40 ring-2 ring-red-400"
                  : "border-[#22304f] opacity-40"
                : "border-red-700 bg-red-900/10")
            }>
              <div className="text-2xl">❌</div>
              <div className="font-bold text-red-300 mt-1">FALSE</div>
              {revealed && !answerIsTrue && <div className="text-[11px] text-red-400 mt-1">Correct side</div>}
            </div>
          </div>

          {revealed && (
            <div className="rounded-lg bg-[#0f1830] border border-[#22304f] px-3 py-2 text-center space-y-1">
              <div className="text-sm">
                Answer: <b className={answerIsTrue ? "text-green-300" : "text-red-300"}>{answerIsTrue ? "TRUE" : "FALSE"}</b>
              </div>
              {cur.explanation && <div className="text-xs text-[#9fb0d3]">💡 {cur.explanation}</div>}
              {cur.reference && <div className="text-[11px] font-semibold text-blue-300">📖 {cur.reference}</div>}
            </div>
          )}

          {!revealed ? (
            <button onClick={() => setRevealed(true)} className="btn btn-primary btn-lg w-full">👁 Reveal Answer</button>
          ) : (
            <div className="space-y-3">
              {tracking && (
                <div className="rounded-lg bg-[#0f1830] border border-[#22304f] p-3 space-y-2">
                  <div className="text-xs text-[#9fb0d3] text-center">How many are still standing?</div>
                  <div className="flex items-center justify-center gap-2">
                    <button onClick={() => setStandingSafe(standing - 5)} className="btn btn-ghost">−5</button>
                    <button onClick={() => setStandingSafe(standing - 1)} className="btn btn-ghost">−1</button>
                    <input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      value={standing}
                      onChange={(e) => setStandingSafe(parseInt(e.target.value, 10) || 0)}
                      className="w-20 text-center rounded-lg bg-[#0b1220] border border-[#22304f] px-2 py-1 text-2xl font-bold text-white"
                    />
                    <button onClick={() => setStandingSafe(standing + 1)} className="btn btn-ghost">+1</button>
                  </div>
                </div>
              )}

              {tracking && standing <= 1 ? (
                <button onClick={declareWinner} className="btn btn-primary btn-lg w-full">🏆 We have a winner!</button>
              ) : (
                <button onClick={() => next()} className="btn btn-primary btn-lg w-full">Next Statement →</button>
              )}
            </div>
          )}
        </div>
      )}

      <div className="flex justify-between items-center pt-1">
        <span className="text-xs text-[#9fb0d3]">{count} statements</span>
        <button onClick={declareWinner} className="btn btn-ghost">Finish / Winner</button>
      </div>
    </div>
  );
}
