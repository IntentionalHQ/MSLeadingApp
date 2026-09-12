// Local-time date helpers. The app runs on a leader's phone in one time zone;
// all "today" logic must use local time, never UTC (toISOString is UTC).

/** YYYY-MM-DD in the browser's local time zone. */
export function todayLocal(): string {
  return new Date().toLocaleDateString("en-CA");
}

/** Parse "10:30 AM" / "10:30" / "9:05 pm" into minutes since midnight, or null. */
export function parseClock(s: string | null | undefined): number | null {
  if (!s) return null;
  const m = s.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*([ap]m?)?$/i);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const min = m[2] ? parseInt(m[2], 10) : 0;
  const ap = m[3]?.toLowerCase();
  if (h > 23 || min > 59) return null;
  if (ap?.startsWith("p") && h < 12) h += 12;
  if (ap?.startsWith("a") && h === 12) h = 0;
  return h * 60 + min;
}

/** Minutes since midnight -> "10:30 AM". */
export function formatClock(mins: number): string {
  const total = ((mins % 1440) + 1440) % 1440;
  const h24 = Math.floor(total / 60);
  const m = total % 60;
  const ap = h24 >= 12 ? "PM" : "AM";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${ap}`;
}
