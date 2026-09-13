"use client";
import type { SectionType } from "@/lib/types";
import { SECTION_ICON, SECTION_PALETTE_ORDER } from "@/lib/types";

// Short chip labels — the palette is a quick "add" row, not the full type name.
const PALETTE_LABEL: Record<SectionType, string> = {
  free_hangout: "Hangout",
  rules: "Rules",
  memory_verse: "Verse",
  memory_verse_check: "Verse Check",
  bible_reading: "Reading",
  devotional: "Devotional",
  discussion: "Discussion",
  prayer: "Prayer",
  group_game: "Game",
  score_recording: "Scores",
  custom: "Custom",
};

export default function SectionPalette({ onAdd }: { onAdd: (type: SectionType) => void }) {
  return (
    <div className="card p-3">
      <div className="text-sm text-[#9fb0d3] mb-2">Add a section:</div>
      <div className="flex flex-wrap gap-2">
        {SECTION_PALETTE_ORDER.map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => onAdd(type)}
            className="btn btn-ghost text-sm px-3 py-2"
          >
            <span className="mr-1" aria-hidden>{SECTION_ICON[type]}</span>
            {PALETTE_LABEL[type]}
          </button>
        ))}
      </div>
    </div>
  );
}
