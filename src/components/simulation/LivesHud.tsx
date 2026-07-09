export default function LivesHud({ cycle }: { cycle: number }) {
  return (
    <div className="glass-box rounded-lg p-4 text-sm">
      <div className="orbitron text-base">Cycle {cycle}</div>
    </div>
  );
}
