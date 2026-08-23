"use client";
import { useParams } from "next/navigation";
import GamesHub from "@/components/games/GamesHub";
import { gameRoutePath } from "@/lib/games";

export default function GamesHubPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <GamesHub
      hrefFor={(gid) => gameRoutePath(id, gid)}
      backHref={`/itineraries/${id}/lead`}
    />
  );
}
