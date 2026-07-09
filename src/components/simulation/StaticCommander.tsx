import Image from "next/image";

export default function StaticCommander() {
  return (
    <div className="glass-box flex items-center gap-4 rounded-lg p-4">
      <Image
        src="/simulation/commander-placeholder.svg"
        alt="Commander"
        width={64}
        height={64}
        className="h-16 w-16 rounded-lg border border-orange-500/40 bg-orange-500/10"
      />
      <div>
        <p className="orbitron text-sm uppercase tracking-wider text-white/90">
          Commander
        </p>
        <p className="mt-1 text-xs text-white/50">
          Briefing coming in a future update.
        </p>
      </div>
    </div>
  );
}
