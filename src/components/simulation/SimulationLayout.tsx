import type { ReactNode } from "react";
import DevClearLocalButton from "./DevClearLocalButton";

export default function SimulationLayout({
  children,
  compact = false,
}: {
  children: ReactNode;
  compact?: boolean;
}) {
  return (
    <div
      className={[
        "bg-black bg-[radial-gradient(50%_50%_at_50%_50%,rgba(0,0,0,0.3)_0%,rgba(0,0,0,0.85)_100%)] text-white oxanium",
        compact ? "min-h-dvh lg:h-dvh lg:overflow-hidden" : "min-h-dvh",
      ].join(" ")}
    >
      <div
        className={[
          "mx-auto flex w-full max-w-5xl flex-col px-3 sm:px-4",
          compact
            ? "min-h-dvh justify-center py-2 sm:py-4 lg:h-full lg:py-3"
            : "min-h-dvh py-3 sm:py-6",
        ].join(" ")}
      >
        {children}
      </div>
      <DevClearLocalButton />
    </div>
  );
}
