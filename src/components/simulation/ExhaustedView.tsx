import ShareCard from "./ShareCard";

export default function ExhaustedView({
  nextSimulationDate,
  shareEventDate,
}: {
  nextSimulationDate: string;
  shareEventDate: string;
}) {
  return (
    <div className="flex flex-col gap-6">
      <div className="glass-box rounded-lg p-6 text-center">
        <h2 className="orbitron text-2xl">Out of Attempts</h2>
        <p className="mt-4 text-white/80">
          Next simulation on{" "}
          <span className="text-orange-300">{nextSimulationDate}</span>.
        </p>
      </div>

      <ShareCard variant="loss" shareEventDate={shareEventDate} />
    </div>
  );
}
