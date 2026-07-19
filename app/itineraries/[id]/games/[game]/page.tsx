"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { GAMES_BY_ID, GameId } from "@/lib/games";

export default function GameStubPage() {
  const { id, game } = useParams<{ id: string; game: string }>();
  const def = (GAMES_BY_ID as any)[game as GameId];

  if (!def) {
    return (
      <div className="card p-6 space-y-3">
        <h1>Unknown game</h1>
        <p className="text-sm text-[#9fb0d3]">No game type matches "{game}".</p>
        <Link href={`/itineraries/${id}/games`} className="btn btn-primary">← Back to games</Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h1>
          <span className="mr-2">{def.icon}</span>{def.label}
        </h1>
        <Link href={`/itineraries/${id}/games`} className="btn btn-ghost">← All games</Link>
      </div>

      <div className="card p-4 space-y-3">
        <div>
          <div className="text-xs uppercase text-[#9fb0d3]">How to play</div>
          <p className="mt-1">{def.description}</p>
        </div>
        <div className="p-3 rounded bg-[#0b1220] border border-yellow-600 text-sm">
          🚧 This game hasn't been built yet. Framework is in place — we'll wire up
          the play screen next.
        </div>
      </div>
    </div>
  );
}
