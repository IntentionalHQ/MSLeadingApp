import GameRulesPanel from "@/components/games/GameRulesPanel";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <GameRulesPanel />
    </>
  );
}
