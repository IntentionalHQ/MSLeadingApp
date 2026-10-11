"use client";
import { Suspense, useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { CueCard, CueDeck } from "@/lib/types";
import { filledBullets, normalizeCard } from "@/lib/cueCards";
import CardPresenter, { type PresenterMode } from "@/components/cards/CardPresenter";
import type { CardQuickPatch } from "@/components/cards/CardQuickEdit";

// /cards/[id]/present?back=<href>&since=<epoch ms>&plan=<minutes>&view=outline
// `back` is where ✕ / Escape returns to (Lead mode passes itself). `since` and
// `plan` come from Lead mode so the clock here matches the section timer there.
function PresentInner() {
  const { id } = useParams<{ id: string }>();
  const params = useSearchParams();
  const [deck, setDeck] = useState<CueDeck | null>(null);
  const [cards, setCards] = useState<CueCard[] | null>(null);

  useEffect(() => {
    (async () => {
      const [{ data: d }, { data: c }] = await Promise.all([
        supabase.from("cue_decks").select("*").eq("id", id).single(),
        supabase.from("cue_cards").select("*").eq("deck_id", id).order("position"),
      ]);
      setDeck((d as CueDeck) ?? null);
      setCards(((c ?? []) as any[]).map(normalizeCard));
    })();
  }, [id]);

  const back = params.get("back") || `/cards/${id}`;
  const sinceRaw = params.get("since");
  const since = sinceRaw && !Number.isNaN(Number(sinceRaw)) ? Number(sinceRaw) : null;
  const planRaw = params.get("plan");
  const plan = planRaw && !Number.isNaN(Number(planRaw)) ? Number(planRaw) : null;
  const view: PresenterMode = params.get("view") === "outline" ? "outline" : "cards";
  // Dry run: the same deck with an Edit pill on every card; editing pauses the clock.
  const rehearse = params.get("rehearse") === "1";

  // A card saved from the dry run. Editing what the audience sees flags the
  // notes for a re-read when there are notes (same rule as the deck editor).
  const saveCard = async (cardId: string, patch: CardQuickPatch) => {
    const cur = cards?.find((c) => c.id === cardId);
    const changed = !!cur && (["title", "scripture_ref", "key_line", "transition"] as const).some((k) => (cur[k] ?? null) !== (patch[k] ?? null))
      || JSON.stringify(cur?.bullets) !== JSON.stringify(patch.bullets);
    const full = { ...patch, bullets: filledBullets(patch.bullets), ...(changed && cur?.notes?.trim() ? { notes_stale: true } : {}) };
    const { error } = await supabase.from("cue_cards").update(full).eq("id", cardId);
    if (error) throw error;
    setCards((p) => (p ? p.map((c) => (c.id === cardId ? { ...c, ...full } : c)) : p));
    supabase.from("cue_decks").update({ updated_at: new Date().toISOString() }).eq("id", id).then(() => {});
  };

  if (!deck || !cards) {
    return <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0b1220] text-[#9fb0d3]">Loading cards…</div>;
  }
  return (
    <CardPresenter
      deck={deck} cards={cards} backHref={back} since={since} goalMinutes={deck.goal_minutes ?? plan} initialMode={view}
      rehearse={rehearse} onSaveCard={rehearse ? saveCard : undefined}
    />
  );
}

export default function PresentPage() {
  return <Suspense fallback={null}><PresentInner /></Suspense>;
}
