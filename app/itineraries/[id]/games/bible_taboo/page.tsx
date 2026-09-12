"use client";
import { useParams } from "next/navigation";
import TabooGame from "@/components/games/TabooGame";

export default function BibleTabooPage() {
  const { id } = useParams<{ id: string }>();
  return <TabooGame itineraryId={id} backHref={`/itineraries/${id}/lead`} backLabel="← Leader" />;
}
