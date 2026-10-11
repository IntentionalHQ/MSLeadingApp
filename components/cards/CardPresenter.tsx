"use client";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { CueBullet, CueCard, CueDeck } from "@/lib/types";
import CueBulletView from "./CueBulletView";
import CardQuickEdit, { type CardQuickPatch } from "./CardQuickEdit";
import { colorSolid, filledBullets } from "@/lib/cueCards";

export type PresenterMode = "cards" | "outline";

const RESUME_WINDOW_MS = 2 * 60 * 60 * 1000; // reopen within this and you're back on the card you left

// Full-screen cue card deck in two modes:
//  - cards: one card per screen, swipe up for the next card and down for the
//    previous. Native CSS scroll-snap drives the motion (the compositor, not
//    JS), `snap-always` makes a hard flick land on exactly one card, pan-y +
//    overscroll-contain stop horizontal swipes and pull-to-refresh.
//  - outline: the whole deck in one plain scroll, for reading it through
//    before speaking. Same cards, no snapping, no key stepping.
// The clock is its own component so a ticking timer never re-renders the deck.
export default function CardPresenter({
  deck, cards, backHref, since, goalMinutes, initialMode = "cards", rehearse = false, onSaveCard,
}: {
  deck: CueDeck;
  cards: CueCard[];
  backHref: string;
  since: number | null;         // epoch ms the section started (from Lead mode), null = start now
  goalMinutes: number | null;   // the countdown clock's target; null = no countdown
  initialMode?: PresenterMode;
  rehearse?: boolean;           // dry run: an Edit pill on every card; editing pauses the clock
  onSaveCard?: (cardId: string, patch: CardQuickPatch) => Promise<void>;
}) {
  const router = useRouter();
  const scroller = useRef<HTMLDivElement | null>(null);
  const [mode, setMode] = useState<PresenterMode>(initialMode);
  const [editing, setEditing] = useState<string | null>(null); // dry run: card id open in the quick editor
  const editingRef = useRef<string | null>(null);
  editingRef.current = editing;
  const [idx, setIdx] = useState(0);
  const idxRef = useRef(0);
  const storageKey = `cue:${deck.id}:idx`;
  const n = cards.length;

  const goTo = (i: number, smooth = true) => {
    const el = scroller.current;
    if (!el) return;
    const k = Math.max(0, Math.min(n - 1, i));
    el.scrollTo({ top: k * el.clientHeight, behavior: smooth ? "smooth" : "auto" });
  };

  // Entering card mode (on load, or back from the outline) lands on the card
  // you were on: this session's last position, else where the outline left you.
  useEffect(() => {
    if (mode !== "cards" || n === 0) return;
    let start = idxRef.current;
    if (start === 0) {
      // Resume only within two hours (stepping out mid-message), otherwise
      // a fresh Present always starts at card 1.
      try {
        const saved = JSON.parse(sessionStorage.getItem(storageKey) ?? "null") as { i: number; at: number } | null;
        if (saved && Date.now() - saved.at < RESUME_WINDOW_MS) start = saved.i || 0;
      } catch {}
    }
    if (start > 0 && start < n) goTo(start, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, deck.id, n]);

  // Which card is on screen: IntersectionObserver, never a scroll listener.
  // Runs in both modes so switching back to cards keeps your place.
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        const i = Number((e.target as HTMLElement).dataset.idx);
        if (!Number.isNaN(i) && i !== idxRef.current) {
          idxRef.current = i;
          setIdx(i);
          try { sessionStorage.setItem(storageKey, JSON.stringify({ i, at: Date.now() })); } catch {}
        }
      }
    }, { root: el, threshold: 0.6 });
    el.querySelectorAll("[data-idx]").forEach((c) => io.observe(c));
    return () => io.disconnect();
  }, [cards, storageKey, mode]);

  // Desktop: arrow / space / page keys step one card; Escape leaves.
  // Mouse wheel: one card per flick instead of a free scroll that then snaps.
  // In outline mode the scroll is a plain scroll; only Escape applies.
  useEffect(() => {
    const stepping = mode === "cards";
    const onKey = (e: KeyboardEvent) => {
      // While the quick editor is open, keys belong to it (Escape just closes it).
      if (editingRef.current) { if (e.key === "Escape") setEditing(null); return; }
      if (e.key === "Escape") { router.push(backHref); return; }
      if (!stepping) return;
      if (["ArrowDown", "ArrowRight", "PageDown", " "].includes(e.key)) { e.preventDefault(); goTo(idxRef.current + 1); }
      else if (["ArrowUp", "ArrowLeft", "PageUp"].includes(e.key)) { e.preventDefault(); goTo(idxRef.current - 1); }
    };
    let wheelLock = 0;
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) < 8) return;
      // Over a bullet list that can still scroll that way, let the list scroll;
      // only step cards once it's at its end (or the wheel is elsewhere).
      const list = (e.target as HTMLElement | null)?.closest?.("ul");
      if (list && list.scrollHeight > list.clientHeight) {
        const canScroll = e.deltaY > 0
          ? list.scrollTop + list.clientHeight < list.scrollHeight - 1
          : list.scrollTop > 0;
        if (canScroll) return;
      }
      e.preventDefault();
      const now = Date.now();
      if (now - wheelLock < 450) return;
      wheelLock = now;
      goTo(idxRef.current + (e.deltaY > 0 ? 1 : -1));
    };
    const el = scroller.current;
    window.addEventListener("keydown", onKey);
    if (stepping) el?.addEventListener("wheel", onWheel, { passive: false });
    return () => { window.removeEventListener("keydown", onKey); el?.removeEventListener("wheel", onWheel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [backHref, n, mode]);

  // Keep the screen awake and the page behind from scrolling.
  useEffect(() => {
    let lock: any = null;
    const grab = async () => { try { lock = await (navigator as any).wakeLock?.request("screen"); } catch {} };
    grab();
    const onVis = () => { if (document.visibilityState === "visible") grab(); };
    document.addEventListener("visibilitychange", onVis);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { lock?.release?.(); document.removeEventListener("visibilitychange", onVis); document.body.style.overflow = prev; };
  }, []);

  const outline = mode === "outline";

  return (
    <div className="fixed inset-0 z-50 bg-[#0b1220] text-[#e6ecf5]" style={{ height: "100dvh" }}>
      <div
        ref={scroller}
        className={"h-full w-full overflow-y-auto overscroll-y-contain " + (outline ? "" : "snap-y snap-mandatory")}
        style={{ touchAction: "pan-y", scrollbarWidth: "none", WebkitOverflowScrolling: "touch" } as React.CSSProperties}
      >
        {n === 0 && (
          <section className="flex flex-col items-center justify-center px-6 text-center" style={{ height: "100dvh" }}>
            <div className="text-xl font-bold">This deck has no cards yet.</div>
            <div className="mt-2 text-sm text-[#9fb0d3]">Add cards on the Cards tab, then present.</div>
          </section>
        )}

        {outline && n > 0 && (
          <header className="mx-auto w-full max-w-2xl px-5 pt-16 pb-4 border-b border-[#1f2a44]">
            <div className="text-xs font-semibold uppercase tracking-widest text-[#9fb0d3]">Outline · {n} card{n === 1 ? "" : "s"}</div>
            <h1 className="mt-1 text-2xl font-bold leading-tight">{deck.title}</h1>
            {(deck.passage || deck.subtitle) && (
              <div className="mt-1 text-sm text-[#9fb0d3]">{[deck.passage, deck.subtitle].filter(Boolean).join(" · ")}</div>
            )}
          </header>
        )}

        {cards.map((c, i) => {
          const last = i === n - 1;
          const next = last ? null : cards[i + 1];
          return (
            <section
              key={c.id}
              data-idx={i}
              className={
                "flex flex-col mx-auto w-full max-w-2xl px-5 " +
                (outline ? "py-6 border-b border-[#1f2a44] last:border-b-0" : "snap-start snap-always pt-16 pb-8")
              }
              style={outline
                ? (colorSolid(c.color) ? { borderLeft: `4px solid ${colorSolid(c.color)}`, paddingLeft: "1rem" } : undefined)
                : { height: "100dvh" }}
            >
              {/* Dry run: open this card in the quick editor; the clock pauses while it's open. */}
              {rehearse && !outline && onSaveCard && (
                <div className="mb-2 flex justify-end">
                  <button type="button" onClick={() => setEditing(c.id)} className="btn btn-ghost !min-h-0 !px-3 !py-1 text-xs">✎ Edit this card</button>
                </div>
              )}
              {/* Section colour: a short bar above the card, so cards of one part of the message match. */}
              {!outline && colorSolid(c.color) && (
                <div className="mb-2 h-1 w-12 rounded-full" style={{ background: colorSolid(c.color)! }} aria-hidden />
              )}
              <div className="text-xs font-semibold uppercase tracking-widest text-[#9fb0d3]">
                {outline && <span className="mr-2 text-[#e6ecf5]">{i + 1}/{n}</span>}
                {c.scripture_ref || deck.passage}
              </div>
              <h2 className="mt-1 font-bold leading-tight" style={{ fontSize: outline ? "22px" : "clamp(22px, 6vw, 34px)" }}>{c.title || "Untitled card"}</h2>

              {/* Card mode: bullets are the flexible middle and only scroll if a card is too long. */}
              {outline ? (
                <ul className="mt-4 space-y-1.5">
                  {filledBullets(c.bullets).map((b) => <CueBulletView key={b.id} bullet={b} size="md" />)}
                </ul>
              ) : (
                <ScrollableBullets bullets={filledBullets(c.bullets)} />
              )}

              {/* The three closing blocks are colour-coded so the eye finds them at a glance:
                  blue = last point (the last thing to say on this card), purple = transition (walk into the next card),
                  green = up next (where you're walking to; read live from the deck order). */}
              {c.key_line && (
                <div className="mt-3 border-l-4 border-blue-500 pl-3">
                  <div className="text-[10px] font-semibold uppercase tracking-widest text-blue-400">Last point</div>
                  <div className="italic leading-snug" style={{ fontSize: outline ? "17px" : "clamp(17px, 4.6vw, 23px)" }}>&ldquo;{c.key_line}&rdquo;</div>
                </div>
              )}
              {c.transition && (
                <div className="mt-3 border-l-4 border-purple-500 pl-3">
                  <div className="text-[10px] font-semibold uppercase tracking-widest text-purple-400">{last ? "Close" : "Transition"}</div>
                  <div className="leading-snug text-[#e6ecf5]" style={{ fontSize: outline ? "16px" : "clamp(16px, 4.3vw, 20px)" }}>{c.transition}</div>
                </div>
              )}
              {!outline && (
                <div className="mt-3 border-l-4 border-green-500 pl-3">
                  <div className="text-[10px] font-semibold uppercase tracking-widest text-green-400">{next ? "Up next" : "End"}</div>
                  {next && (
                    <div className="font-semibold leading-snug text-[#e6ecf5]" style={{ fontSize: "clamp(15px, 4vw, 19px)" }}>{next.title || "Untitled card"}</div>
                  )}
                </div>
              )}
            </section>
          );
        })}
      </div>

      {/* Chrome: thin progress line, exit, mode toggle, "Card 2 of 4", clock. */}
      <div className="pointer-events-none absolute inset-x-0 top-0">
        <div className="h-0.5 bg-[#1f2a44]">{!outline && <div className="h-0.5 bg-blue-500" style={{ width: `${n ? ((idx + 1) / n) * 100 : 0}%` }} />}</div>
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-2 px-3 pt-2 text-sm">
          <div className="flex items-center gap-1.5">
            <button type="button" onClick={() => router.push(backHref)} className="pointer-events-auto btn btn-ghost !min-h-0 !px-3 !py-1.5 text-sm" aria-label="Exit presentation">✕</button>
            <button
              type="button"
              onClick={() => setMode(outline ? "cards" : "outline")}
              className="pointer-events-auto btn btn-ghost !min-h-0 !px-3 !py-1.5 text-sm"
              aria-pressed={outline}
              title={outline ? "Back to one card at a time" : "Read the whole deck as one outline"}
            >
              {outline ? "🃏 Cards" : "☰ Outline"}
            </button>
          </div>
          <div className="font-mono tabular-nums text-[#9fb0d3] truncate">
            {rehearse && <span className="mr-1.5 rounded bg-amber-900/50 px-1 text-[10px] font-semibold uppercase tracking-widest text-amber-300">Dry run</span>}
            {n ? (outline ? "Outline" : `Card ${idx + 1} of ${n}`) : ""}
          </div>
          <Clocks since={since} goalMinutes={goalMinutes} paused={editing !== null} />
        </div>
      </div>

      {/* Dry run quick editor, over everything; the clock is paused while it's open. */}
      {editing && onSaveCard && (() => {
        const i = cards.findIndex((c) => c.id === editing);
        const card = cards[i];
        if (!card) return null;
        return (
          <CardQuickEdit
            key={card.id}
            card={card}
            index={i}
            total={n}
            onSave={async (patch) => { await onSaveCard(card.id, patch); setEditing(null); }}
            onCancel={() => setEditing(null)}
          />
        );
      })()}
    </div>
  );
}

