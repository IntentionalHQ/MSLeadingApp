"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type BankStat = { count: number; loading: boolean };

const BANKS: {
  href: string;
  icon: string;
  title: string;
  subtitle: string;
  table: string;
  usedBy: string[];
}[] = [
  {
    href: "/admin/questions",
    icon: "⚾",
    title: "Baseball Questions",
    subtitle: "Multiple-choice and open answer questions with singles / doubles / triples / home runs.",
    table: "questions",
    usedBy: ["Bible Baseball"],
  },
  {
    href: "/admin/prompts",
    icon: "🎨",
    title: "Word & Drawing Prompts",
    subtitle: "Shared bank of Bible words, names, places, stories used by drawing and word games.",
    table: "game_prompts",
    usedBy: ["Bible Pictionary", "Bible Hangman", "Bible Taboo (future)"],
  },
  {
    href: "/admin/pir",
    icon: "🎯",
    title: "Price Is Right Questions",
    subtitle: "Numeric-answer Bible trivia — targets, ranges, references, and category.",
    table: "pir_questions",
    usedBy: ["Bible Price Is Right"],
  },
];

export default function AdminHubPage() {
  const [stats, setStats] = useState<Record<string, BankStat>>(() =>
    Object.fromEntries(BANKS.map((b) => [b.table, { count: 0, loading: true }]))
  );

  useEffect(() => {
    (async () => {
      const results = await Promise.all(
        BANKS.map(async (b) => {
          const { count, error } = await supabase.from(b.table).select("*", { count: "exact", head: true });
          return [b.table, { count: error ? -1 : (count ?? 0), loading: false }] as const;
        })
      );
      setStats(Object.fromEntries(results));
    })();
  }, []);

  return (
    <div className="space-y-3">
      <div>
        <h1>Question Banks</h1>
        <p className="text-sm text-[#9fb0d3]">
          Add, edit, or disable questions for any game. Changes save directly to Supabase.
        </p>
      </div>

      <div className="grid gap-2">
        {BANKS.map((b) => {
          const s = stats[b.table];
          return (
            <Link key={b.table} href={b.href} className="card p-4 hover:border-blue-500 transition-colors">
              <div className="flex items-start gap-3">
                <div className="text-3xl leading-none">{b.icon}</div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <div className="font-bold text-lg">{b.title}</div>
                    <span className="text-xs px-2 py-0.5 rounded bg-[#1f2a44] text-[#9fb0d3]">
                      {s?.loading ? "…" : s?.count === -1 ? "table not created" : `${s?.count} entries`}
                    </span>
                  </div>
                  <div className="text-sm text-[#9fb0d3] mt-1">{b.subtitle}</div>
                  <div className="text-xs text-[#9fb0d3] mt-2">
                    Used by: {b.usedBy.join(", ")}
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
