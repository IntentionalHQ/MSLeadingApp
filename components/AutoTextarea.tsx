"use client";
import { useCallback, useEffect, useRef } from "react";

// A textarea that grows to fit its content (no inner scrollbar) so long
// scripts and discussion questions are readable while editing. Accepts every
// normal textarea prop; `rows` sets the minimum height.
export default function AutoTextarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const ref = useRef<HTMLTextAreaElement | null>(null);
  const { onInput, onBlur, className = "", ...rest } = props;

  // Full measure: collapse, read scrollHeight, set. Collapsing shortens the
  // page for a frame and the browser scrolls to compensate, so pin the scroll
  // position across it. Only used on mount and on blur.
  const fit = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const x = window.scrollX, y = window.scrollY;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight + 2}px`;
    if (window.scrollX !== x || window.scrollY !== y) window.scrollTo(x, y);
  }, []);

  // While typing only ever grow. Growing never moves the caret or the page;
  // shrinking waits for blur so a backspace can't cause a jump.
  const grow = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    if (el.scrollHeight > el.clientHeight) el.style.height = `${el.scrollHeight + 2}px`;
  }, []);

  // Fit on mount and whenever the initial value changes (e.g. section remount).
  useEffect(() => { fit(); }, [fit, props.defaultValue, props.value]);

  return (
    <textarea
      ref={ref}
      {...rest}
      className={`resize-none overflow-hidden ${className}`}
      onInput={(e) => { grow(); onInput?.(e); }}
      onBlur={(e) => { fit(); onBlur?.(e); }}
    />
  );
}
