// Simple offline write queue backed by IndexedDB.
// Any Supabase write we wrap here becomes:
//   - executed immediately if online (or best-effort);
//   - queued if the request throws (offline / network error);
//   - replayed FIFO when the "online" event fires.
//
// Trade-offs (be honest with yourself):
//  * This is last-write-wins per row, not a real CRDT. Two devices editing the
//    same row while both offline: whichever syncs last overwrites the other.
//  * Score increments are applied as "insert score_event + update team.total_score".
//    When queued, we replay them in order — so two devices offline each incrementing
//    a team's score will both apply their delta as separate score_events, but the
//    team.total_score will be whichever total the last-replayed device sent.
//  * For a single-leader single-device Sunday, this behaves correctly.

const DB_NAME = "msleading";
const STORE = "writeQueue";

type QueuedOp = {
  id?: number;
  ts: number;
  table: string;
  op: "insert" | "update" | "delete" | "upsert";
  values?: any;
  match?: Record<string, any>;
};

let dbPromise: Promise<IDBDatabase> | null = null;
function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE, { keyPath: "id", autoIncrement: true });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T> | Promise<T>): Promise<T> {
  const db = await openDb();
  return new Promise<T>((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const s = t.objectStore(STORE);
    const r = fn(s);
    if (r instanceof IDBRequest) {
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    } else {
      Promise.resolve(r).then(resolve, reject);
    }
  });
}

export async function enqueue(op: QueuedOp) {
  await tx("readwrite", (s) => s.add({ ...op, ts: Date.now() }));
  notifyPendingChange();
}

export async function pendingCount(): Promise<number> {
  return tx("readonly", (s) => s.count());
}

export async function drain(runOp: (op: QueuedOp) => Promise<void>) {
  const db = await openDb();
  const all: QueuedOp[] = await new Promise((res, rej) => {
    const t = db.transaction(STORE, "readonly").objectStore(STORE);
    const r = t.getAll();
    r.onsuccess = () => res(r.result as QueuedOp[]);
    r.onerror = () => rej(r.error);
  });
  for (const op of all) {
    try {
      await runOp(op);
      await tx("readwrite", (s) => s.delete(op.id!));
      notifyPendingChange();
    } catch {
      // Stop on first failure; will retry next time we come online
      break;
    }
  }
}

const listeners = new Set<() => void>();
export function onPendingChange(fn: () => void) { listeners.add(fn); return () => listeners.delete(fn); }
function notifyPendingChange() { listeners.forEach((l) => l()); }
