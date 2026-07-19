"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { GAMES, gameRoutePath } from "@/lib/games";

export default function GamesHubPage() {
  const { id } = useParams<{ id: string }>();

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h1>Choose a Game</h1>
        <Link href={`/itineraries/${id}/lead`} className="btn btn-ghost">← Back</Link>
      </div>
      <p className="text-sm text-[#9fb0d3]">
        All games pull from the shared Bible question bank. Pick one to play now.
      </p>

      <div className="grid gap-2">
        {GAMES.map((g) => (
          <Link
            key={g.id}
            href={gameRoutePath(id, g.id)}
            className="card p-4 hover:border-blue-500 transition-colors"
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
