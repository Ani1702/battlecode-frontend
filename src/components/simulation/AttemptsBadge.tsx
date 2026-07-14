export default function AttemptsBadge({
  attemptsRemaining,
  cycle,
}: {
  attemptsRemaining: number;
  cycle?: number;
}) {
  return (
    <div className="glass-box flex items-center gap-3 rounded-full px-4 py-2 text-sm uppercase tracking-wider">
      {cycle !== undefined ? (
        <>
          <span>Cycle {cycle}</span>
          <span className="text-white/25">|</span>
        </>
      ) : null}
      <span>Attempts: {attemptsRemaining}</span>
    </div>
  );
}
