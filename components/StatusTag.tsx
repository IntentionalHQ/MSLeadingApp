import type { PlanStatus } from "@/lib/types";

// Small pill showing whether a Sunday's outline is still being worked on or is
// ready to lead. Renders nothing when no status has been set.
export default function StatusTag({ status, className = "" }: { status: PlanStatus | null | undefined; className?: string }) {
  if (status === "draft") {
    return <span className={`inline-block text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full bg-amber-900/50 text-amber-300 border border-amber-700 ${className}`}>Work in progress</span>;
  }
  if (status === "ready") {
    return <span className={`inline-block text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full bg-green-900/50 text-green-300 border border-green-700 ${className}`}>Ready to go</span>;
  }
  return null;
}
