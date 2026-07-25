export default function OpponentMoveReveal({
  instructionLabel,
}: {
  instructionLabel: string | null;
}) {
  if (!instructionLabel) {
    return null;
  }

  return (
    <div className="rounded-lg border border-white/10 bg-black/30 px-3 py-1.5 text-[0.7rem] text-white/70 sm:px-4 sm:py-3 sm:text-sm">
      Opponent:{" "}
      <span className="font-mono text-orange-300">{instructionLabel}</span>
    </div>
  );
}
