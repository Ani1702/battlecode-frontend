export default function OpponentMoveReveal({
  instructionLabel,
}: {
  instructionLabel: string | null;
}) {
  if (!instructionLabel) {
    return null;
  }

  return (
    <div className="rounded-lg border border-white/10 bg-black/30 px-4 py-3 text-sm text-white/70">
      Opponent:{" "}
      <span className="font-mono text-orange-300">{instructionLabel}</span>
    </div>
  );
}
