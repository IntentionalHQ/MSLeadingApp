"use client";
import { useParams } from "next/navigation";
import HangmanGame from "@/components/games/HangmanGame";

export default function BibleHangmanPage() {
  const { id } = useParams<{ id: string }>();
  return <HangmanGame itineraryId={id} backHref={`/itineraries/${id}/lead`} backLabel="← Leader" />;
}
