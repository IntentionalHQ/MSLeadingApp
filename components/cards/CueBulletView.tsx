import type { CueBullet } from "@/lib/types";
import { CUE_SYMBOLS_BY_ID, colorBg } from "@/lib/cueCards";

// One memory-trigger bullet, read-only: symbol icons on the left, highlighted
// text, quote lines italic with a left rule. Mirrors the task-os notes read view.
export default function CueBulletView({ bullet, size = "md" }: { bullet: CueBullet; size?: "sm" | "md" | "lg" }) {
  const bg = colorBg(bullet.color);
  const isQuote = bullet.symbols.includes("quote");
  const text = size === "sm" ? "text-sm leading-snug" : "leading-snug";
  const iconCls = size === "lg" ? "size-5" : "size-4";
  return (
    <li
      className="flex items-start gap-2 rounded-lg px-2.5 py-1.5"
      style={{ background: bg !== "transparent" ? bg : undefined, fontSize: size === "lg" ? "clamp(16px, 4.4vw, 21px)" : undefined }}
    >
      {bullet.symbols.length > 0 ? (
        <span className="mt-[0.2em] flex max-w-12 shrink-0 flex-wrap items-center gap-1 text-[#9fb0d3] sm:max-w-none" aria-hidden>
          {bullet.symbols.map((s) => {
            const Icon = CUE_SYMBOLS_BY_ID[s].icon;
            return <Icon key={s} className={iconCls} />;
          })}
        </span>
      ) : (
        <span className="mt-[0.55em] h-1.5 w-1.5 shrink-0 rounded-full bg-[#9fb0d3]" aria-hidden />
      )}
      <span
        className={`min-w-0 flex-1 whitespace-pre-wrap ${text}${isQuote ? " italic" : ""}`}
        style={isQuote ? { borderLeft: "3px solid #3b82f6", paddingLeft: "0.5rem" } : undefined}
      >
        {bullet.text}
      </span>
    </li>
  );
}
