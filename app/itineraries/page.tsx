"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Itinerary } from "@/lib/types";

export default function ItinerariesPage() {
  const [items, setItems] = useState<Itinerary[]>([]);

  const load = async () => {
    const { data } = await supabase.from("itineraries").select("*").order("created_at", { ascending: false });
    setItems(data ?? []);
  };
  useEffect(() => { load(); }, []);

  const del = async (id: string) => {
    if (!confirm("Delete this itinerary?")) return;
    await supabase.from("itineraries").delete().eq("id", id);
    load();
  };

  const sundays = items.filter((i) => !i.is_template);
  const templates = items.filter((i) => i.is_template);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1>Sundays</h1>
        <Link href="/itineraries/new" className="btn btn-primary">+ New Sunday</Link>
      </div>
      <ul className="space-y-2">
        {sundays.map((it) => (
          <li key={it.id} className="card p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <div className="font-semibold">{it.title}</div>
              <div className="text-xs text-[#9fb0d3]">
                {it.lesson_title ?? "—"} · {it.scheduled_date ?? new Date(it.created_at).toLocaleDateString()}
              </div>
            </div>
            <div className="flex gap-2">
              <Link href={`/itineraries/${it.id}/edit`} className="btn btn-ghost">Edit</Link>
              <Link href={`/itineraries/${it.id}/lead`} className="btn btn-primary">Lead</Link>
              <button onClick={() => del(it.id)} className="btn btn-ghost">🗑</button>
            </div>
          </li>
        ))}
      </ul>

      {templates.length > 0 && (
        <>
          <h2 className="mt-6">Templates</h2>
          <ul className="space-y-2">
            {templates.map((it) => (
              <li key={it.id} className="card p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <div className="font-semibold">{it.title}</div>
                  <div className="text-xs text-[#9fb0d3]">
                    {it.lesson_title ?? "—"} · {it.scheduled_date ?? new Date(it.created_at).toLocaleDateString()}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Link href={`/itineraries/${it.id}/edit`} className="btn btn-ghost">Edit</Link>
                  <Link href="/itineraries/new" className="btn btn-primary">Use</Link>
                  <button onClick={() => del(it.id)} className="btn btn-ghost">🗑</button>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
