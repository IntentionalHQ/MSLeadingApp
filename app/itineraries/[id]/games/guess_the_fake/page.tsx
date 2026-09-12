"use client";
import { useParams } from "next/navigation";
import GuessTheFakeGame from "@/components/games/GuessTheFakeGame";

export default function GuessTheFakePage() {
  const { id } = useParams<{ id: string }>();
  return <GuessTheFakeGame itineraryId={id} backHref={`/itineraries/${id}/lead`} backLabel="← Leader" />;
}
