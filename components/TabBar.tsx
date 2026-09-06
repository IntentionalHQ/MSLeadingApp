"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  ["/", "🏠", "Home"],
  ["/itineraries", "📅", "Sundays"],
  ["/games", "🎮", "Games"],
  ["/teams", "🏆", "Teams"],
  ["/summaries", "📜", "History"],
] as const;

export default function TabBar() {
  const path = usePathname() ?? "/";
  // Leader Mode and games own the bottom of the screen; stay out of their way.
  if (/\/lead$|\/games\/[^/]+$|\/baseball$/.test(path)) return null;
  return (
    <nav className="sm:hidden fixed bottom-0 inset-x-0 z-40 bg-[#0b1220]/95 backdrop-blur border-t border-[#1f2a44]">
      <div className="grid grid-cols-5 max-w-3xl mx-auto">
        {TABS.map(([href, icon, label]) => {
          const active = href === "/" ? path === "/" : path.startsWith(href);
          return (
            <Link key={href} href={href}
              className={"flex flex-col items-center py-2 text-[11px] " + (active ? "text-blue-300" : "text-[#9fb0d3]")}>
              <span className="text-xl leading-none">{icon}</span>
              <span className="mt-1">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
