"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { CueDeck } from "@/lib/types";
import PageHeader from "@/components/PageHeader";
import { TRASH_DAYS, daysLeft, purgeOld, restoreRow } from "@/lib/trash";

// Cards tab: every cue card deck. A deck stands on its own here; a Sunday's
// Cue Cards section links to one of these by id. Decks are deleted only from
// inside their editor (into "Recently deleted" for 30 days, restorable here).
export default function CardsPage() {
  const router = useRouter();
  const [decks, setDecks] = useState<CueDeck[]>([]);
  const [trashed, setTrashed] = useState<CueDeck[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    await purgeOld("cue_decks");
    const [{ data: d }, { data: c }] = await Promise.all([
      supabase.from("cue_decks").select("*").order("updated_at", { ascending: false }),
      supabase.from("cue_cards").select("deck_id"),
    ]);
    const all = (d ?? []) as CueDeck[];
    setDecks(all.filter((x) => !x.deleted_at));
    setTrashed(all.filter((x) => x.deleted_at).sort((a, b) => b.deleted_at!.localeCompare(a.deleted_at!)));
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

  const restore = async (id: string) => { await restoreRow("cue_decks", id); load(); };

  const cardCount = (id: string) => { const n = counts[id] ?? 0; return `${n} card${n === 1 ? "" : "s"}`; };

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
                    {d.passage ? `${d.passage} · ` : ""}{cardCount(d.id)}{d.subtitle ? ` · ${d.subtitle}` : ""}
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Link href={`/cards/${d.id}`} className="btn btn-ghost">Edit</Link>
                  <Link href={`/cards/${d.id}/present`} className={"btn btn-primary" + (n === 0 ? " pointer-events-none opacity-40" : "")} aria-disabled={n === 0}>▶ Present</Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {trashed.length > 0 && (
        <div>
          <h2 className="mt-6 mb-1">Recently deleted</h2>
          <p className="text-xs text-[#9fb0d3] mb-2">Kept for {TRASH_DAYS} days, then removed for good.</p>
          <ul className="space-y-2">
            {trashed.map((d) => (
              <li key={d.id} className="card p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 opacity-80">
                <div className="min-w-0">
                  <div className="font-semibold truncate">{d.title}</div>
                  <div className="text-xs text-[#9fb0d3] truncate">
                    {d.passage ? `${d.passage} · ` : ""}{cardCount(d.id)} · {daysLeft(d.deleted_at!)} day{daysLeft(d.deleted_at!) === 1 ? "" : "s"} left
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button type="button" className="btn btn-primary" onClick={() => restore(d.id)}>↩ Restore</button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
