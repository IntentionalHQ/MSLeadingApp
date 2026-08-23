"use client";
import { useParams } from "next/navigation";
import BaseballGame from "@/components/games/BaseballGame";

export default function BaseballPage() {
  const { id } = useParams<{ id: string }>();
  return <BaseballGame itineraryId={id} backHref={`/itineraries/${id}/lead`} backLabel="← Leader" />;
}
