"use client";
import HangmanGame from "@/components/games/HangmanGame";

export default function StandaloneHangmanPage() {
  return <HangmanGame itineraryId={null} backHref="/games" />;
}
