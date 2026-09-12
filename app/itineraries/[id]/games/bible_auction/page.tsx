"use client";
import { useParams } from "next/navigation";
import AuctionGame from "@/components/games/AuctionGame";

export default function BibleAuctionPage() {
  const { id } = useParams<{ id: string }>();
  return <AuctionGame itineraryId={id} backHref={`/itineraries/${id}/lead`} backLabel="← Leader" />;
}
