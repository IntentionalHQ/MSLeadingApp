"use client";
import { Suspense, useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { CueCard, CueDeck } from "@/lib/types";
import { normalizeCard } from "@/lib/cueCards";
import CardPresenter from "@/components/cards/CardPresenter";

// /cards/[id]/present?back=<href>&since=<epoch ms>&plan=<minutes>
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

  if (!deck || !cards) {
    return <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0b1220] text-[#9fb0d3]">Loading cards…</div>;
  }
  return <CardPresenter deck={deck} cards={cards} backHref={back} since={since} planMinutes={plan} />;
}

export default function PresentPage() {
  return <Suspense fallback={null}><PresentInner /></Suspense>;
}
