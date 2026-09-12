"use client";
import Link from "next/link";
import { GAMES } from "@/lib/games";
import PageHeader from "@/components/PageHeader";

// Shared game picker. `hrefFor` maps a game id to its play route so the same
// hub works both inside an itinerary and standalone. `backHref`/`backLabel`
// are optional (standalone hub has no "back").
export default function GamesHub({
  hrefFor,
  backHref,
  backLabel = "Back",
  subtitle = "All games pull from the shared Bible question bank. Pick one to play now.",
}: {
  hrefFor: (id: string) => string;
  backHref?: string;
  backLabel?: string;
  subtitle?: string;
}) {
  const ready = GAMES.filter((g) => g.ready);
  const comingSoon = GAMES.filter((g) => !g.ready);
  // PageHeader draws its own ← arrow; tolerate callers that still pass one.
  const cleanBack = backLabel.replace(/^←\s*/, "");

  return (
    <div className="space-y-3">
      <PageHeader title="Choose a Game" subtitle={subtitle} backHref={backHref} backLabel={cleanBack} />

      <div className="grid gap-2">
        {ready.map((g) => (
          <Link
            key={g.id}
            href={hrefFor(g.id)}
            className="card p-4 transition-colors hover:border-blue-500"
          >
            <div className="flex items-start gap-3">
              <div className="text-3xl leading-none">{g.icon}</div>
              <div className="flex-1">
                <div className="font-bold text-lg">{g.label}</div>
                <div className="text-sm text-[#9fb0d3] mt-1">{g.short}</div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {comingSoon.length > 0 && (
        <details className="card p-3">
          <summary className="text-sm text-[#9fb0d3] cursor-pointer">Coming soon ({comingSoon.length})</summary>
          <ul className="mt-2 space-y-1.5">
            {comingSoon.map((g) => (
              <li key={g.id} className="text-sm text-[#9fb0d3]">
                <span className="mr-1" aria-hidden>{g.icon}</span>{g.label} — {g.short}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
