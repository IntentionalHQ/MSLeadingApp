"use client";
import { useEffect, useState } from "react";

export default function Confirm({
  label, confirmLabel = "Yes, delete", onConfirm, className = "btn btn-ghost", title,
}: {
  label: React.ReactNode;          // what the idle button shows, e.g. "🗑"
  confirmLabel?: string;
  onConfirm: () => void | Promise<void>;
  className?: string;              // classes for the idle button
  title?: string;                  // aria-label / tooltip for icon-only buttons
}) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 4000);
    return () => clearTimeout(t);
  }, [armed]);

  if (!armed) {
    return <button type="button" onClick={() => setArmed(true)} className={className} aria-label={title} title={title}>{label}</button>;
  }
  return (
    <span className="inline-flex gap-1">
      <button type="button" onClick={async () => { await onConfirm(); setArmed(false); }} className="btn btn-danger">{confirmLabel}</button>
      <button type="button" onClick={() => setArmed(false)} className="btn btn-ghost">Cancel</button>
    </span>
  );
}
