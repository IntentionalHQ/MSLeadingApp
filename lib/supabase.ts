import { createClient } from "@supabase/supabase-js";
import { enqueue, drain } from "./offline";

// Fall back to placeholders so `createClient` doesn't throw at module load
// during Next.js pre-render if env vars aren't set.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder";

export const supabase = createClient(url, key, {
  auth: { persistSession: false },
});

// -----------------------------------------------------------------------------
// Offline replay: whenever the browser reports it's back online, drain the queue
// by re-issuing the calls against the live client.
// -----------------------------------------------------------------------------
async function replayOp(op: any) {
  const q = supabase.from(op.table);
  if (op.op === "insert") { const { error } = await q.insert(op.values); if (error) throw error; }
  else if (op.op === "upsert") { const { error } = await q.upsert(op.values); if (error) throw error; }
  else if (op.op === "update") {
    let b: any = q.update(op.values);
    for (const [k, v] of Object.entries(op.match ?? {})) b = b.eq(k, v);
    const { error } = await b; if (error) throw error;
  } else if (op.op === "delete") {
    let b: any = q.delete();
    for (const [k, v] of Object.entries(op.match ?? {})) b = b.eq(k, v);
    const { error } = await b; if (error) throw error;
  }
}

if (typeof window !== "undefined") {
  const tryDrain = () => drain(replayOp).catch(() => {});
  window.addEventListener("online", tryDrain);
  // Also drain on load in case we came back online while closed
  window.addEventListener("load", tryDrain);
}

// -----------------------------------------------------------------------------
// Wrapped safe-write helpers. Call these when it's important the write survives
// a lost connection. Reads still use `supabase.from(...).select()` directly and
// hit the service-worker's cache on failure.
// -----------------------------------------------------------------------------
export async function safeInsert(table: string, values: any) {
  try { const { error } = await supabase.from(table).insert(values); if (error) throw error; }
  catch { await enqueue({ table, op: "insert", values, ts: Date.now() }); }
}
export async function safeUpsert(table: string, values: any) {
  try { const { error } = await supabase.from(table).upsert(values); if (error) throw error; }
  catch { await enqueue({ table, op: "upsert", values, ts: Date.now() }); }
}
export async function safeUpdate(table: string, values: any, match: Record<string, any>) {
  try {
    let b: any = supabase.from(table).update(values);
    for (const [k, v] of Object.entries(match)) b = b.eq(k, v);
    const { error } = await b; if (error) throw error;
  } catch { await enqueue({ table, op: "update", values, match, ts: Date.now() }); }
}
export async function safeDelete(table: string, match: Record<string, any>) {
  try {
    let b: any = supabase.from(table).delete();
    for (const [k, v] of Object.entries(match)) b = b.eq(k, v);
    const { error } = await b; if (error) throw error;
  } catch { await enqueue({ table, op: "delete", match, ts: Date.now() }); }
}
