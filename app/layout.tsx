import "./globals.css";
import Link from "next/link";
import ScoreBar from "@/components/ScoreBar";
import OfflineBanner from "@/components/OfflineBanner";
import TabBar from "@/components/TabBar";

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
          <header className="mb-4">
            <Link href="/" className="text-lg font-bold block mb-2">MS Leading</Link>
            <nav className="hidden sm:flex gap-4 text-sm text-[#9fb0d3] overflow-x-auto whitespace-nowrap -mx-1 px-1 pb-1">
              <Link href="/itineraries" className="shrink-0 py-1">Sundays</Link>
              <Link href="/games" className="shrink-0 py-1">Games</Link>
              <Link href="/teams" className="shrink-0 py-1">Teams</Link>
              <Link href="/summaries" className="shrink-0 py-1">History</Link>
              <Link href="/admin" className="shrink-0 py-1">Questions</Link>
            </nav>
          </header>
          {children}
        </div>
        <TabBar />
      </body>
    </html>
  );
}
