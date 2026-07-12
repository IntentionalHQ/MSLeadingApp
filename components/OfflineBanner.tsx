"use client";
import { useEffect, useState } from "react";
import { onPendingChange, pendingCount } from "@/lib/offline";

export default function OfflineBanner() {
  const [online, setOnline] = useState(true);
  const [pending, setPending] = useState(0);

  const refresh = async () => setPending(await pendingCount().catch(() => 0));

  useEffect(() => {
    setOnline(navigator.onLine);
    const on = () => { setOnline(true); refresh(); };
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    const unsub = onPendingChange(refresh);
    refresh();
    const t = setInterval(refresh, 3000);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
      unsub();
      clearInterval(t);
    };
  }, []);

  if (online && pending === 0) return null;

  return (
    <div className={"text-center text-xs py-1 -mx-4 mb-2 " + (online ? "bg-blue-900/40 text-blue-300" : "bg-yellow-900/40 text-yellow-300")}>
      {online ? `Syncing ${pending} pending change${pending === 1 ? "" : "s"}…` : `Offline — ${pending} pending change${pending === 1 ? "" : "s"} will sync when reconnected`}
    </div>
  );
}
