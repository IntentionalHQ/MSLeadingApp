"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { todayLocal, parseClock, formatClock } from "@/lib/dates";
import PageHeader from "@/components/PageHeader";
import Confirm from "@/components/Confirm";
import type { Itinerary } from "@/lib/types";
import StatusTag from "@/components/StatusTag";
import { TRASH_DAYS, daysLeft, purgeOld, restoreRow, trashRow } from "@/lib/trash";

export default function ItinerariesPage() {
  const [items, setItems] = useState<Itinerary[]>([]);
  const today = todayLocal();

  const load = async () => {
    await purgeOld("itineraries");
    const { data } = await supabase.from("itineraries").select("*").order("created_at", { ascending: false });
    setItems(data ?? []);
  };
  useEffect(() => { load(); }, []);

  // Deleting moves a Sunday to "Recently deleted" for 30 days, where it can be restored.
  const del = async (id: string) => { await trashRow("itineraries", id); load(); };
  const restore = async (id: string) => { await restoreRow("itineraries", id); load(); };

  const live = items.filter((i) => !i.deleted_at);
  const trashed = items.filter((i) => i.deleted_at).sort((a, b) => b.deleted_at!.localeCompare(a.deleted_at!));
  const sundays = live.filter((i) => !i.is_template);
  const templates = live.filter((i) => i.is_template);
  const byStart = (a: Itinerary, b: Itinerary) => (parseClock(a.start_time) ?? 9999) - (parseClock(b.start_time) ?? 9999);

  const upcoming = sundays
    .filter((i) => i.scheduled_date && i.scheduled_date >= today)
    .sort((a, b) => a.scheduled_date!.localeCompare(b.scheduled_date!) || byStart(a, b)); // soonest first, then by service time
  const past = sundays
    .filter((i) => !i.scheduled_date || i.scheduled_date < today)
    .sort((a, b) => (b.scheduled_date ?? "").localeCompare(a.scheduled_date ?? "") || byStart(a, b)); // most recent first, nulls last

  const row = (it: Itinerary, useTemplate = false) => (
    <li key={it.id} className="card p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
      <div className="min-w-0">
        <div className="font-semibold truncate flex items-center gap-2"><span className="truncate">{it.title}</span>{!useTemplate && <StatusTag status={it.status} />}</div>
        <div className="text-xs text-[#9fb0d3]">
          {it.lesson_title ?? "—"} · {it.scheduled_date ?? new Date(it.created_at).toLocaleDateString()}
          {parseClock(it.start_time) !== null && <span className="text-blue-300"> · {formatClock(parseClock(it.start_time)!)}</span>}
        </div>
      </div>
      <div className="flex gap-2 shrink-0">
        <Link href={`/itineraries/${it.id}/edit`} className="btn btn-ghost">Edit</Link>
        {useTemplate ? (
          <Link href={`/itineraries/new?from=${it.id}`} className="btn btn-primary">Use</Link>
        ) : (
          <Link href={`/itineraries/${it.id}/lead`} className="btn btn-primary">Lead</Link>
        )}
        <Confirm label="🗑" title="Delete" onConfirm={() => del(it.id)} />
      </div>
    </li>
  );

  return (
    <div className="space-y-4">
      <PageHeader title="Sundays" right={<Link href="/itineraries/new" className="btn btn-primary">+ New Sunday</Link>} />

      {upcoming.length > 0 && (
        <div>
          <h2 className="mb-2">Upcoming</h2>
          <ul className="space-y-2">{upcoming.map((it) => row(it))}</ul>
        </div>
      )}

      {past.length > 0 && (
        <div>
          <h2 className="mb-2">Past</h2>
          <ul className="space-y-2">{past.map((it) => row(it))}</ul>
        </div>
      )}

      {sundays.length === 0 && (
        <p className="text-sm text-[#9fb0d3]">No Sundays yet. Plan your first one.</p>
      )}

      {templates.length > 0 && (
        <div>
          <h2 className="mt-6 mb-2">Templates</h2>
          <ul className="space-y-2">{templates.map((it) => row(it, true))}</ul>
        </div>
      )}

      {trashed.length > 0 && (
        <div>
          <h2 className="mt-6 mb-1">Recently deleted</h2>
          <p className="text-xs text-[#9fb0d3] mb-2">Kept for {TRASH_DAYS} days, then removed for good.</p>
          <ul className="space-y-2">
            {trashed.map((it) => (
              <li key={it.id} className="card p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 opacity-80">
                <div className="min-w-0">
                  <div className="font-semibold truncate">{it.title}{it.is_template && <span className="text-xs text-[#9fb0d3] font-normal"> · template</span>}</div>
                  <div className="text-xs text-[#9fb0d3]">
                    {it.lesson_title ?? "—"} · {it.scheduled_date ?? new Date(it.created_at).toLocaleDateString()} · {daysLeft(it.deleted_at!)} day{daysLeft(it.deleted_at!) === 1 ? "" : "s"} left
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button type="button" className="btn btn-primary" onClick={() => restore(it.id)}>↩ Restore</button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
