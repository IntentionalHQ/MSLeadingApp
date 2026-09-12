"use client";
import { useParams } from "next/navigation";
import PriceIsRightGame from "@/components/games/PriceIsRightGame";

export default function BiblePriceIsRightPage() {
  const { id } = useParams<{ id: string }>();
  return <PriceIsRightGame itineraryId={id} backHref={`/itineraries/${id}/lead`} backLabel="← Leader" />;
}
