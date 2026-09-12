"use client";
import { useRef } from "react";

// Native date field that opens the device's picker on tap anywhere in the box
// and reports each pick immediately (native pickers often don't fire blur, so
// save-on-blur alone misses them). `value` is YYYY-MM-DD or "".
export default function DateInput({
  value, onChange, id, className = "",
}: {
  value: string;
  onChange: (v: string) => void;
  id?: string;
  className?: string;
}) {
  const ref = useRef<HTMLInputElement | null>(null);
  const open = () => {
    const el = ref.current as (HTMLInputElement & { showPicker?: () => void }) | null;
    try { el?.showPicker?.(); } catch { /* not supported or not a user gesture; the field still works */ }
  };
  return (
    <input
      ref={ref}
      id={id}
      type="date"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onClick={open}
      onFocus={open}
      className={`cursor-pointer ${className}`}
    />
  );
}
