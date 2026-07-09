"use client";

import { useEffect } from "react";
import SimulationGame from "@/components/simulation/SimulationGame";
import { SimEvents } from "@/lib/analytics";

export default function SimulationsPage() {
  useEffect(() => {
    SimEvents.pageView();
  }, []);

  return <SimulationGame />;
}
