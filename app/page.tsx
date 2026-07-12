"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Itinerary } from "@/lib/types";

export default function Home() {
  const [items, setItems] = useState<Itinerary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("itineraries")
        .select("*")
        .eq("is_template", false)
        .order("created_at", { ascending: false })
        .limit(6);
      setItems(data ?? []);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="space-y-4">
      <div className="card p-4">
        <h1>Ready to lead?</h1>
        <p className="text-sm text-[#9fb0d3] mt-1">Pick a Sunday, or start a new one.</p>
        <div className="mt-3 flex gap-2">
          <Link href="/itineraries/new" className="btn btn-primary">+ New Sunday</Link>
          <Link href="/itineraries" className="btn btn-ghost">All Itineraries</Link>
        </div>
      </div>

      <div className="card p-4">
        <h2>Recent Sundays</h2>
        {loading ? (
          <p className="text-sm text-[#9fb0d3] mt-2">Loading…</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-[#9fb0d3] mt-2">None yet. Create your first one above.</p>
        ) : (
          <ul className="mt-2 divide-y divide-[#1f2a44]">
            {items.map((it) => (
              <li key={it.id} className="py-2 flex items-center justify-between">
                <div>
                  <div className="font-semibold">{it.title}</div>
                  <div className="text-xs text-[#9fb0d3]">{it.scheduled_date ?? new Date(it.created_at).toLocaleDateString()}</div>
                </div>
                <div className="flex gap-2">
                  <Link href={`/itineraries/${it.id}/edit`} className="btn btn-ghost">Edit</Link>
                  <Link href={`/itineraries/${it.id}/lead`} className="btn btn-primary">Lead</Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Link href="/teams" className="card p-4 text-center">
          <div className="text-2xl">🏆</div>
          <div className="font-semibold mt-1">Teams</div>
        </Link>
        <Link href="/summaries" className="card p-4 text-center">
          <div className="text-2xl">📜</div>
          <div className="font-semibold mt-1">History</div>
        </Link>
      </div>
    </div>
  );
}
