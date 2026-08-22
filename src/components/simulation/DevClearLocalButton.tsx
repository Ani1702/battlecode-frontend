"use client";

import { clearSimulationStorage } from "@/game/storage/simulationStorage";

function isLocalhostDev(): boolean {
  if (process.env.NODE_ENV !== "development") {
    return false;
  }

  if (typeof window === "undefined") {
    return false;
  }

  const host = window.location.hostname;
  return host === "localhost" || host === "127.0.0.1";
}

export default function DevClearLocalButton() {
  if (!isLocalhostDev()) {
    return null;
  }

  const handleClear = () => {
    clearSimulationStorage();
    window.location.reload();
  };

  return (
    <button
      type="button"
      onClick={handleClear}
      className="fixed bottom-4 right-4 z-[60] rounded border border-red-500/50 bg-red-950/80 px-3 py-1.5 text-[0.65rem] font-semibold uppercase tracking-wider text-red-200 shadow-lg backdrop-blur-sm transition hover:bg-red-900/90"
      title="Dev only — clears simulation save and tutorial flag"
    >
      Clear localhost
    </button>
  );
}
