"use client";
import type React from "react";
import type { Section, SectionType } from "@/lib/types";
import { SECTION_ICON, SECTION_LABEL, SECTION_FIELDS } from "@/lib/types";
import type { TimelineRow } from "@/lib/schedule";
import { formatClock } from "@/lib/dates";
import { GAMES, GAMES_BY_ID, gameLabel } from "@/lib/games";
import Confirm from "@/components/Confirm";

const FIELD_LABEL: Record<"instructions" | "script" | "discussion_questions" | "notes", string> = {
  instructions: "Instructions",
  script: "Script (what to say)",
  discussion_questions: "Discussion questions",
  notes: "Notes",
};

export default function SectionRow({
  section, index, row, expanded, dragging,
  memoryVerse, biblePassage,
  onToggle, onPatch, onMove, onDuplicate, onDelete,
  isFirst, isLast, dragHandleProps,
}: {
  section: Section;
  index: number;
  row: TimelineRow;
  expanded: boolean;
  dragging: boolean;
  memoryVerse: string | null;
  biblePassage: string | null;
  onToggle: () => void;
  onPatch: (patch: Partial<Section>) => void;
  onMove: (dir: -1 | 1) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  isFirst: boolean;
  isLast: boolean;
  dragHandleProps: { onPointerDown: (e: React.PointerEvent) => void };
}) {
  const type = section.section_type;
  const dur = section.duration_minutes ?? 0;
  const gameSub =
    type === "group_game"
      ? section.chosen_game && section.chosen_game !== "pick_at_time"
        ? gameLabel(section.chosen_game)
        : "Pick during group"
      : null;

  const focusField = (fieldId: string) => document.getElementById(fieldId)?.focus();

  const chosenReady =
    type === "group_game" &&
    section.chosen_game &&
    section.chosen_game !== "pick_at_time" &&
    (GAMES_BY_ID as any)[section.chosen_game]?.ready;

  return (
    <div id={`section-${section.id}`} className={`card overflow-hidden ${dragging ? "opacity-50" : ""}`}>
      <div className="flex items-stretch">
        <span
          {...dragHandleProps}
          role="button"
          aria-label="Drag to reorder"
          className="touch-none cursor-grab select-none text-[#9fb0d3] px-2 py-3 flex items-center"
        >
          ⠿
        </span>
        <button
          type="button"
          onClick={onToggle}
          className="flex-1 flex items-center gap-2 py-3 pr-3 text-left min-w-0"
        >
          <span className="text-[#9fb0d3] text-sm w-5 shrink-0">{index + 1}.</span>
          <span className="text-xl w-7 text-center shrink-0" aria-hidden>{SECTION_ICON[type]}</span>
          <span className="flex-1 min-w-0">
            <span className="block truncate">{section.title}</span>
            {gameSub && <span className="block text-xs text-[#9fb0d3] truncate">{gameSub}</span>}
          </span>
          <span className="text-xs font-mono text-[#9fb0d3] tabular-nums shrink-0 text-right">
            {row.startMin !== null && <span>{formatClock(row.startMin)} · </span>}
            {dur} min
          </span>
          <span className={`shrink-0 text-[#9fb0d3] transition-transform ${expanded ? "rotate-90" : ""}`} aria-hidden>›</span>
        </button>
      </div>

      {expanded && (
        <div key={`${section.id}:${type}`} className="border-t border-[#1f2a44] mt-2 pt-3 px-3 pb-3 space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label>Title</label>
              <input
                defaultValue={section.title}
                onBlur={(e) => { if (e.target.value !== section.title) onPatch({ title: e.target.value }); }}
              />
            </div>
            <div>
              <label>Type</label>
              <select
                value={type}
                onChange={(e) => onPatch({ section_type: e.target.value as SectionType })}
              >
                {Object.entries(SECTION_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label>Duration (min)</label>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              defaultValue={section.duration_minutes ?? ""}
              onBlur={(e) => {
                const v = e.target.value ? parseInt(e.target.value, 10) : null;
                if (v !== section.duration_minutes) onPatch({ duration_minutes: v });
              }}
            />
          </div>

          {/* Type-specific content */}
          {(type === "memory_verse" || type === "memory_verse_check") && (
            <div className="p-3 rounded bg-[#0b1220] border border-[#1f2a44]">
              <div className="text-xs text-[#9fb0d3]">Memory verse</div>
              {memoryVerse ? (
                <div className="italic whitespace-pre-line mt-1">{memoryVerse}</div>
              ) : (
                <div className="text-sm text-[#9fb0d3] mt-1">
                  No memory verse set yet ·{" "}
                  <button type="button" className="underline" onClick={() => focusField("memory_verse")}>Set it above</button>
                </div>
              )}
            </div>
          )}
          {type === "bible_reading" && (
            <div className="p-3 rounded bg-[#0b1220] border border-[#1f2a44]">
              <div className="text-xs text-[#9fb0d3]">Bible passage</div>
              {biblePassage ? (
                <div className="font-semibold mt-1">{biblePassage}</div>
              ) : (
                <div className="text-sm text-[#9fb0d3] mt-1">
                  No passage set yet ·{" "}
                  <button type="button" className="underline" onClick={() => focusField("bible_passage")}>Set it above</button>
                </div>
              )}
            </div>
          )}
          {type === "group_game" && (
            <div>
              <label>Game</label>
              <select
                value={section.chosen_game ?? "pick_at_time"}
                onChange={(e) => onPatch({ chosen_game: e.target.value })}
              >
                <option value="pick_at_time">Let leader pick during group</option>
                {GAMES.map((g) => (
                  <option key={g.id} value={g.id}>{g.icon} {g.label}{!g.ready ? " (coming soon)" : ""}</option>
                ))}
              </select>
              {chosenReady && (
                <div className="text-xs text-[#9fb0d3] mt-1">{(GAMES_BY_ID as any)[section.chosen_game!].short}</div>
              )}
            </div>
          )}

          {/* Detail fields for this type */}
          {SECTION_FIELDS[type].map((field) => (
            <div key={field}>
              <label>{FIELD_LABEL[field]}</label>
              <textarea
                rows={2}
                defaultValue={(section[field] as string | null) ?? ""}
                onBlur={(e) => {
                  const v = e.target.value || null;
                  if (v !== ((section[field] as string | null) ?? null)) onPatch({ [field]: v } as Partial<Section>);
                }}
              />
            </div>
          ))}

          {/* Actions */}
          <div className="flex flex-wrap gap-2 pt-1">
            <button type="button" onClick={() => onMove(-1)} disabled={isFirst} className="btn btn-ghost" aria-label="Move up">↑</button>
            <button type="button" onClick={() => onMove(1)} disabled={isLast} className="btn btn-ghost" aria-label="Move down">↓</button>
            <button type="button" onClick={onDuplicate} className="btn btn-ghost">Duplicate</button>
            <Confirm label="🗑" title="Delete section" onConfirm={onDelete} />
          </div>
        </div>
      )}
    </div>
  );
}
