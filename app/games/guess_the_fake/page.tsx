"use client";
import GuessTheFakeGame from "@/components/games/GuessTheFakeGame";

export default function StandaloneGuessTheFakePage() {
  return <GuessTheFakeGame itineraryId={null} backHref="/games" />;
}
