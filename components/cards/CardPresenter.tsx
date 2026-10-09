"use client";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { CueCard, CueDeck } from "@/lib/types";
import CueBulletView from "./CueBulletView";
import { filledBullets } from "@/lib/cueCards";

// Full-screen cue card deck: one card per screen, swipe up for the next card
// and down for the previous. Native CSS scroll-snap drives the motion (the
// compositor, not JS), `snap-always` makes a hard flick land on exactly one
// card, pan-y + overscroll-contain stop horizontal swipes and pull-to-refresh.
// The clock is its own component so a ticking timer never re-renders the deck.
export default function CardPresenter({
  deck, cards, backHref, since, planMinutes,
}: {
  deck: CueDeck;
  cards: CueCard[];
  backHref: string;
  since: number | null;         // epoch ms the section started (from Lead mode), null = start now
  planMinutes: number | null;   // planned length, for the amber/red colouring
}) {
  const router = useRouter();
  const scroller = useRef<HTMLDivElement | null>(null);
  const [idx, setIdx] = useState(0);
  const idxRef = useRef(0);
  const storageKey = `cue:${deck.id}:idx`;

  const goTo = (i: number, smooth = true) => {
    const el = scroller.current;
    if (!el) return;
    const n = Math.max(0, Math.min(cards.length - 1, i));
    el.scrollTo({ top: n * el.clientHeight, behavior: smooth ? "smooth" : "auto" });
  };

  // Resume where you left off (per deck, this browser session).
  useEffect(() => {
    let start = 0;
    try { start = parseInt(sessionStorage.getItem(storageKey) ?? "0", 10) || 0; } catch {}
    if (start > 0 && start < cards.length) goTo(start, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deck.id, cards.length]);

  // Which card is on screen: IntersectionObserver, never a scroll listener.
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
  }, [cards, storageKey]);

  // Desktop: arrow / space / page keys step one card; Escape leaves.
  // Mouse wheel: one card per flick instead of a free scroll that then snaps.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (["ArrowDown", "ArrowRight", "PageDown", " "].includes(e.key)) { e.preventDefault(); goTo(idxRef.current + 1); }
      else if (["ArrowUp", "ArrowLeft", "PageUp"].includes(e.key)) { e.preventDefault(); goTo(idxRef.current - 1); }
      else if (e.key === "Escape") router.push(backHref);
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
    el?.addEventListener("wheel", onWheel, { passive: false });
    return () => { window.removeEventListener("keydown", onKey); el?.removeEventListener("wheel", onWheel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [backHref, cards.length]);

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

  const n = cards.length;

  return (
    <div className="fixed inset-0 z-50 bg-[#0b1220] text-[#e6ecf5]" style={{ height: "100dvh" }}>
      <div
        ref={scroller}
        className="h-full w-full overflow-y-auto snap-y snap-mandatory overscroll-y-contain"
        style={{ touchAction: "pan-y", scrollbarWidth: "none", WebkitOverflowScrolling: "touch" } as React.CSSProperties}
      >
        {n === 0 && (
          <section className="flex flex-col items-center justify-center px-6 text-center" style={{ height: "100dvh" }}>
            <div className="text-xl font-bold">This deck has no cards yet.</div>
            <div className="mt-2 text-sm text-[#9fb0d3]">Add cards on the Cards tab, then present.</div>
          </section>
        )}
        {cards.map((c, i) => (
          <section
            key={c.id}
            data-idx={i}
            className="snap-start snap-always flex flex-col mx-auto w-full max-w-2xl px-5 pt-16 pb-8"
            style={{ height: "100dvh" }}
          >
            {(c.scripture_ref || deck.passage) && (
              <div className="text-xs font-semibold uppercase tracking-widest text-[#9fb0d3]">{c.scripture_ref || deck.passage}</div>
            )}
            <h2 className="mt-1 font-bold leading-tight" style={{ fontSize: "clamp(22px, 6vw, 34px)" }}>{c.title || "Untitled card"}</h2>

            {/* Bullets are the flexible middle; they only become scrollable if a card is too long. */}
            <ul className="mt-4 min-h-0 flex-1 space-y-1.5 overflow-y-auto overscroll-y-contain" style={{ scrollbarWidth: "none" }}>
              {filledBullets(c.bullets).map((b) => <CueBulletView key={b.id} bullet={b} size="lg" />)}
            </ul>

            {c.key_line && (
              <div className="mt-3 border-l-4 border-blue-500 pl-3 italic leading-snug" style={{ fontSize: "clamp(17px, 4.6vw, 23px)" }}>
                &ldquo;{c.key_line}&rdquo;
              </div>
            )}
            {c.transition && (
              <div className="mt-3 text-[#9fb0d3] leading-snug" style={{ fontSize: "clamp(14px, 3.8vw, 17px)" }}>
                <span className="mr-1 font-semibold text-[#e6ecf5]">{i === n - 1 ? "Close" : "Next →"}</span>{c.transition}
              </div>
            )}
          </section>
        ))}
      </div>

      {/* Chrome: thin progress line, back, "Card 2 of 4", clock. */}
      <div className="pointer-events-none absolute inset-x-0 top-0">
        <div className="h-0.5 bg-[#1f2a44]"><div className="h-0.5 bg-blue-500" style={{ width: `${n ? ((idx + 1) / n) * 100 : 0}%` }} /></div>
        <div className="mx-auto flex max-w-2xl items-center justify-between px-3 pt-2 text-sm">
          <button type="button" onClick={() => router.push(backHref)} className="pointer-events-auto btn btn-ghost !min-h-0 !px-3 !py-1.5 text-sm" aria-label="Exit presentation">✕</button>
          <div className="font-mono tabular-nums text-[#9fb0d3]">{n ? `Card ${idx + 1} of ${n}` : ""}</div>
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
