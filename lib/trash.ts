// Trash: rows are hidden with deleted_at and purged for real after 30 days.
// Every list that shows Sundays or decks filters `.is("deleted_at", null)`.
import { supabase } from "./supabase";

export const TRASH_DAYS = 30;
type TrashTable = "itineraries" | "cue_decks";

export function trashRow(table: TrashTable, id: string) {
  return supabase.from(table).update({ deleted_at: new Date().toISOString() }).eq("id", id);
}

export function restoreRow(table: TrashTable, id: string) {
  return supabase.from(table).update({ deleted_at: null }).eq("id", id);
}

/** Rows trashed more than TRASH_DAYS ago are gone for good (children cascade). */
export function purgeOld(table: TrashTable) {
  const cutoff = new Date(Date.now() - TRASH_DAYS * 86400000).toISOString();
  return supabase.from(table).delete().not("deleted_at", "is", null).lt("deleted_at", cutoff);
}

export function daysLeft(deletedAt: string): number {
  return Math.max(0, TRASH_DAYS - Math.floor((Date.now() - Date.parse(deletedAt)) / 86400000));
}
