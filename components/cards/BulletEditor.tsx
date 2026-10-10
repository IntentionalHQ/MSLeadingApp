"use client";
import { useRef, useState } from "react";
import type { CueBullet, CueColor, CueSymbol } from "@/lib/types";
import { CUE_COLORS, CUE_SYMBOLS, CUE_SYMBOLS_BY_ID, colorBg, newBullet } from "@/lib/cueCards";

// Memory-trigger bullets for one card. Each row: symbol badge, text, and a
// "mark" toggle that opens the symbol + highlight toolbar for that row only
// (fourteen buttons per bullet all the time is too much on a phone).
export default function BulletEditor({ bullets, onChange }: { bullets: CueBullet[]; onChange: (next: CueBullet[]) => void }) {
  const [open, setOpen] = useState<string | null>(null); // bullet id with the toolbar showing

  // One keystroke can fire two edits before the parent re-renders (Enter =
  // blur-save the text, then add a row), so every edit builds on the latest
  // array, not the prop captured when the handler was created.
  const latest = useRef(bullets);
  latest.current = bullets;
  const commit = (next: CueBullet[]) => { latest.current = next; onChange(next); };

  const update = (id: string, patch: Partial<CueBullet>) => commit(latest.current.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  const remove = (id: string) => commit(latest.current.filter((b) => b.id !== id));
  const move = (i: number, dir: -1 | 1) => {
    const cur = latest.current;
    const j = i + dir;
    if (j < 0 || j >= cur.length) return;
    const next = [...cur];
    [next[i], next[j]] = [next[j], next[i]];
    commit(next);
  };
  const add = () => {
    const b = newBullet();
    commit([...latest.current, b]);
    setTimeout(() => document.getElementById(`bullet-${b.id}`)?.focus(), 30);
  };
  const toggleSymbol = (id: string, s: CueSymbol) => {
    const b = latest.current.find((x) => x.id === id);
    if (!b) return;
    update(id, { symbols: b.symbols.includes(s) ? b.symbols.filter((x) => x !== s) : [...b.symbols, s] });
  };

  return (
    <div className="space-y-1.5">
      {bullets.map((b, i) => {
        const bg = colorBg(b.color);
        return (
          <div key={b.id} className="rounded-lg border border-[#1f2a44]" style={{ background: bg !== "transparent" ? bg : "#0b1220" }}>
            <div className="flex items-center gap-1.5 p-1.5">
              <button
                type="button"
                onClick={() => setOpen((o) => (o === b.id ? null : b.id))}
                className={"shrink-0 flex items-center gap-0.5 rounded-md px-1.5 min-h-[36px] text-[#9fb0d3] " + (open === b.id ? "bg-[#28345a]" : "bg-[#1f2a44]")}
                aria-label="Mark this bullet"
                aria-expanded={open === b.id}
                title="Symbols and highlight"
              >
                {b.symbols.length === 0
                  ? <span className="text-xs px-0.5">＋</span>
                  : b.symbols.map((s) => { const Icon = CUE_SYMBOLS_BY_ID[s].icon; return <Icon key={s} className="size-4" />; })}
              </button>
              <input
                id={`bullet-${b.id}`}
                defaultValue={b.text}
                placeholder="Short reminder — a name, a question, a picture…"
                className="!min-h-[36px] !py-1.5 !bg-transparent !border-0"
                onBlur={(e) => { if (e.target.value !== b.text) update(b.id, { text: e.target.value }); }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") { e.preventDefault(); (e.target as HTMLInputElement).blur(); if (i === bullets.length - 1) add(); }
                  if (e.key === "Backspace" && !(e.target as HTMLInputElement).value && bullets.length > 1) { e.preventDefault(); remove(b.id); }
                }}
              />
              {/* Phones: the text box gets the whole row; move/delete live in the toolbar below. */}
              <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="hidden sm:inline-flex shrink-0 text-[#9fb0d3] px-1 disabled:opacity-30" aria-label="Move up">↑</button>
              <button type="button" onClick={() => move(i, 1)} disabled={i === bullets.length - 1} className="hidden sm:inline-flex shrink-0 text-[#9fb0d3] px-1 disabled:opacity-30" aria-label="Move down">↓</button>
              <button type="button" onClick={() => remove(b.id)} className="hidden sm:inline-flex shrink-0 text-[#9fb0d3] hover:text-red-400 px-1" aria-label="Delete bullet">✕</button>
            </div>

            {open === b.id && (
              <div className="border-t border-[#1f2a44] px-2 py-2 space-y-2">
                <div className="flex flex-wrap gap-1">
                  {CUE_SYMBOLS.map(({ id, short, label, icon: Icon }) => {
                    const on = b.symbols.includes(id);
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => toggleSymbol(b.id, id)}
                        className={"flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-medium " + (on ? "border-blue-500 bg-[#1a2540] text-blue-300" : "border-[#2a3654] bg-[#121a2b] text-[#9fb0d3]")}
                        title={label}
                        aria-pressed={on}
                      >
                        <Icon className="size-3.5" />{short}
                      </button>
                    );
                  })}
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-[#9fb0d3] mr-1">Highlight</span>
                  {CUE_COLORS.map((c) => (
                    <button
                      key={c.id || "none"}
                      type="button"
                      onClick={() => update(b.id, { color: c.id as CueColor })}
                      className={"h-7 w-7 rounded-full border-2 " + (b.color === c.id ? "border-[#e6ecf5]" : "border-[#2a3654]")}
                      style={{ background: c.id ? c.bg.replace(/0\.2\d\)/, "0.75)") : "transparent" }}
                      title={c.label}
                      aria-label={c.label}
                      aria-pressed={b.color === c.id}
                    >{!c.id && <span className="text-xs text-[#9fb0d3]">–</span>}</button>
                  ))}
                </div>
                <div className="flex gap-2 sm:hidden">
                  <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="btn btn-ghost !min-h-[36px] !py-1 text-sm flex-1" aria-label="Move up">↑ Up</button>
                  <button type="button" onClick={() => move(i, 1)} disabled={i === bullets.length - 1} className="btn btn-ghost !min-h-[36px] !py-1 text-sm flex-1" aria-label="Move down">↓ Down</button>
                  <button type="button" onClick={() => remove(b.id)} className="btn btn-ghost !min-h-[36px] !py-1 text-sm flex-1 text-red-400" aria-label="Delete bullet">✕ Delete</button>
                </div>
              </div>
            )}
          </div>
        );
      })}
      <button type="button" onClick={add} className="btn btn-ghost w-full !min-h-[40px] text-sm">+ Bullet</button>
    </div>
  );
}
