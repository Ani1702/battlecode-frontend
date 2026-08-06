"use client";

import { useRouter } from "next/navigation";
import { clearSimulationStorage } from "@/game/storage/simulationStorage";

export default function BackToHomeButton() {
  const router = useRouter();

  const handleClick = () => {
    clearSimulationStorage();
    router.push("/");
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="fixed bottom-4 right-4 z-[60] rounded border border-white/20 bg-black/70 px-3 py-1.5 text-[0.65rem] font-semibold uppercase tracking-wider text-white/85 shadow-lg backdrop-blur-sm transition hover:border-orange-300/40 hover:bg-black/85 hover:text-orange-200"
    >
      Back to Dashboard
    </button>
  );
}
