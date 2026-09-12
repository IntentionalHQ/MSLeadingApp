"use client";
import { useParams } from "next/navigation";
import TrueFalseShowdownGame from "@/components/games/TrueFalseShowdownGame";

export default function TrueFalseShowdownPage() {
  const { id } = useParams<{ id: string }>();
  return <TrueFalseShowdownGame itineraryId={id} backHref={`/itineraries/${id}/lead`} backLabel="← Leader" />;
}
