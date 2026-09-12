"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { GAMES_BY_ID, GameId } from "@/lib/games";
import PageHeader from "@/components/PageHeader";

export default function StandaloneGameStubPage() {
  const { game } = useParams<{ game: string }>();
  const def = (GAMES_BY_ID as any)[game as GameId];

  if (!def) {
    return (
      <div className="card p-6 space-y-3">
        <h1>Unknown game</h1>
        <p className="text-sm text-[#9fb0d3]">No game type matches "{game}".</p>
        <Link href="/games" className="btn btn-primary">← Back to games</Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <PageHeader
        title={<><span className="mr-2" aria-hidden>{def.icon}</span>{def.label}</>}
        backHref="/games"
        backLabel="All games"
      />

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
