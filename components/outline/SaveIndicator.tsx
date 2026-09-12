import type { SaveState } from "./useBlurSave";
export default function SaveIndicator({ state }: { state: SaveState }) {
  if (state === "idle") return null;
  const text = state === "saving" ? "Saving…" : state === "saved" ? "Saved ✓" : "Save failed — retry";
  const cls = state === "error" ? "text-red-400" : "text-[#9fb0d3]";
  return <span className={`text-xs ${cls}`} aria-live="polite">{text}</span>;
}
