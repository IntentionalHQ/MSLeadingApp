"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { todayLocal } from "@/lib/dates";
import type { Itinerary } from "@/lib/types";

function heroLabel(date: string, today: string): { text: string; cls: string } {
  if (date === today) return { text: "Today", cls: "text-green-400" };
  const diffDays = Math.round(
    (Date.parse(date + "T00:00:00") - Date.parse(today + "T00:00:00")) / 86400000
  );
  if (diffDays <= 7) return { text: "This Sunday", cls: "text-[#9fb0d3]" };
  return { text: "Next up", cls: "text-[#9fb0d3]" };
}

export default function Home() {
  const [hero, setHero] = useState<Itinerary | null>(null);
  const [recent, setRecent] = useState<Itinerary[]>([]);
  const [loading, setLoading] = useState(true);
  const today = todayLocal();

  useEffect(() => {
    (async () => {
      const [{ data: up }, { data: rec }] = await Promise.all([
        supabase
          .from("itineraries")
          .select("*")
          .gte("scheduled_date", today)
          .eq("is_template", false)
          .order("scheduled_date")
          .limit(1),
        supabase
          .from("itineraries")
          .select("*")
          .eq("is_template", false)
          .order("scheduled_date", { ascending: false, nullsFirst: false })
          .limit(6),
      ]);
      setHero(up?.[0] ?? null);
      setRecent(rec ?? []);
      setLoading(false);
    })();
  }, [today]);

  const label = hero?.scheduled_date ? heroLabel(hero.scheduled_date, today) : null;

  return (
    <div className="space-y-4">
      <div className="card p-4">
        <h1>Ready to lead?</h1>
        <p className="text-sm text-[#9fb0d3] mt-1">Start a Sunday, or jump straight into a game.</p>
        {hero ? (
          <>
            <div className="mt-3 text-xs uppercase">
              {label && <span className={label.cls}>{label.text}</span>}
              {hero.scheduled_date ? <span className="text-[#9fb0d3]"> · {hero.scheduled_date}</span> : null}
            </div>
            <div className="text-xl font-bold">{hero.title}</div>
            {hero.lesson_title && (
              <div className="text-sm text-[#9fb0d3]">
                {hero.lesson_title}{hero.bible_passage ? ` · ${hero.bible_passage}` : ""}
              </div>
            )}
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
        ) : recent.length === 0 ? (
          <div className="mt-2">
            <p className="text-sm text-[#9fb0d3]">No Sundays yet. Plan your first one.</p>
            <Link href="/itineraries/new" className="btn btn-primary w-full mt-3">➕ Plan this Sunday</Link>
          </div>
        ) : (
          <ul className="mt-2 divide-y divide-[#1f2a44]">
            {recent.map((it) => (
              <li key={it.id} className="py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-semibold truncate">{it.title}</div>
                  {it.lesson_title && <div className="text-xs text-[#9fb0d3] truncate">{it.lesson_title}</div>}
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
    </div>
  );
}
