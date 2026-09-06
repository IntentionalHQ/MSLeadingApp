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

  const today = new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD in local time, not UTC
  const upcoming = items.filter((i) => i.scheduled_date && i.scheduled_date >= today)
                        .sort((a, b) => a.scheduled_date!.localeCompare(b.scheduled_date!));
  const hero = upcoming[0] ?? null;

  return (
    <div className="space-y-4">
      <div className="card p-4">
        <h1>Ready to lead?</h1>
        <p className="text-sm text-[#9fb0d3] mt-1">Start a Sunday, or jump straight into a game.</p>
        {hero ? (
          <>
            <div className="mt-3 text-xs uppercase text-[#9fb0d3]">{hero.scheduled_date === today ? "Today" : "Next up"} · {hero.scheduled_date}</div>
            <div className="text-xl font-bold">{hero.title}</div>
            {hero.lesson_title && <div className="text-sm text-[#9fb0d3]">{hero.lesson_title}{hero.bible_passage ? ` · ${hero.bible_passage}` : ""}</div>}
            <div className="mt-3 grid grid-cols-3 gap-2">
              <Link href={`/itineraries/${hero.id}/edit`} className="btn btn-ghost btn-lg">Edit</Link>
              <Link href={`/itineraries/${hero.id}/lead`} className="btn btn-primary btn-lg col-span-2">▶ Lead</Link>
            </div>
          </>
        ) : (
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Link href="/itineraries/new" className="btn btn-primary btn-lg w-full">➕ Plan this Sunday</Link>
            <Link href="/games" className="btn btn-ghost btn-lg w-full">🎮 Play a Game</Link>
          </div>
        )}
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
              <li key={it.id} className="py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-semibold truncate">{it.title}</div>
                  <div className="text-xs text-[#9fb0d3]">{it.scheduled_date ?? new Date(it.created_at).toLocaleDateString()}</div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Link href={`/itineraries/${it.id}/edit`} className="btn btn-ghost flex-1 sm:flex-none">Edit</Link>
                  <Link href={`/itineraries/${it.id}/lead`} className="btn btn-primary flex-1 sm:flex-none">Lead</Link>
                </div>
              </li>
            ))}
          </ul>
        )}
        <Link href="/itineraries" className="btn btn-ghost w-full mt-3">View all Sundays</Link>
      </div>

      <div className="grid grid-cols-4 gap-3">
        <Link href="/games" className="card p-4 text-center">
          <div className="text-2xl">🎮</div>
          <div className="font-semibold mt-1 text-sm">Games</div>
        </Link>
        <Link href="/teams" className="card p-4 text-center">
          <div className="text-2xl">🏆</div>
          <div className="font-semibold mt-1 text-sm">Teams</div>
        </Link>
        <Link href="/summaries" className="card p-4 text-center">
          <div className="text-2xl">📜</div>
          <div className="font-semibold mt-1 text-sm">History</div>
        </Link>
        <Link href="/admin" className="card p-4 text-center">
          <div className="text-2xl">❓</div>
          <div className="font-semibold mt-1 text-sm">Questions</div>
        </Link>
      </div>
    </div>
  );
}
