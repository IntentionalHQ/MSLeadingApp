"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { CueDeck } from "@/lib/types";
import PageHeader from "@/components/PageHeader";
import Confirm from "@/components/Confirm";

// Cards tab: every cue card deck. A deck stands on its own here; a Sunday's
// Cue Cards section links to one of these by id.
export default function CardsPage() {
  const router = useRouter();
  const [decks, setDecks] = useState<CueDeck[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const [{ data: d }, { data: c }] = await Promise.all([
      supabase.from("cue_decks").select("*").order("updated_at", { ascending: false }),
      supabase.from("cue_cards").select("deck_id"),
    ]);
    setDecks((d ?? []) as CueDeck[]);
    const n: Record<string, number> = {};
    for (const row of (c ?? []) as { deck_id: string }[]) n[row.deck_id] = (n[row.deck_id] ?? 0) + 1;
    setCounts(n);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const create = async () => {
    if (busy) return;
    setBusy(true);
    const { data } = await supabase.from("cue_decks").insert({ title: "New deck" }).select().single();
    if (data) router.push(`/cards/${(data as CueDeck).id}`);
    else setBusy(false);
  };

  const del = async (id: string) => {
    await supabase.from("cue_decks").delete().eq("id", id);
    load();
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Cue Cards"
        subtitle="Decks of stage-ready speaking cards. Link one from a Cue Cards section in any Sunday."
        right={<button type="button" className="btn btn-primary" onClick={create} disabled={busy}>{busy ? "Creating…" : "+ New deck"}</button>}
      />

      {loading ? (
        <p className="text-sm text-[#9fb0d3]">Loading…</p>
      ) : decks.length === 0 ? (
        <div className="card p-4 space-y-2">
          <p className="text-sm text-[#9fb0d3]">No decks yet. Make one, add cards, then present it from your phone.</p>
          <button type="button" className="btn btn-primary w-full" onClick={create} disabled={busy}>🃏 Make your first deck</button>
        </div>
      ) : (
        <ul className="space-y-2">
          {decks.map((d) => {
            const n = counts[d.id] ?? 0;
            return (
              <li key={d.id} className="card p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-semibold truncate">{d.title}</div>
                  <div className="text-xs text-[#9fb0d3] truncate">
                    {d.passage ? `${d.passage} · ` : ""}{n} card{n === 1 ? "" : "s"}{d.subtitle ? ` · ${d.subtitle}` : ""}
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Link href={`/cards/${d.id}`} className="btn btn-ghost">Edit</Link>
                  <Link href={`/cards/${d.id}/present`} className={"btn btn-primary" + (n === 0 ? " pointer-events-none opacity-40" : "")} aria-disabled={n === 0}>▶ Present</Link>
                  <Confirm label="🗑" title="Delete deck" confirmLabel="Delete deck" onConfirm={() => del(d.id)} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
