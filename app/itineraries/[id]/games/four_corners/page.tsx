"use client";
import { useParams } from "next/navigation";
import FourCornersGame from "@/components/games/FourCornersGame";

export default function FourCornersPage() {
  const { id } = useParams<{ id: string }>();
  return <FourCornersGame itineraryId={id} backHref={`/itineraries/${id}/games`} />;
}
