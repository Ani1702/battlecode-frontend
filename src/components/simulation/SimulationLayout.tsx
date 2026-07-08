import type { ReactNode } from "react";

export default function SimulationLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-black bg-[radial-gradient(50%_50%_at_50%_50%,rgba(0,0,0,0.3)_0%,rgba(0,0,0,0.85)_100%)] text-white oxanium">
      <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-4 py-6">
        {children}
      </div>
    </div>
  );
}