// Card mode's bullet area: the flexible middle of the card, scrolling on its
// own only when there is more than fits. While there is more below, a fade
// and a "⌄ more" chip say so; both go once you reach the end.
function ScrollableBullets({ bullets }: { bullets: CueBullet[] }) {
  const ref = useRef<HTMLUListElement | null>(null);
  const [more, setMore] = useState(false);
  const check = () => {
    const el = ref.current;
    if (el) setMore(el.scrollHeight - el.clientHeight - el.scrollTop > 8);
  };
  // Size changes (rotation, fonts loading, a resize) re-check; scrolling
  // re-checks through React's onScroll below.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bullets.length]);
  return (
    <div className="relative mt-4 min-h-0 flex-1 flex flex-col">
      <ul ref={ref} onScroll={check} className="min-h-0 flex-1 space-y-1.5 overflow-y-auto overscroll-y-contain" style={{ scrollbarWidth: "none" }}>
        {bullets.map((b) => <CueBulletView key={b.id} bullet={b} size="lg" />)}
      </ul>
      {more && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center pt-10 pb-1" style={{ background: "linear-gradient(to bottom, rgba(11,18,32,0), #0b1220 70%)" }} aria-hidden>
          <span className="rounded-full bg-[#1f2a44] px-2.5 py-0.5 text-xs font-semibold text-[#9fb0d3]">⌄ more</span>
        </div>
      )}
    </div>
  );
}

