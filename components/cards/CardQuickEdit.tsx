"use client";
import { useRef, useState } from "react";
import type { CueBullet, CueCard } from "@/lib/types";
import AutoTextarea from "@/components/AutoTextarea";
import BulletEditor from "./BulletEditor";

export type CardQuickPatch = Pick<CueCard, "title" | "scripture_ref" | "bullets" | "key_line" | "transition">;

// The dry-run editor: one card's presented fields in a full-screen sheet over
// the presenter. Nothing is written until Save; Cancel throws the edits away.
export default function CardQuickEdit({
  card, index, total, onSave, onCancel,
}: {
  card: CueCard;
  index: number;
  total: number;
  onSave: (patch: CardQuickPatch) => Promise<void>;
  onCancel: () => void;
}) {
  const [bullets, setBullets] = useState<CueBullet[]>(card.bullets);
  const [busy, setBusy] = useState(false);
  const titleRef = useRef<HTMLTextAreaElement | null>(null);
  const refRef = useRef<HTMLInputElement | null>(null);
  const lastRef = useRef<HTMLTextAreaElement | null>(null);
  const transRef = useRef<HTMLTextAreaElement | null>(null);

  const save = async () => {
    if (busy) return;
    setBusy(true);
    // Flush whichever bullet is still focused so its text is in `bullets`.
    (document.activeElement as HTMLElement | null)?.blur?.();
    await new Promise((r) => setTimeout(r, 0));
    try {
      await onSave({
        title: (titleRef.current?.value ?? "").replace(/\s+/g, " ").trim(),
        scripture_ref: refRef.current?.value.trim() || null,
        bullets,
        key_line: lastRef.current?.value.trim() || null,
        transition: transRef.current?.value.trim() || null,
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] h-full overflow-y-auto overscroll-y-contain bg-[#0b1220] text-[#e6ecf5]">
      <div className="mx-auto w-full max-w-2xl px-4 pb-28 pt-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="text-xs font-semibold uppercase tracking-widest text-[#9fb0d3]">Editing card {index + 1} of {total} · clock paused</div>
          <button type="button" className="btn btn-ghost !min-h-0 !px-3 !py-1.5 text-sm" onClick={onCancel} disabled={busy}>Cancel</button>
        </div>
        <div>
          <label>Card title</label>
          <AutoTextarea ref={titleRef} rows={1} defaultValue={card.title}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); (e.target as HTMLTextAreaElement).blur(); } }} />
        </div>
        <div>
          <label>Scripture (optional)</label>
          <input ref={refRef} defaultValue={card.scripture_ref ?? ""} placeholder="Mark 5:21–29" />
        </div>
        <div>
          <label>Memory triggers</label>
          <BulletEditor bullets={bullets} onChange={setBullets} />
        </div>
        <div>
          <label>Last point</label>
          <AutoTextarea ref={lastRef} rows={2} defaultValue={card.key_line ?? ""} />
        </div>
        <div>
          <label>{index === total - 1 ? "Closing" : "Transition to the next card"}</label>
          <AutoTextarea ref={transRef} rows={2} defaultValue={card.transition ?? ""} />
        </div>
      </div>
      <div className="fixed inset-x-0 bottom-0 z-[61] border-t border-[#1f2a44] bg-[#0b1220]/95 p-3 backdrop-blur">
        <div className="mx-auto grid max-w-2xl grid-cols-3 gap-2">
          <button type="button" className="btn btn-ghost btn-lg" onClick={onCancel} disabled={busy}>Cancel</button>
          <button type="button" className="btn btn-primary btn-lg col-span-2" onClick={save} disabled={busy}>{busy ? "Saving…" : "Save & resume"}</button>
        </div>
      </div>
    </div>
  );
}
