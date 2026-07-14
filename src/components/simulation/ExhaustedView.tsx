import ShareCard from "./ShareCard";

export default function ExhaustedView({
  nextSimulationDate,

  shareEventDate,
}: {
  nextSimulationDate: string;

  shareEventDate: string;
}) {
  return (
    <div className="flex flex-col gap-3 sm:gap-5">
      <div className="glass-box rounded-lg p-3 text-center sm:p-5">
        <h2 className="orbitron text-lg sm:text-2xl">Out of Attempts</h2>

        <p className="mt-2 text-sm text-white/80">
          Next simulation on{" "}
          <span className="text-orange-300">{nextSimulationDate}</span>.
        </p>
      </div>

      <ShareCard variant="loss" shareEventDate={shareEventDate} />
    </div>
  );
}
