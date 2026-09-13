"use client";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { GAMES_BY_ID, type GameId } from "@/lib/games";
import { GAME_RULES } from "@/lib/gameRules";

// Collapsed "Rules" panel that sits at the bottom of every game screen.
// Works out which game is on screen from the URL, so it can live in a layout
// and needs no wiring inside the individual game components.
//   /games/<id>                      standalone
//   /itineraries/<id>/games/<id>     inside a Sunday
//   /itineraries/<id>/baseball       Bible Baseball's own route
export function gameIdFromPath(pathname: string): GameId | null {
  const parts = pathname.split("/").filter(Boolean);
  const last = parts[parts.length - 1];
  if (last === "baseball") return "bible_baseball";
  const i = parts.lastIndexOf("games");
  if (i === -1 || i === parts.length - 1) return null;
  const id = parts[i + 1];
  return id in GAMES_BY_ID ? (id as GameId) : null;
}

export default function GameRulesPanel() {
  const pathname = usePathname() || "";
  const [open, setOpen] = useState(false);
  const gameId = gameIdFromPath(pathname);
  const rules = gameId ? GAME_RULES[gameId] : null;
  if (!gameId || !rules) return null;
  const def = GAMES_BY_ID[gameId];

  const block = (title: string, items: string[]) => (
    <div>
      <div className="text-xs uppercase tracking-wide text-[#9fb0d3] mb-1">{title}</div>
      <ol className="space-y-1.5 text-sm list-decimal pl-5">
        {items.map((t, i) => <li key={i}>{t}</li>)}
      </ol>
    </div>
  );

  return (
    <div className="card mt-6">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-2 p-4 text-left"
      >
        <span className="font-semibold"><span className="mr-2" aria-hidden>{def.icon}</span>Rules: {def.label}</span>
        <span className={`text-[#9fb0d3] transition-transform ${open ? "rotate-90" : ""}`} aria-hidden>›</span>
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-4 border-t border-[#1f2a44] pt-3">
          <p className="text-sm text-[#9fb0d3]">{def.description}</p>
          {block("Setup", rules.setup)}
          {block("How to play", rules.play)}
          {block("Scoring", rules.scoring)}
        </div>
      )}
    </div>
  );
}
