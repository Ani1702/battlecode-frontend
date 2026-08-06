import type { ReactNode } from "react";
import BackToHomeButton from "./BackToHomeButton";
import DevClearLocalButton from "./DevClearLocalButton";

export default function SimulationLayout({
  children,
  compact = false,
}: {
  children: ReactNode;
  compact?: boolean;
}) {
  return (
    <div className="min-h-dvh bg-black bg-[radial-gradient(50%_50%_at_50%_50%,rgba(0,0,0,0.3)_0%,rgba(0,0,0,0.85)_100%)] text-white oxanium">
      <div
        className={[
          "mx-auto flex min-h-dvh w-full max-w-5xl flex-col px-3 sm:px-4",
          compact ? "justify-center py-2 sm:py-4" : "py-3 sm:py-6",
        ].join(" ")}
      >
        {children}
      </div>
      <BackToHomeButton />
      <DevClearLocalButton />
    </div>
  );
}
