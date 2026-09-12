"use client";
import { useCallback, useEffect, useRef } from "react";

// A textarea that grows to fit its content (no inner scrollbar) so long
// scripts and discussion questions are readable while editing. Accepts every
// normal textarea prop; `rows` sets the minimum height.
export default function AutoTextarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const ref = useRef<HTMLTextAreaElement | null>(null);
  const { onInput, className = "", ...rest } = props;

  const fit = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight + 2}px`;
  }, []);

  // Fit on mount and whenever the initial value changes (e.g. section remount).
  useEffect(() => { fit(); }, [fit, props.defaultValue, props.value]);

  return (
    <textarea
      ref={ref}
      {...rest}
      className={`resize-none overflow-hidden ${className}`}
      onInput={(e) => { fit(); onInput?.(e); }}
    />
  );
}
