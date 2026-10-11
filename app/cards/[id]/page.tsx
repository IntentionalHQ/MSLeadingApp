"use client";
import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { CueBullet, CueCard, CueDeck } from "@/lib/types";
import { CUE_COLORS, cardFitWarning, colorSolid, filledBullets, normalizeCard } from "@/lib/cueCards";
import type { ParsedDeck } from "@/lib/cueCardsXlsx";
import PageHeader from "@/components/PageHeader";
import Confirm from "@/components/Confirm";
import { trashRow } from "@/lib/trash";
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
  const [tab, setTab] = useState<"cards" | "notes">("cards"); // Notes = in-depth context, never presented
  const [notesOpenFor, setNotesOpenFor] = useState<string | null>(null); // card whose notes are open inline on the Cards tab

  // Opening a card collapses whichever card was open, which can shift the page
  // under your finger. Remember where the tapped card was and keep it there.
  const anchorRef = useRef<{ id: string; top: number } | null>(null);
  const openCard = (cid: string | null) => {
    if (cid) {
      const el = document.getElementById(`card-${cid}`);
      anchorRef.current = el ? { id: cid, top: el.getBoundingClientRect().top } : null;
    }
    setExpanded(cid);
  };
  useLayoutEffect(() => {
    const a = anchorRef.current;
    if (!a) return;
    anchorRef.current = null;
    const el = document.getElementById(`card-${a.id}`);
    if (!el) return;
    const delta = el.getBoundingClientRect().top - a.top;
    if (Math.abs(delta) > 1) window.scrollBy(0, delta);
  }, [expanded]);
  const [dragging, setDragging] = useState<{ id: string; overIndex: number } | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const rectsRef = useRef<DOMRect[]>([]);

  const load = async () => {
    const [{ data: d }, { data: c }] = await Promise.all([
      supabase.from("cue_decks").select("*").eq("id", id).single(),
      supabase.from("cue_cards").select("*").eq("deck_id", id).order("position"),
    ]);
    setDeck((d as CueDeck) ?? null);
    const rows = ((c ?? []) as any[]).map(normalizeCard);
    setCards(rows);
    // Open the first card so the editing form is in view, not hidden behind a tap.
    setExpanded((cur) => cur ?? rows[0]?.id ?? null);
  };
  useEffect(() => { load(); }, [id]);

  const touch = () => supabase.from("cue_decks").update({ updated_at: new Date().toISOString() }).eq("id", id);

  const patchDeck = (patch: Partial<CueDeck>) => {
    setDeck((p) => (p ? { ...p, ...patch } : p));
    return track(supabase.from("cue_decks").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", id));
  };
  // Blank bullet rows stay in local state (the one just added is being typed
  // into) but never reach the database.
  // Editing what the audience sees flags the card's notes for a re-read, but
  // only when there are notes to re-read; saving or confirming them clears it.
  const PRESENTED: (keyof CueCard)[] = ["title", "scripture_ref", "bullets", "key_line", "transition"];
  const patchCard = (cid: string, patch: Partial<CueCard>) => {
    const cur = cards.find((c) => c.id === cid);
    const full: Partial<CueCard> = { ...patch };
    if (!("notes_stale" in patch)) {
      if ("notes" in patch) full.notes_stale = false;
      else if (cur?.notes?.trim() && PRESENTED.some((k) => k in patch)) full.notes_stale = true;
    }
    setCards((p) => p.map((c) => (c.id === cid ? { ...c, ...full } : c)));
    touch();
    return track(supabase.from("cue_cards").update(full.bullets ? { ...full, bullets: filledBullets(full.bullets) } : full).eq("id", cid));
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

  // Into the trash (restore from the Cards tab for 30 days).
  const deleteDeck = async () => {
    await trashRow("cue_decks", id);
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
            <Link href={`/cards/${id}/present?view=outline`} className={"btn btn-ghost" + (cards.length === 0 ? " pointer-events-none opacity-40" : "")} title="Read the whole deck top to bottom">📄 Review</Link>
            <Link href={`/cards/${id}/present`} className={"btn btn-primary" + (cards.length === 0 ? " pointer-events-none opacity-40" : "")}>▶ Present</Link>
            <Confirm label="🗑" title="Delete deck" confirmLabel="Delete deck" onConfirm={deleteDeck} />
          </div>
        }
      />

      {/* Deck header */}
      <div className="card p-4 space-y-3">
        <div>
          <label>Deck title</label>
          <AutoTextarea rows={1} defaultValue={deck.title}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); (e.target as HTMLTextAreaElement).blur(); } }}
            onBlur={(e) => { const v = e.target.value.replace(/\s+/g, " ").trim() || "Untitled deck"; if (v !== deck.title) patchDeck({ title: v }); }} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label>Passage</label>
            <input defaultValue={deck.passage ?? ""} placeholder="Mark 5:21–43" onBlur={(e) => { if ((e.target.value || null) !== deck.passage) patchDeck({ passage: e.target.value || null }); }} />
          </div>
          <div>
            <label>Subtitle</label>
            <input defaultValue={deck.subtitle ?? ""} placeholder="Youth Group Message · 15–20 min" onBlur={(e) => { if ((e.target.value || null) !== deck.subtitle) patchDeck({ subtitle: e.target.value || null }); }} />
          </div>
          <div>
            <label>Goal time (min)</label>
            <input type="number" inputMode="numeric" min={0} defaultValue={deck.goal_minutes ?? ""} placeholder="20"
              onBlur={(e) => { const v = e.target.value ? parseInt(e.target.value, 10) : null; if (v !== deck.goal_minutes) patchDeck({ goal_minutes: Number.isNaN(v as number) ? null : v }); }} />
            <div className="text-xs text-[#9fb0d3] mt-1">The presenter counts down from this next to the running clock.</div>
          </div>
        </div>
      </div>

      {/* Cards | Notes */}
      <div className="flex gap-2" role="tablist">
        <button type="button" role="tab" aria-selected={tab === "cards"} onClick={() => setTab("cards")} className={"btn flex-1 " + (tab === "cards" ? "btn-primary" : "btn-ghost")}>🃏 Cue Cards</button>
        <button type="button" role="tab" aria-selected={tab === "notes"} onClick={() => setTab("notes")} className={"btn flex-1 " + (tab === "notes" ? "btn-primary" : "btn-ghost")}>📝 Notes</button>
      </div>

      {tab === "cards" && (<>
      {/* Cards */}
      {cards.length > 0 && <div className="text-xs text-[#9fb0d3] -mb-1">Tap a card to edit it. Drag ⠿ to reorder.</div>}
      <div ref={listRef} className="space-y-5">
        {cards.map((c, i) => {
          const isOpen = expanded === c.id;
          const warn = cardFitWarning(c);
          return (
            <div key={c.id}>
              {dragging && dragging.overIndex === i && <div className="h-0.5 bg-blue-500 rounded mb-2" />}
              <div
                id={`card-${c.id}`}
                className={`card overflow-hidden border-2 border-[#2f3d60] shadow-lg shadow-black/30 ${dragging?.id === c.id ? "opacity-50" : ""}`}
                style={colorSolid(c.color) ? { borderLeft: `5px solid ${colorSolid(c.color)}` } : undefined}
              >
                {/* Header band: a lighter strip with the card number, so each card reads as its own block. */}
                <div className="flex items-stretch bg-[#172138] border-b border-[#2a3654]">
                  <span onPointerDown={startDrag(c.id)} role="button" aria-label="Drag to reorder" className="touch-none cursor-grab select-none text-[#9fb0d3] px-2 py-3 flex items-center">⠿</span>
                  <button type="button" onClick={() => openCard(expanded === c.id ? null : c.id)} className="flex-1 flex items-center gap-2 py-3 pr-3 text-left min-w-0">
                    <span className="shrink-0 rounded-md bg-[#2a3654] px-1.5 py-0.5 text-xs font-mono text-[#e6ecf5]">{i + 1}/{cards.length}</span>
                    <span className="flex-1 min-w-0">
                      <span className="block truncate font-semibold">{c.title || <span className="text-[#9fb0d3] font-normal">Untitled card</span>}</span>
                      {(c.scripture_ref || warn) && (
                        <span className="block text-xs truncate">
                          {c.scripture_ref && <span className="text-[#9fb0d3]">{c.scripture_ref}</span>}
                          {warn && <span className="text-[#9fb0d3]">{c.scripture_ref ? " · " : ""}scrolls on phone</span>}
                        </span>
                      )}
                    </span>
                    <span className={"shrink-0 rounded-lg px-2.5 py-1 text-xs font-semibold " + (isOpen ? "bg-[#1f2a44] text-[#9fb0d3]" : "bg-blue-600 text-white")}>{isOpen ? "Done" : "✎ Edit"}</span>
                  </button>
                </div>

                {/* Editor-only: the card changed after its notes were written. Opens those notes right here. */}
                {c.notes_stale && (
                  <div className="mx-3 mb-2 rounded-lg border border-amber-600 bg-amber-900/30 text-amber-200 text-sm">
                    <button type="button" onClick={() => setNotesOpenFor((o) => (o === c.id ? null : c.id))} className="w-full text-left px-3 py-2 flex items-center justify-between gap-2">
                      <span>⚠ Card changed. Are the notes still good?</span>
                      <span className="text-xs shrink-0 underline">{notesOpenFor === c.id ? "Close" : "Open notes"}</span>
                    </button>
                    {notesOpenFor === c.id && (
                      <div className="px-3 pb-3 space-y-2">
                        <AutoTextarea id={`stale-notes-${c.id}`} rows={5} defaultValue={c.notes ?? ""} placeholder="The full context of this card." />
                        <div className="flex flex-wrap gap-2">
                          <button type="button" className="btn btn-primary" onClick={() => { const el = document.getElementById(`stale-notes-${c.id}`) as HTMLTextAreaElement | null; patchCard(c.id, { notes: el?.value || null, notes_stale: false }); setNotesOpenFor(null); }}>Save notes</button>
                          <button type="button" className="btn btn-ghost" onClick={() => { patchCard(c.id, { notes_stale: false }); setNotesOpenFor(null); }}>✓ Still good</button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {!isOpen && (c.bullets.length > 0 || c.key_line || c.transition) && (
                  <div role="button" tabIndex={0} onClick={() => openCard(c.id)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openCard(c.id); } }} className="px-3 pb-3 -mt-1 cursor-pointer" title="Tap to edit this card">
                    <ul className="space-y-0.5">{filledBullets(c.bullets).map((b) => <CueBulletView key={b.id} bullet={b} size="sm" />)}</ul>
                    {c.key_line && <div className="mt-2 text-sm italic border-l-2 border-blue-500 pl-2 text-[#e6ecf5]">“{c.key_line}”</div>}
                    {c.transition && <div className="mt-2 text-sm border-l-2 border-purple-500 pl-2 text-[#9fb0d3]">{c.transition}</div>}
                  </div>
                )}

                {isOpen && (
                  <div className="border-t border-[#1f2a44] mt-1 pt-3 px-3 pb-3 space-y-3">
                    <div>
                      <label>Card title</label>
                      <AutoTextarea rows={1} defaultValue={c.title} placeholder="Jairus Had Everything. The Woman Had Nothing. Both Needed Jesus."
                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); (e.target as HTMLTextAreaElement).blur(); } }}
                        onBlur={(e) => { const v = e.target.value.replace(/\s+/g, " ").trim(); if (v !== c.title) patchCard(c.id, { title: v }); }} />
                      <div className="text-xs text-[#9fb0d3] mt-1">A conversational headline that tells you what this section is about in one glance.</div>
                    </div>
                    <div>
                      <label>Scripture (optional)</label>
                      <input defaultValue={c.scripture_ref ?? ""} placeholder="Mark 5:21–29"
                        onBlur={(e) => { if ((e.target.value || null) !== c.scripture_ref) patchCard(c.id, { scripture_ref: e.target.value || null }); }} />
                    </div>
                    <div>
                      <label>Section colour</label>
                      <div className="flex items-center gap-1.5">
                        {CUE_COLORS.map((col) => (
                          <button
                            key={col.id || "none"}
                            type="button"
                            onClick={() => { if (col.id !== c.color) patchCard(c.id, { color: col.id }); }}
                            className={"h-8 w-8 rounded-full border-2 " + (c.color === col.id ? "border-[#e6ecf5]" : "border-[#2a3654]")}
                            style={{ background: colorSolid(col.id) ?? "transparent" }}
                            title={col.label}
                            aria-label={col.label}
                            aria-pressed={c.color === col.id}
                          >{!col.id && <span className="text-xs text-[#9fb0d3]">–</span>}</button>
                        ))}
                      </div>
                      <div className="text-xs text-[#9fb0d3] mt-1">Give the cards of one part of the message the same colour so they read as a group.</div>
                    </div>
                    <div>
                      <label>Memory triggers (3–5 bullets)</label>
                      <BulletEditor bullets={c.bullets} onChange={(bullets: CueBullet[]) => patchCard(c.id, { bullets })} />
                    </div>
                    <div>
                      <label>Last point</label>
                      <AutoTextarea rows={2} defaultValue={c.key_line ?? ""} placeholder="Two completely different lives. The same desperate need for Jesus."
                        onBlur={(e) => { if ((e.target.value || null) !== c.key_line) patchCard(c.id, { key_line: e.target.value || null }); }} />
                    </div>
                    <div>
                      <label>{i === cards.length - 1 ? "Closing" : "Transition to the next card"}</label>
                      <AutoTextarea rows={2} defaultValue={c.transition ?? ""} placeholder="She reaches out, touches his robe, and is healed. But what Jesus calls her next might be even more powerful."
                        onBlur={(e) => { if ((e.target.value || null) !== c.transition) patchCard(c.id, { transition: e.target.value || null }); }} />
                    </div>
                    {warn && <div className="text-xs text-[#9fb0d3]">{warn}</div>}
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
      </>)}

      {/* Notes: the full context of the message, card by card, for coming back to it later. Never shown in the presenter. */}
      {tab === "notes" && (
        <div className="space-y-5">
          <div className="card p-4 space-y-2">
            <label>About this message</label>
            <AutoTextarea rows={4} defaultValue={deck.notes ?? ""} placeholder="What this message was about, who it was for, what you hoped would land. Anything future-you needs to pick it back up."
              onBlur={(e) => { if ((e.target.value || null) !== deck.notes) patchDeck({ notes: e.target.value || null }); }} />
          </div>
          {cards.length === 0 && <div className="card p-4 text-sm text-[#9fb0d3]">Add cards on the Cue Cards tab; each one gets its own notes section here.</div>}
          {cards.map((c, i) => (
            <div key={c.id} className="card overflow-hidden border-2 border-[#2f3d60] shadow-lg shadow-black/30 p-4 pt-0 space-y-2">
              <div className="-mx-4 mb-2 flex items-baseline gap-2 min-w-0 bg-[#172138] border-b border-[#2a3654] px-4 py-2.5">
                <span className="shrink-0 rounded-md bg-[#2a3654] px-1.5 py-0.5 text-xs font-mono text-[#e6ecf5]">{i + 1}/{cards.length}</span>
                <span className="font-semibold truncate">{c.title || <span className="text-[#9fb0d3] font-normal">Untitled card</span>}</span>
                {c.scripture_ref && <span className="text-xs text-[#9fb0d3] shrink-0">{c.scripture_ref}</span>}
              </div>
              {c.notes_stale && (
                <div className="rounded-lg border border-amber-600 bg-amber-900/30 text-amber-200 text-sm px-3 py-2 flex flex-wrap items-center justify-between gap-2">
                  <span>⚠ This card changed since these notes were written.</span>
                  <button type="button" className="btn btn-ghost !min-h-0 !px-3 !py-1.5 text-sm" onClick={() => patchCard(c.id, { notes_stale: false })}>✓ Notes are still good</button>
                </div>
              )}
              <AutoTextarea rows={5} defaultValue={c.notes ?? ""} placeholder="The full context of this card: the point, the illustration in full, where it landed, what you would change next time."
                onBlur={(e) => { if ((e.target.value || null) !== c.notes) patchCard(c.id, { notes: e.target.value || null }); }} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
