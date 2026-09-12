"use client";
import { useCallback, useEffect, useRef, useState } from "react";

export type SaveState = "idle" | "saving" | "saved" | "error";

/** Shared "Saved ✓" indicator state for a page. Call `track(promise)` around any write. */
export function useSaveState() {
  const [state, setState] = useState<SaveState>("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const track = useCallback(async <T,>(p: Promise<{ error: unknown } | T>) => {
    setState("saving");
    try {
      const r: any = await p;
      if (r && r.error) throw r.error;
      setState("saved");
    } catch {
      setState("error");
    }
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setState("idle"), 1800);
  }, []);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  return { state, track };
}
