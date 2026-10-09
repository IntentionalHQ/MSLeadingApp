"use client";
import { useEffect, useRef, useState } from "react";
import type { CueCard, CueDeck } from "@/lib/types";
import { buildDeckTemplate, parseDeckTemplate, type ParsedDeck } from "@/lib/cueCardsXlsx";
import CueBulletView from "./CueBulletView";

// "Excel Template" for one deck: download a workbook with the current cards
// and instructions, or upload a filled-in one to replace every card. The
// uploaded file is parsed in the browser and never stored anywhere.
export default function DeckFileMenu({ deck, cards, onApply }: { deck: CueDeck; cards: CueCard[]; onApply: (plan: ParsedDeck) => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<"download" | "parse" | "apply" | null>(null);
  const [preview, setPreview] = useState<ParsedDeck | null>(null);
  const [fileName, setFileName] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open]);

  const download = async () => {
    setOpen(false); setErr(null); setBusy("download");
    try {
      const bytes = await buildDeckTemplate(deck, cards);
      const blob = new Blob([bytes], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `cue-cards-${deck.title.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "deck"}.xlsx`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    } catch (e: any) { setErr(e?.message ?? "Could not build the template."); }
    finally { setBusy(null); }
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    setErr(null); setFileName(f.name); setBusy("parse");
    try { setPreview(await parseDeckTemplate(await f.arrayBuffer())); }
    catch (e: any) { setErr(e?.message ?? "Could not read that file."); }
    finally { setBusy(null); }
  };

  const apply = async () => {
    if (!preview || preview.errors.length) return;
    setBusy("apply");
    try { await onApply(preview); setPreview(null); }
    catch (e: any) { setErr(e?.message ?? "Could not apply the deck."); }
    finally { setBusy(null); }
  };

  return (
    <>
      <div className="relative" ref={menuRef}>
        <button type="button" className="btn btn-ghost" onClick={() => setOpen((o) => !o)} disabled={busy !== null} aria-haspopup="true" aria-expanded={open}>
          {busy === "download" ? "Building…" : busy === "parse" ? "Reading…" : "📊 Excel Template"}
        </button>
        {open && (
          <div className="absolute right-0 mt-1 w-72 card p-1 z-50">
            <button type="button" className="btn btn-ghost w-full justify-start text-left" onClick={download}>
              <span className="mr-2" aria-hidden>⬇️</span>
              <span>
                <span className="block">Download template</span>
                <span className="block text-xs text-[#9fb0d3] font-normal">This deck as a spreadsheet, with instructions for filling it in</span>
              </span>
            </button>
            <button type="button" className="btn btn-ghost w-full justify-start text-left" onClick={() => { setOpen(false); fileRef.current?.click(); }}>
              <span className="mr-2" aria-hidden>⬆️</span>
              <span>
                <span className="block">Upload completed template</span>
                <span className="block text-xs text-[#9fb0d3] font-normal">Replaces every card in this deck. File is not saved anywhere.</span>
              </span>
            </button>
          </div>
        )}
        <input ref={fileRef} type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="hidden" onChange={onFile} />
      </div>

      {err && <div className="text-sm text-red-400 mt-2">{err}</div>}

      {preview && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="card p-4 w-full max-w-lg space-y-3 max-h-[90vh] overflow-y-auto">
            <div>
              <h2>Import cue cards</h2>
              <div className="text-xs text-[#9fb0d3] truncate">{fileName}</div>
            </div>
            {preview.errors.length > 0 && (
              <div className="p-3 rounded bg-[#0b1220] border border-red-600 text-sm space-y-1">
                <div className="text-red-400 font-semibold">Can&apos;t import this file:</div>
                {preview.errors.map((m, i) => <div key={i}>{m}</div>)}
              </div>
            )}
            {preview.warnings.length > 0 && (
              <div className="p-3 rounded bg-[#0b1220] border border-amber-600 text-sm space-y-1">
                <div className="text-amber-400 font-semibold">Heads up:</div>
                {preview.warnings.map((m, i) => <div key={i}>{m}</div>)}
              </div>
            )}
            {preview.errors.length === 0 && (
              <>
                {(preview.deck.title || preview.deck.passage) && (
                  <div className="text-sm">
                    {preview.deck.title && <div><span className="text-[#9fb0d3]">Title:</span> {preview.deck.title}</div>}
                    {preview.deck.passage && <div><span className="text-[#9fb0d3]">Passage:</span> {preview.deck.passage}</div>}
                  </div>
                )}
                <div className="card p-3 space-y-2">
                  <div className="text-xs text-[#9fb0d3]">{preview.cards.length} card{preview.cards.length === 1 ? "" : "s"}</div>
                  {preview.cards.map((c, i) => (
                    <div key={i} className="text-sm">
                      <div className="font-semibold">{i + 1}. {c.title || "Untitled card"}{c.scripture_ref && <span className="text-[#9fb0d3] font-normal"> · {c.scripture_ref}</span>}</div>
                      <ul className="mt-0.5">{c.bullets.map((b) => <CueBulletView key={b.id} bullet={b} size="sm" />)}</ul>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-[#9fb0d3]">This replaces all {cards.length} current card{cards.length === 1 ? "" : "s"} in this deck.</p>
              </>
            )}
            <div className="flex gap-2 justify-end">
              <button type="button" className="btn btn-ghost" onClick={() => setPreview(null)} disabled={busy === "apply"}>Cancel</button>
              {preview.errors.length === 0 && (
                <button type="button" className="btn btn-primary" onClick={apply} disabled={busy === "apply"}>{busy === "apply" ? "Importing…" : "Replace cards"}</button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
