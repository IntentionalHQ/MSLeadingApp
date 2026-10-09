"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { CueDeck } from "@/lib/types";

// Deck dropdown for a Cue Cards section: pick an existing deck, or make a new
// one (named after the lesson) and link it in one step.
export default function DeckPicker({
  value, onChange, suggestedTitle,
}: {
  value: string | null;
  onChange: (deckId: string | null) => void;
  suggestedTitle?: string | null;
}) {
  const [decks, setDecks] = useState<CueDeck[] | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.from("cue_decks").select("*").order("updated_at", { ascending: false })
      .then(({ data }) => setDecks((data ?? []) as CueDeck[]));
  }, []);

  const createAndLink = async () => {
    if (busy) return;
    setBusy(true);
    const { data } = await supabase.from("cue_decks").insert({ title: suggestedTitle?.trim() || "New deck" }).select().single();
    setBusy(false);
    if (!data) return;
    const d = data as CueDeck;
    setDecks((p) => [d, ...(p ?? [])]);
    onChange(d.id);
  };

  const current = decks?.find((d) => d.id === value) ?? null;

  return (
    <div>
      <label>Deck</label>
      <select value={value ?? ""} onChange={(e) => onChange(e.target.value || null)}>
        <option value="">— pick a deck —</option>
        {(decks ?? []).map((d) => <option key={d.id} value={d.id}>{d.title}{d.passage ? ` · ${d.passage}` : ""}</option>)}
      </select>
      <div className="mt-2 flex flex-wrap gap-2 items-center">
        {current ? (
          <>
            <Link href={`/cards/${current.id}`} className="btn btn-ghost text-sm">Open deck</Link>
            <Link href={`/cards/${current.id}/present`} className="btn btn-ghost text-sm">▶ Preview</Link>
          </>
        ) : (
          <button type="button" className="btn btn-ghost text-sm" onClick={createAndLink} disabled={busy || decks === null}>
            {busy ? "Creating…" : "+ New deck"}
          </button>
        )}
        {decks !== null && decks.length === 0 && !current && (
          <span className="text-xs text-[#9fb0d3]">No decks yet — make one here or on the Cards tab.</span>
        )}
      </div>
    </div>
  );
}
