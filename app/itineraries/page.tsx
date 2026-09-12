"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { todayLocal, parseClock, formatClock } from "@/lib/dates";
import PageHeader from "@/components/PageHeader";
import Confirm from "@/components/Confirm";
import type { Itinerary } from "@/lib/types";

export default function ItinerariesPage() {
  const [items, setItems] = useState<Itinerary[]>([]);
  const today = todayLocal();

  const load = async () => {
    const { data } = await supabase.from("itineraries").select("*").order("created_at", { ascending: false });
    setItems(data ?? []);
  };
  useEffect(() => { load(); }, []);

  const del = async (id: string) => {
    await supabase.from("itineraries").delete().eq("id", id);
    load();
  };

  const sundays = items.filter((i) => !i.is_template);
  const templates = items.filter((i) => i.is_template);
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
        <div className="font-semibold truncate">{it.title}</div>
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
    </div>
  );
}
