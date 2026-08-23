"use client";
import { useParams } from "next/navigation";
import PictionaryGame from "@/components/games/PictionaryGame";

export default function BiblePictionaryPage() {
  const { id } = useParams<{ id: string }>();
  return <PictionaryGame itineraryId={id} backHref={`/itineraries/${id}/games`} />;
}
