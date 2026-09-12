"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import ScoreBar from "@/components/ScoreBar";

const PILLS = [
  { href: "/itineraries", icon: "📅", label: "Sundays" },
  { href: "/games", icon: "🎮", label: "Games" },
  { href: "/teams", icon: "🏆", label: "Teams" },
  { href: "/summaries", icon: "📜", label: "History" },
];

export default function TopNav() {
  const pathname = usePathname() || "/";
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Give the leader's screen and any game in progress maximum room: hide the
  // nav pills there, keep only the app name and the live scores.
  const minimal =
    pathname.includes("/lead") || pathname.includes("/games/") || pathname.includes("/baseball");

  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setMenuOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  const pill = (active: boolean) =>
    "inline-flex items-center gap-1.5 px-2.5 sm:px-3.5 py-2 rounded-full border text-[#e6ecf5] active:scale-95 transition-transform " +
    (active ? "border-blue-500 bg-[#1a2540]" : "border-[#2a3654] bg-[#121a2b]");

  return (
    <div className="sticky top-0 z-40 -mx-4 px-4 pt-3 pb-2 mb-4 bg-[#0b1220]/95 backdrop-blur border-b border-[#1f2a44]">
      <div className="flex items-center justify-between gap-2">
        <Link href="/" className="text-lg font-bold shrink-0">MS Leading</Link>
        {!minimal && (
          <nav className="flex items-center gap-1.5 sm:gap-2 text-sm font-semibold">
            {PILLS.map((p) => (
              <Link key={p.href} href={p.href} className={pill(isActive(p.href))} aria-label={p.label}>
                <span className="text-base leading-none" aria-hidden>{p.icon}</span>
                <span className="hidden sm:inline">{p.label}</span>
              </Link>
            ))}
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((o) => !o)}
                aria-label="More"
                aria-haspopup="true"
                aria-expanded={menuOpen}
                className={pill(isActive("/admin")) + " !px-2.5"}
              >
                <span className="text-base leading-none" aria-hidden>⋯</span>
              </button>
              {menuOpen && (
                <div className="absolute right-0 mt-1 w-48 card p-1 z-50 shadow-lg">
                  <Link
                    href="/admin"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-[#28345a] text-sm"
                  >
                    <span aria-hidden>❓</span> Question banks
                  </Link>
                </div>
              )}
            </div>
          </nav>
        )}
      </div>
      <ScoreBar />
    </div>
  );
}
