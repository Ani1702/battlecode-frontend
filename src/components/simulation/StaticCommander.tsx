export default function StaticCommander() {
  return (
    <div className="glass-box flex items-center gap-4 rounded-lg p-4">
      <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-orange-500/40 bg-orange-500/10 orbitron text-xs uppercase tracking-wider text-orange-300">
        CMD
      </div>
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
