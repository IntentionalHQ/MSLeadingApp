"use client";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { CueCard, CueDeck } from "@/lib/types";
import CueBulletView from "./CueBulletView";
import { filledBullets } from "@/lib/cueCards";

export type PresenterMode = "cards" | "outline";

// Full-screen cue card deck in two modes:
//  - cards: one card per screen, swipe up for the next card and down for the
//    previous. Native CSS scroll-snap drives the motion (the compositor, not
//    JS), `snap-always` makes a hard flick land on exactly one card, pan-y +
//    overscroll-contain stop horizontal swipes and pull-to-refresh.
//  - outline: the whole deck in one plain scroll, for reading it through
//    before speaking. Same cards, no snapping, no key stepping.
// The clock is its own component so a ticking timer never re-renders the deck.
export default function CardPresenter({
  deck, cards, backHref, since, planMinutes, initialMode = "cards",
}: {
  deck: CueDeck;
  cards: CueCard[];
  backHref: string;
  since: number | null;         // epoch ms the section started (from Lead mode), null = start now
  planMinutes: number | null;   // planned length, for the amber/red colouring
  initialMode?: PresenterMode;
}) {
  const router = useRouter();
  const scroller = useRef<HTMLDivElement | null>(null);
  const [mode, setMode] = useState<PresenterMode>(initialMode);
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
    if (start === 0) { try { start = parseInt(sessionStorage.getItem(storageKey) ?? "0", 10) || 0; } catch {} }
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
          try { sessionStorage.setItem(storageKey, String(i)); } catch {}
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
      if (e.key === "Escape") { router.push(backHref); return; }
      if (!stepping) return;
      if (["ArrowDown", "ArrowRight", "PageDown", " "].includes(e.key)) { e.preventDefault(); goTo(idxRef.current + 1); }
      else if (["ArrowUp", "ArrowLeft", "PageUp"].includes(e.key)) { e.preventDefault(); goTo(idxRef.current - 1); }
    };
    let wheelLock = 0;
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) < 8) return;
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
              style={outline ? undefined : { height: "100dvh" }}
            >
              <div className="text-xs font-semibold uppercase tracking-widest text-[#9fb0d3]">
                {outline && <span className="mr-2 text-[#e6ecf5]">{i + 1}/{n}</span>}
                {c.scripture_ref || deck.passage}
              </div>
              <h2 className="mt-1 font-bold leading-tight" style={{ fontSize: outline ? "22px" : "clamp(22px, 6vw, 34px)" }}>{c.title || "Untitled card"}</h2>

              {/* Card mode: bullets are the flexible middle and only scroll if a card is too long. */}
              <ul
                className={"mt-4 space-y-1.5 " + (outline ? "" : "min-h-0 flex-1 overflow-y-auto overscroll-y-contain")}
                style={outline ? undefined : { scrollbarWidth: "none" }}
              >
                {filledBullets(c.bullets).map((b) => <CueBulletView key={b.id} bullet={b} size={outline ? "md" : "lg"} />)}
              </ul>

              {c.key_line && (
                <div className="mt-3 border-l-4 border-blue-500 pl-3 italic leading-snug" style={{ fontSize: outline ? "17px" : "clamp(17px, 4.6vw, 23px)" }}>
                  &ldquo;{c.key_line}&rdquo;
                </div>
              )}
              {c.transition && (
                <div className="mt-3 text-[#9fb0d3] leading-snug" style={{ fontSize: outline ? "15px" : "clamp(14px, 3.8vw, 17px)" }}>
                  <span className="mr-1 font-semibold text-[#e6ecf5]">{last ? "Close:" : "Transition:"}</span>{c.transition}
                </div>
              )}

              {/* The next card's own headline, read live from the deck order (never typed),
                  so reordering cards updates it on its own. Last card just says End. */}
              {!outline && (
                <div className="mt-3 pt-2 border-t border-[#1f2a44] leading-snug">
                  {next ? (
                    <div className="flex items-baseline gap-2">
                      <span className="shrink-0 rounded-md bg-[#1f2a44] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-[#9fb0d3]">Up next</span>
                      <span className="font-semibold text-[#e6ecf5]" style={{ fontSize: "clamp(14px, 3.9vw, 18px)" }}>{next.title || "Untitled card"}</span>
                    </div>
                  ) : (
                    <span className="rounded-md bg-[#1f2a44] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-[#9fb0d3]">End</span>
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
          <div className="font-mono tabular-nums text-[#9fb0d3] truncate">{n ? (outline ? "Outline" : `Card ${idx + 1} of ${n}`) : ""}</div>
          <Clock since={since} planMinutes={planMinutes} />
        </div>
      </div>
    </div>
  );
}

// Own component so the 1s tick only re-renders this span, never the deck.
function Clock({ since, planMinutes }: { since: number | null; planMinutes: number | null }) {
  const startRef = useRef<number>(since ?? Date.now());
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  const elapsed = Math.max(0, Math.floor((now - startRef.current) / 1000));
  const target = (planMinutes ?? 0) * 60;
  const remaining = target - elapsed;
  const cls = target === 0 ? "text-[#9fb0d3]" : remaining < 0 ? "text-red-400" : remaining <= 60 ? "text-amber-400" : "text-[#9fb0d3]";
  const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");
  return <span className={`font-mono tabular-nums ${cls}`} title={target ? `Planned ${planMinutes} min` : "Elapsed"}>{mm}:{ss}</span>;
}
