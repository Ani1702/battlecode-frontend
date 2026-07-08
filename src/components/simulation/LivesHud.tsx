export default function LivesHud({
  cycle,
  playerLives,
  opponentLives,
}: {
  cycle: number;
  playerLives: number;
  opponentLives: number;
}) {
  const hearts = (count: number) =>
    "♥".repeat(count) + "♡".repeat(Math.max(0, 2 - count));

  return (
    <div className="glass-box rounded-lg p-4 text-sm">
      <div className="orbitron text-base">Cycle {cycle}</div>
      <div className="mt-2 flex flex-wrap gap-4">
        <span>You {hearts(playerLives)}</span>
        <span>Bot {hearts(opponentLives)}</span>
      </div>
    </div>
  );
}
