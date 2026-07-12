import "./globals.css";
import Link from "next/link";
import ScoreBar from "@/components/ScoreBar";

export const metadata = {
  title: "MS Leading",
  description: "Middle school group leader tool",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent" as const, title: "MS Leading" },
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
};

export const viewport = { themeColor: "#0b1220" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="max-w-3xl mx-auto p-4 pb-24">
          <ScoreBar />
          <header className="flex items-center justify-between mb-4">
            <Link href="/" className="text-lg font-bold">MS Leading</Link>
            <nav className="flex gap-3 text-sm text-[#9fb0d3]">
              <Link href="/itineraries">Itineraries</Link>
              <Link href="/teams">Teams</Link>
              <Link href="/summaries">History</Link>
              <Link href="/admin/questions">Questions</Link>
            </nav>
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}
