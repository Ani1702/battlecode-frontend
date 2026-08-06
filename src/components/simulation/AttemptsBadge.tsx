export default function AttemptsBadge({
  cycle,
}: {
  attemptsRemaining?: number;
  cycle?: number;
}) {
  return (
    <div className="glass-box flex items-center gap-2 rounded-full px-3 py-1 text-[0.65rem] uppercase tracking-wider sm:gap-3 sm:px-4 sm:py-2 sm:text-sm">
      {cycle !== undefined ? <span>Cycle {cycle}</span> : null}
    </div>
  );
}
