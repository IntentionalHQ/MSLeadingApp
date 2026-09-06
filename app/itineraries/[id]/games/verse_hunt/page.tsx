"use client";
import { useParams } from "next/navigation";
import VerseHuntGame from "@/components/games/VerseHuntGame";

export default function VerseHuntPage() {
  const { id } = useParams<{ id: string }>();
  return <VerseHuntGame itineraryId={id} backHref={`/itineraries/${id}/games`} />;
}
