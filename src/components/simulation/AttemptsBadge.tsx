export default function AttemptsBadge({
  attemptsRemaining,
}: {
  attemptsRemaining: number;
}) {
  return (
    <div className="glass-box rounded-full px-4 py-2 text-sm uppercase tracking-wider">
      Attempts: {attemptsRemaining}
    </div>
  );
}
