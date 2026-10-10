"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { CueBullet, CueCard, CueDeck } from "@/lib/types";
import { cardFitWarning, filledBullets, normalizeCard } from "@/lib/cueCards";
import type { ParsedDeck } from "@/lib/cueCardsXlsx";
import PageHeader from "@/components/PageHeader";
import Confirm from "@/components/Confirm";
import AutoTextarea from "@/components/AutoTextarea";
import SaveIndicator from "@/components/outline/SaveIndicator";
import { useSaveState } from "@/components/outline/useBlurSave";
import BulletEditor from "@/components/cards/BulletEditor";
import CueBulletView from "@/components/cards/CueBulletView";
import DeckFileMenu from "@/components/cards/DeckFileMenu";

// Deck editor: deck header, then one block per card. A collapsed card is a
// read-only preview of what the presenter shows; expanded, every field edits
// in place and autosaves on blur. Cards drag to reorder like outline sections.
export default function DeckEditorPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { state, track } = useSaveState();
  const [deck, setDeck] = useState<CueDeck | null>(null);
  const [cards, setCards] = useState<CueCard[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [dragging, setDragging] = useState<{ id: string; overIndex: number } | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const rectsRef = useRef<DOMRect[]>([]);

  const load = async () => {
    const [{ data: d }, { data: c }] = await Promise.all([
      supabase.from("cue_decks").select("*").eq("id", id).single(),
      supabase.from("cue_cards").select("*").eq("deck_id", id).order("position"),
    ]);
    setDeck((d as CueDeck) ?? null);
    setCards(((c ?? []) as any[]).map(normalizeCard));
  };
  useEffect(() => { load(); }, [id]);

  const touch = () => supabase.from("cue_decks").update({ updated_at: new Date().toISOString() }).eq("id", id);

  const patchDeck = (patch: Partial<CueDeck>) => {
    setDeck((p) => (p ? { ...p, ...patch } : p));
    return track(supabase.from("cue_decks").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", id));
  };
  // Blank bullet rows stay in local state (the one just added is being typed
  // into) but never reach the database.
  const patchCard = (cid: string, patch: Partial<CueCard>) => {
    setCards((p) => p.map((c) => (c.id === cid ? { ...c, ...patch } : c)));
    touch();
    return track(supabase.from("cue_cards").update(patch.bullets ? { ...patch, bullets: filledBullets(patch.bullets) } : patch).eq("id", cid));
  };

  const addCard = async () => {
    const { data } = await supabase.from("cue_cards").insert({ deck_id: id, position: cards.length, title: "", bullets: [] }).select().single();
    if (data) {
      const row = normalizeCard(data);
      setCards((p) => [...p, row]);
      setExpanded(row.id);
      touch();
      setTimeout(() => document.getElementById(`card-${row.id}`)?.scrollIntoView({ block: "center", behavior: "smooth" }), 60);
    }
  };

  const persistPositions = (next: CueCard[], prev: CueCard[]) => {
    const changed = next.filter((c) => prev.find((p) => p.id === c.id)?.position !== c.position);
    if (changed.length) track(Promise.all(changed.map((c) => supabase.from("cue_cards").update({ position: c.position }).eq("id", c.id))) as any);
  };

  const reorder = (from: number, to: number) => {
    if (from === to || from < 0 || to < 0 || from >= cards.length || to >= cards.length) return;
    const next = [...cards];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    const renumbered = next.map((c, i) => ({ ...c, position: i }));
    setCards(renumbered);
    persistPositions(renumbered, cards);
  };

  const duplicate = async (c: CueCard) => {
    const { data } = await supabase.from("cue_cards").insert({
      deck_id: id, position: cards.length, title: `${c.title} (copy)`, scripture_ref: c.scripture_ref,
      bullets: c.bullets.map((b) => ({ ...b, id: crypto.randomUUID() })), key_line: c.key_line, transition: c.transition,
    }).select().single();
    if (data) setCards((p) => [...p, normalizeCard(data)]);
  };

  const remove = async (cid: string) => {
    await supabase.from("cue_cards").delete().eq("id", cid);
    const remaining = cards.filter((c) => c.id !== cid).map((c, i) => ({ ...c, position: i }));
    setCards(remaining);
    if (expanded === cid) setExpanded(null);
    persistPositions(remaining, cards);
  };

  const deleteDeck = async () => {
    await supabase.from("cue_decks").delete().eq("id", id);
    router.push("/cards");
  };

  // Replace every card with the uploaded template; deck fields fill blanks only.
  const applyImport = async (plan: ParsedDeck) => {
    const patch: Partial<CueDeck> = {};
    for (const [k, v] of Object.entries(plan.deck)) if (v) (patch as any)[k] = v;
    if (Object.keys(patch).length) {
      const { error } = await supabase.from("cue_decks").update(patch).eq("id", id);
      if (error) throw error;
    }
    const { error: delErr } = await supabase.from("cue_cards").delete().eq("deck_id", id);
    if (delErr) throw delErr;
    const { data, error } = await supabase.from("cue_cards").insert(plan.cards.map((c, i) => ({ deck_id: id, position: i, ...c }))).select();
    if (error) throw error;
    setDeck((p) => (p ? { ...p, ...patch } : p));
    setCards(((data ?? []) as any[]).map(normalizeCard));
    setExpanded(null);
    touch();
  };

  // Drag: same pointer-tracking approach as the outline editor.
  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: PointerEvent) => {
      const rects = rectsRef.current;
      let over = rects.length;
      for (let i = 0; i < rects.length; i++) {
        if (e.clientY < rects[i].top + rects[i].height / 2) { over = i; break; }
      }
      setDragging((d) => (d && d.overIndex !== over ? { ...d, overIndex: over } : d));
    };
    const onUp = () => {
      if (dragging) {
        const from = cards.findIndex((c) => c.id === dragging.id);
        if (from !== -1) {
          const to = dragging.overIndex > from ? dragging.overIndex - 1 : dragging.overIndex;
          if (to !== from) reorder(from, to);
        }
      }
      setDragging(null);
    };
    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
    return () => { document.removeEventListener("pointermove", onMove); document.removeEventListener("pointerup", onUp); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragging, cards]);

  const startDrag = (cid: string) => (e: React.PointerEvent) => {
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    rectsRef.current = listRef.current ? Array.from(listRef.current.children).map((el) => el.getBoundingClientRect()) : [];
    setDragging({ id: cid, overIndex: cards.findIndex((c) => c.id === cid) });
  };

  if (!deck) return <div className="card p-4">Loading…</div>;

  return (
    <div className="space-y-4 pb-20">
      <PageHeader
        title={deck.title}
        subtitle={`${cards.length} card${cards.length === 1 ? "" : "s"}${deck.passage ? ` · ${deck.passage}` : ""}`}
        backHref="/cards"
        backLabel="Cards"
        right={
          <div className="flex flex-wrap items-center gap-2">
            <SaveIndicator state={state} />
            <DeckFileMenu deck={deck} cards={cards} onApply={applyImport} />
            <Link href={`/cards/${id}/present`} className={"btn btn-primary" + (cards.length === 0 ? " pointer-events-none opacity-40" : "")}>▶ Present</Link>
            <Confirm label="🗑" title="Delete deck" confirmLabel="Delete deck" onConfirm={deleteDeck} />
          </div>
        }
      />

      {/* Deck header */}
      <div className="card p-4 space-y-3">
        <div>
          <label>Deck title</label>
          <input defaultValue={deck.title} onBlur={(e) => { const v = e.target.value.trim() || "Untitled deck"; if (v !== deck.title) patchDeck({ title: v }); }} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label>Passage</label>
            <input defaultValue={deck.passage ?? ""} placeholder="Mark 5:21–43" onBlur={(e) => { if ((e.target.value || null) !== deck.passage) patchDeck({ passage: e.target.value || null }); }} />
          </div>
          <div>
            <label>Subtitle</label>
            <input defaultValue={deck.subtitle ?? ""} placeholder="Youth Group Message · 15–20 min" onBlur={(e) => { if ((e.target.value || null) !== deck.subtitle) patchDeck({ subtitle: e.target.value || null }); }} />
          </div>
        </div>
      </div>

      {/* Cards */}
      <div ref={listRef} className="space-y-2">
        {cards.map((c, i) => {
          const isOpen = expanded === c.id;
          const warn = cardFitWarning(c);
          return (
            <div key={c.id}>
              {dragging && dragging.overIndex === i && <div className="h-0.5 bg-blue-500 rounded mb-2" />}
              <div id={`card-${c.id}`} className={`card overflow-hidden ${dragging?.id === c.id ? "opacity-50" : ""}`}>
                <div className="flex items-stretch">
                  <span onPointerDown={startDrag(c.id)} role="button" aria-label="Drag to reorder" className="touch-none cursor-grab select-none text-[#9fb0d3] px-2 py-3 flex items-center">⠿</span>
                  <button type="button" onClick={() => setExpanded((cur) => (cur === c.id ? null : c.id))} className="flex-1 flex items-center gap-2 py-3 pr-3 text-left min-w-0">
                    <span className="text-[#9fb0d3] text-xs font-mono shrink-0">{i + 1}/{cards.length}</span>
                    <span className="flex-1 min-w-0">
                      <span className="block truncate font-semibold">{c.title || <span className="text-[#9fb0d3] font-normal">Untitled card</span>}</span>
                      {(c.scripture_ref || warn) && (
                        <span className="block text-xs truncate">
                          {c.scripture_ref && <span className="text-[#9fb0d3]">{c.scripture_ref}</span>}
                          {warn && <span className="text-amber-400">{c.scripture_ref ? " · " : ""}⚠ may not fit</span>}
                        </span>
                      )}
                    </span>
                    <span className={`shrink-0 text-[#9fb0d3] transition-transform ${isOpen ? "rotate-90" : ""}`} aria-hidden>›</span>
                  </button>
                </div>

                {!isOpen && (c.bullets.length > 0 || c.key_line) && (
                  <div className="px-3 pb-3 -mt-1">
                    <ul className="space-y-0.5">{filledBullets(c.bullets).map((b) => <CueBulletView key={b.id} bullet={b} size="sm" />)}</ul>
                    {c.key_line && <div className="mt-2 text-sm italic border-l-2 border-blue-500 pl-2 text-[#e6ecf5]">“{c.key_line}”</div>}
                  </div>
                )}

                {isOpen && (
                  <div className="border-t border-[#1f2a44] mt-1 pt-3 px-3 pb-3 space-y-3">
                    <div>
                      <label>Card title</label>
                      <input defaultValue={c.title} placeholder="Jairus Had Everything. The Woman Had Nothing. Both Needed Jesus."
                        onBlur={(e) => { if (e.target.value !== c.title) patchCard(c.id, { title: e.target.value }); }} />
                      <div className="text-xs text-[#9fb0d3] mt-1">A conversational headline that tells you what this section is about in one glance.</div>
                    </div>
                    <div>
                      <label>Scripture (optional)</label>
                      <input defaultValue={c.scripture_ref ?? ""} placeholder="Mark 5:21–29"
                        onBlur={(e) => { if ((e.target.value || null) !== c.scripture_ref) patchCard(c.id, { scripture_ref: e.target.value || null }); }} />
                    </div>
                    <div>
                      <label>Memory triggers (3–5 bullets)</label>
                      <BulletEditor bullets={c.bullets} onChange={(bullets: CueBullet[]) => patchCard(c.id, { bullets })} />
                    </div>
                    <div>
                      <label>Key line</label>
                      <AutoTextarea rows={2} defaultValue={c.key_line ?? ""} placeholder="Two completely different lives. The same desperate need for Jesus."
                        onBlur={(e) => { if ((e.target.value || null) !== c.key_line) patchCard(c.id, { key_line: e.target.value || null }); }} />
                    </div>
                    <div>
                      <label>{i === cards.length - 1 ? "Closing" : "Transition to the next card"}</label>
                      <AutoTextarea rows={2} defaultValue={c.transition ?? ""} placeholder="She reaches out, touches his robe, and is healed. But what Jesus calls her next might be even more powerful."
                        onBlur={(e) => { if ((e.target.value || null) !== c.transition) patchCard(c.id, { transition: e.target.value || null }); }} />
                    </div>
                    {warn && <div className="text-xs text-amber-400">⚠ {warn}</div>}
                    <div className="flex flex-wrap gap-2 pt-1">
                      <button type="button" onClick={() => reorder(i, i - 1)} disabled={i === 0} className="btn btn-ghost" aria-label="Move up">↑</button>
                      <button type="button" onClick={() => reorder(i, i + 1)} disabled={i === cards.length - 1} className="btn btn-ghost" aria-label="Move down">↓</button>
                      <button type="button" onClick={() => duplicate(c)} className="btn btn-ghost">Duplicate</button>
                      <Confirm label="🗑" title="Delete card" onConfirm={() => remove(c.id)} />
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {dragging && dragging.overIndex === cards.length && <div className="h-0.5 bg-blue-500 rounded" />}
        {cards.length === 0 && <div className="card p-4 text-sm text-[#9fb0d3]">No cards yet. Add one below, or download the Excel template and have it filled in.</div>}
      </div>

      <button type="button" onClick={addCard} className="btn btn-ghost w-full btn-lg">+ Add card</button>
    </div>
  );
}
