export default function AttemptsBadge({
  attemptsRemaining,
  cycle,
}: {
  attemptsRemaining: number;
  cycle?: number;
}) {
  return (
    <div className="glass-box flex items-center gap-2 rounded-full px-3 py-1 text-[0.65rem] uppercase tracking-wider sm:gap-3 sm:px-4 sm:py-2 sm:text-sm">
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
