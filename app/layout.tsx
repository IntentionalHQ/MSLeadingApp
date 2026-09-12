import "./globals.css";
import TopNav from "@/components/nav/TopNav";
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
          <TopNav />
          {children}
        </div>
      </body>
    </html>
  );
}
