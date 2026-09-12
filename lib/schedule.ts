import type { Section } from "./types";
import { parseClock, formatClock } from "./dates";

export type TimelineRow = { section: Section; startMin: number | null; endMin: number | null };

/** Compute each section's start from the itinerary start time + cumulative durations. */
export function buildTimeline(startTime: string | null, sections: Section[]): TimelineRow[] {
  let cursor = parseClock(startTime);
  return sections.map((section) => {
    const dur = section.duration_minutes ?? 0;
    const startMin = cursor;
    const endMin = cursor === null ? null : cursor + dur;
    if (cursor !== null) cursor += dur;
    return { section, startMin, endMin };
  });
}

export function totalMinutes(sections: Section[]): number {
  return sections.reduce((a, s) => a + (s.duration_minutes ?? 0), 0);
}

/** "10:30 AM – 11:25 AM · 55 min" or "55 min" when no start time. */
export function timelineSummary(startTime: string | null, sections: Section[]): string {
  const total = totalMinutes(sections);
  const start = parseClock(startTime);
  if (start === null) return `${total} min`;
  return `${formatClock(start)} – ${formatClock(start + total)} · ${total} min`;
}