const fmt = (secs: number) => `${String(Math.floor(secs / 60)).padStart(2, "0")}:${String(secs % 60).padStart(2, "0")}`;

// Own component so the 1s tick only re-renders these spans, never the deck.
// Left: elapsed, always muted. Right (when there's a goal): counting down,
// green at the start, sliding through yellow to orange-red over the last
// 10%, then solid bold red once you're over.
function Clocks({ since, goalMinutes, paused = false }: { since: number | null; goalMinutes: number | null; paused?: boolean }) {
  const startRef = useRef<number>(since ?? Date.now());
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  // Paused time (the dry run's quick editor) never counts against the clocks.
  const pausedAtRef = useRef<number | null>(null);
  const pausedTotalRef = useRef(0);
  useEffect(() => {
    if (paused) pausedAtRef.current = Date.now();
    else if (pausedAtRef.current != null) { pausedTotalRef.current += Date.now() - pausedAtRef.current; pausedAtRef.current = null; }
  }, [paused]);
  const pausedNow = pausedAtRef.current != null ? now - pausedAtRef.current : 0;
  const elapsed = Math.max(0, Math.floor((now - startRef.current - pausedTotalRef.current - pausedNow) / 1000));
  const total = (goalMinutes ?? 0) * 60;

  let countdown: React.ReactNode = null;
  if (total > 0) {
    const remaining = total - elapsed;
    const over = remaining < 0;
    const f = Math.max(0, Math.min(1, remaining / total)); // 1 = all the time left, 0 = none
    const hue = Math.round(120 * f);                       // 120 green, 60 yellow, ~12 orange-red at 10%
    countdown = (
      <span
        className={"font-mono tabular-nums " + (over ? "font-bold" : "")}
        style={{ color: over ? "#ef4444" : `hsl(${hue} 85% 55%)` }}
        title={`Goal ${goalMinutes} min`}
      >
        {over ? "-" : ""}{fmt(Math.abs(remaining))}
      </span>
    );
  }

  return (
    <span className="flex items-center gap-2">
      <span className="font-mono tabular-nums text-[#9fb0d3]" title={paused ? "Paused" : "Elapsed"}>{paused ? "⏸ " : ""}{fmt(elapsed)}</span>
      {countdown && <span className="text-[#3b4a70]" aria-hidden>·</span>}
      {countdown}
    </span>
  );
}
