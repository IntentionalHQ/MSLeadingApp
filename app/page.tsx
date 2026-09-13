"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { todayLocal, parseClock, formatClock } from "@/lib/dates";
import type { Itinerary } from "@/lib/types";
import StatusTag from "@/components/StatusTag";

function heroLabel(date: string, today: string): { text: string; cls: string } {
  if (date === today) return { text: "Today", cls: "text-green-400" };
  const diffDays = Math.round(
    (Date.parse(date + "T00:00:00") - Date.parse(today + "T00:00:00")) / 86400000
  );
  if (diffDays <= 7) return { text: "This Sunday", cls: "text-[#9fb0d3]" };
  return { text: "Next up", cls: "text-[#9fb0d3]" };
}

export default function Home() {
  const [heroes, setHeroes] = useState<Itinerary[]>([]); // every service on the next upcoming date
  const [upcoming, setUpcoming] = useState<Itinerary[]>([]); // future Sundays after the hero date
  const [past, setPast] = useState<Itinerary[]>([]);         // most recent Sundays already gone
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
          .limit(12),
        supabase
          .from("itineraries")
          .select("*")
          .eq("is_template", false)
          .lt("scheduled_date", today)
          .order("scheduled_date", { ascending: false })
          .limit(5),
      ]);
      const all = ((up ?? []) as Itinerary[]);
      const first = all[0]?.scheduled_date;
      const byStart = (a: Itinerary, b: Itinerary) => (parseClock(a.start_time) ?? 9999) - (parseClock(b.start_time) ?? 9999);
      const sameDay = all.filter((i) => i.scheduled_date === first).sort(byStart);
      const later = all.filter((i) => i.scheduled_date !== first).sort((a, b) => a.scheduled_date!.localeCompare(b.scheduled_date!) || byStart(a, b));
      setHeroes(sameDay);
      setUpcoming(later);
      setPast((rec ?? []) as Itinerary[]);
      setLoading(false);
    })();
  }, [today]);

  const hero = heroes[0] ?? null;
  const label = hero?.scheduled_date ? heroLabel(hero.scheduled_date, today) : null;

  const row = (it: Itinerary) => (
    <li key={it.id} className="py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
      <div className="min-w-0">
        <div className="font-semibold truncate flex items-center gap-2"><span className="truncate">{it.title}</span><StatusTag status={it.status} /></div>
        {it.lesson_title && <div className="text-xs text-[#9fb0d3] truncate">{it.lesson_title}</div>}
        <div className="text-xs text-[#9fb0d3]">
          {it.scheduled_date ?? new Date(it.created_at).toLocaleDateString()}
          {parseClock(it.start_time) !== null && <span className="text-blue-300"> · {formatClock(parseClock(it.start_time)!)}</span>}
        </div>
      </div>
      <div className="flex gap-2 shrink-0">
        <Link href={`/itineraries/${it.id}/edit`} className="btn btn-ghost flex-1 sm:flex-none">Edit</Link>
        <Link href={`/itineraries/${it.id}/lead`} className="btn btn-primary flex-1 sm:flex-none">Lead</Link>
      </div>
    </li>
  );

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
            {heroes.length > 1 && (
              <div className="text-xs text-[#9fb0d3] mt-0.5">{heroes.length} services</div>
            )}
            <div className={heroes.length > 1 ? "mt-2 space-y-2" : ""}>
              {heroes.map((h) => (
                <div key={h.id} className={heroes.length > 1 ? "p-3 rounded-lg bg-[#0b1220] border border-[#1f2a44]" : ""}>
                  <div className="text-xl font-bold flex items-center gap-2 flex-wrap">
                    <span>
                      {parseClock(h.start_time) !== null && <span className="text-blue-300 font-mono tabular-nums mr-2">{formatClock(parseClock(h.start_time)!)}</span>}
                      {h.title}
                    </span>
                    <StatusTag status={h.status} />
                  </div>
                  {h.lesson_title && (
                    <div className="text-sm text-[#9fb0d3]">
                      {h.lesson_title}{h.bible_passage ? ` · ${h.bible_passage}` : ""}
                    </div>
                  )}
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <Link href={`/itineraries/${h.id}/edit`} className="btn btn-ghost btn-lg">Edit</Link>
                    <Link href={`/itineraries/${h.id}/lead`} className="btn btn-primary btn-lg col-span-2">▶ Lead</Link>
                  </div>
                </div>
              ))}
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
        <h2>Upcoming Sundays</h2>
        {loading ? (
          <p className="text-sm text-[#9fb0d3] mt-2">Loading…</p>
        ) : upcoming.length === 0 ? (
          <div className="mt-2">
            <p className="text-sm text-[#9fb0d3]">{hero ? "Nothing planned after the next one yet." : "Nothing planned yet."}</p>
            <Link href="/itineraries/new" className="btn btn-primary w-full mt-3">➕ Plan a Sunday</Link>
          </div>
        ) : (
          <ul className="mt-2 divide-y divide-[#1f2a44]">{upcoming.map((it) => row(it))}</ul>
        )}
      </div>

      <div className="card p-4">
        <h2>Recent Sundays</h2>
        {loading ? (
          <p className="text-sm text-[#9fb0d3] mt-2">Loading…</p>
        ) : past.length === 0 ? (
          <p className="text-sm text-[#9fb0d3] mt-2">No past Sundays yet.</p>
        ) : (
          <ul className="mt-2 divide-y divide-[#1f2a44]">{past.map((it) => row(it))}</ul>
        )}
        <Link href="/itineraries" className="btn btn-ghost w-full mt-3">View all Sundays</Link>
      </div>
    </div>
  );
}
