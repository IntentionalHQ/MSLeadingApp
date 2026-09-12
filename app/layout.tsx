import "./globals.css";
import Link from "next/link";
import ScoreBar from "@/components/ScoreBar";
import OfflineBanner from "@/components/OfflineBanner";

export const metadata = {
  title: "MS Leading",
  description: "Middle school group leader tool",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent" as const, title: "MS Leading" },
  icons: {
    icon: [
      { url: "/favicon-32.png", type: "image/png", sizes: "32x32" },
      { url: "/icon-192.png", type: "image/png", sizes: "192x192" },
      { url: "/icon-512.png", type: "image/png", sizes: "512x512" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export const viewport = { themeColor: "#0b1220" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="max-w-3xl mx-auto p-4 pb-24">
          <OfflineBanner />
          <ScoreBar />
          <header className="sticky top-0 z-30 -mx-4 px-4 pt-3 pb-3 mb-4 bg-[#0b1220]/95 backdrop-blur border-b border-[#1f2a44]">
            <Link href="/" className="text-lg font-bold block mb-2">MS Leading</Link>
            <nav className="flex flex-wrap gap-2 text-sm font-semibold">
              <Link href="/itineraries" className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full border border-[#2a3654] bg-[#121a2b] text-[#e6ecf5] active:scale-95 transition-transform"><span className="text-base leading-none">📅</span>Sundays</Link>
              <Link href="/games" className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full border border-[#2a3654] bg-[#121a2b] text-[#e6ecf5] active:scale-95 transition-transform"><span className="text-base leading-none">🎮</span>Games</Link>
              <Link href="/teams" className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full border border-[#2a3654] bg-[#121a2b] text-[#e6ecf5] active:scale-95 transition-transform"><span className="text-base leading-none">🏆</span>Teams</Link>
              <Link href="/summaries" className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full border border-[#2a3654] bg-[#121a2b] text-[#e6ecf5] active:scale-95 transition-transform"><span className="text-base leading-none">📜</span>History</Link>
              <Link href="/admin" className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full border border-[#2a3654] bg-[#121a2b] text-[#e6ecf5] active:scale-95 transition-transform"><span className="text-base leading-none">❓</span>Questions</Link>
            </nav>
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}
