"use client";
import type { Section } from "@/lib/types";
import { timelineSummary, totalMinutes } from "@/lib/schedule";

export default function TimelineFooter({
  startTime, slotMinutes, sections,
}: {
  startTime: string | null;
  slotMinutes: number | null;
  sections: Section[];
}) {
  const total = totalMinutes(sections);
  const over = slotMinutes != null && total > slotMinutes;
  return (
    <div className="sticky bottom-0 z-30 card p-3 mt-2 bg-[#121a2b]/95 backdrop-blur">
      <div className={`text-sm font-mono tabular-nums ${over ? "text-amber-400" : "text-[#e6ecf5]"}`}>
        {timelineSummary(startTime, sections)}
        {over && ` · ${total - (slotMinutes ?? 0)} min over`}
      </div>
    </div>
  );
}
