"use client";
import Link from "next/link";
import { GAMES } from "@/lib/games";

// Shared game picker. `hrefFor` maps a game id to its play route so the same
// hub works both inside an itinerary and standalone. `backHref`/`backLabel`
// are optional (standalone hub has no "back").
export default function GamesHub({
  hrefFor,
  backHref,
  backLabel = "← Back",
  subtitle = "All games pull from the shared Bible question bank. Pick one to play now.",
}: {
  hrefFor: (id: string) => string;
  backHref?: string;
  backLabel?: string;
  subtitle?: string;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h1>Choose a Game</h1>
        {backHref && (
          <Link href={backHref} className="btn btn-ghost">{backLabel}</Link>
        )}
      </div>
      <p className="text-sm text-[#9fb0d3]">{subtitle}</p>

      <div className="grid gap-2">
        {[...GAMES].sort((a, b) => Number(b.ready) - Number(a.ready)).map((g) => (
          <Link
            key={g.id}
            href={hrefFor(g.id)}
            className={"card p-4 transition-colors " + (g.ready ? "hover:border-blue-500" : "opacity-50 pointer-events-none")}
          >
            <div className="flex items-start gap-3">
              <div className="text-3xl leading-none">{g.icon}</div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <div className="font-bold text-lg">{g.label}</div>
                  {!g.ready && (
                    <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded bg-[#1f2a44] text-[#9fb0d3]">
                      Coming soon
                    </span>
                  )}
                </div>
                <div className="text-sm text-[#9fb0d3] mt-1">{g.short}</div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
