"use client";
import GamesHub from "@/components/games/GamesHub";
import { standaloneGameRoutePath } from "@/lib/games";

export default function StandaloneGamesPage() {
  return (
    <GamesHub
      hrefFor={standaloneGameRoutePath}
      backHref="/"
      backLabel="Home"
      subtitle="Play any game on its own — no Sunday itinerary needed. Results still save to team scores."
    />
  );
}
