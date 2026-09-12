"use client";
import { useEffect, useRef, useState } from "react";
import type { Itinerary, Section } from "@/lib/types";
import { SECTION_ICON } from "@/lib/types";
import { buildTemplate, parseTemplate, type ParsedPlan, type PastOutline } from "@/lib/planXlsx";

// "Excel Template" button next to Lead. Download = a workbook with the current
// draft, the last four Sundays, and instructions anyone (a person or an AI
// assistant) can follow to fill it in. Upload = parse a filled-in template in
// the browser and replace this Sunday's outline.
// The uploaded file is never sent or stored anywhere.
export default function PlanFileMenu({
  itinerary, sections, loadPast, onApply,
}: {
  itinerary: Itinerary;
  sections: Section[];
  loadPast: () => Promise<PastOutline[]>;
  onApply: (plan: ParsedPlan) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<"download" | "parse" | "apply" | null>(null);
  const [preview, setPreview] = useState<ParsedPlan | null>(null);
  const [fileName, setFileName] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open]);

  const download = async () => {
    setOpen(false);
    setErr(null);
    setBusy("download");
    try {
      const past = await loadPast();
      const bytes = await buildTemplate(itinerary, sections, past);
      const blob = new Blob([bytes], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const date = itinerary.scheduled_date ?? "plan";
      a.href = url;
      a.download = `sunday-plan-${date}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    } catch (e: any) {
      setErr(e?.message ?? "Could not build the template.");
    } finally {
      setBusy(null);
    }
  };

  const pickFile = () => { setOpen(false); fileRef.current?.click(); };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file
    if (!f) return;
    setErr(null);
    setFileName(f.name);
    setBusy("parse");
    try {
      const plan = await parseTemplate(await f.arrayBuffer());
      setPreview(plan);
    } catch (e: any) {
      setErr(e?.message ?? "Could not read that file.");
    } finally {
      setBusy(null);
    }
  };

  const apply = async () => {
    if (!preview || preview.errors.length) return;
    setBusy("apply");
    try {
      await onApply(preview);
      setPreview(null);
    } catch (e: any) {
      setErr(e?.message ?? "Could not apply the plan.");
    } finally {
      setBusy(null);
    }
  };

  const total = preview ? preview.sections.reduce((a, s) => a + (s.duration_minutes ?? 0), 0) : 0;

  return (
    <>
      <div className="relative" ref={menuRef}>
        <button type="button" className="btn btn-ghost" onClick={() => setOpen((o) => !o)} disabled={busy !== null} aria-haspopup="true" aria-expanded={open}>
          {busy === "download" ? "Building…" : busy === "parse" ? "Reading…" : "📊 Excel Template"}
        </button>
        {open && (
          <div className="absolute right-0 mt-1 w-72 card p-1 z-50">
            <button type="button" className="btn btn-ghost w-full justify-start text-left" onClick={download}>
              <span className="mr-2" aria-hidden>⬇️</span>
              <span>
                <span className="block">Download template</span>
                <span className="block text-xs text-[#9fb0d3] font-normal">This Sunday as a spreadsheet, plus your last 4 Sundays for reference</span>
              </span>
            </button>
            <button type="button" className="btn btn-ghost w-full justify-start text-left" onClick={pickFile}>
              <span className="mr-2" aria-hidden>⬆️</span>
              <span>
                <span className="block">Upload completed template</span>
                <span className="block text-xs text-[#9fb0d3] font-normal">Replaces this Sunday's outline. File is not saved anywhere.</span>
              </span>
            </button>
          </div>
        )}
        <input ref={fileRef} type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="hidden" onChange={onFile} />
      </div>

      {err && <div className="text-sm text-red-400 mt-2">{err}</div>}

      {preview && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="card p-4 w-full max-w-lg space-y-3 max-h-[90vh] overflow-y-auto">
            <div>
              <h2>Import outline</h2>
              <div className="text-xs text-[#9fb0d3] truncate">{fileName}</div>
            </div>

            {preview.errors.length > 0 && (
              <div className="p-3 rounded bg-[#0b1220] border border-red-600 text-sm space-y-1">
                <div className="text-red-400 font-semibold">Can't import this file:</div>
                {preview.errors.map((m, i) => <div key={i}>{m}</div>)}
              </div>
            )}
            {preview.warnings.length > 0 && (
              <div className="p-3 rounded bg-[#0b1220] border border-amber-600 text-sm space-y-1">
                <div className="text-amber-400 font-semibold">Heads up:</div>
                {preview.warnings.map((m, i) => <div key={i}>{m}</div>)}
              </div>
            )}

            {preview.errors.length === 0 && (
              <>
                <div className="text-sm space-y-0.5">
                  {preview.itinerary.title && <div><span className="text-[#9fb0d3]">Title:</span> {preview.itinerary.title}</div>}
                  {preview.itinerary.scheduled_date && <div><span className="text-[#9fb0d3]">Date:</span> {preview.itinerary.scheduled_date}{preview.itinerary.start_time ? ` · ${preview.itinerary.start_time}` : ""}</div>}
                  {preview.itinerary.lesson_title && <div><span className="text-[#9fb0d3]">Lesson:</span> {preview.itinerary.lesson_title}</div>}
                  {preview.itinerary.bible_passage && <div><span className="text-[#9fb0d3]">Passage:</span> {preview.itinerary.bible_passage}</div>}
                  {preview.itinerary.memory_verse && <div><span className="text-[#9fb0d3]">Verse:</span> <span className="italic">{preview.itinerary.memory_verse.slice(0, 120)}{preview.itinerary.memory_verse.length > 120 ? "…" : ""}</span></div>}
                </div>
                <div className="card p-3">
                  <div className="text-xs text-[#9fb0d3] mb-1">{preview.sections.length} sections · {total} min</div>
                  <ol className="text-sm space-y-0.5">
                    {preview.sections.map((s, i) => (
                      <li key={i} className="flex justify-between gap-2">
                        <span className="truncate"><span className="mr-1" aria-hidden>{SECTION_ICON[s.section_type]}</span>{s.title}</span>
                        <span className="text-[#9fb0d3] font-mono tabular-nums shrink-0">{s.duration_minutes ?? 0} min</span>
                      </li>
                    ))}
                  </ol>
                </div>
                <p className="text-xs text-[#9fb0d3]">
                  This replaces all {sections.length} current section{sections.length === 1 ? "" : "s"} on this Sunday. Fields left blank in the file keep their current value.
                </p>
              </>
            )}

            <div className="flex gap-2 justify-end">
              <button type="button" className="btn btn-ghost" onClick={() => setPreview(null)} disabled={busy === "apply"}>Cancel</button>
              {preview.errors.length === 0 && (
                <button type="button" className="btn btn-primary" onClick={apply} disabled={busy === "apply"}>{busy === "apply" ? "Importing…" : "Replace outline"}</button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
