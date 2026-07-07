import type { Grid, SimulationConfig } from "../types";

export const TINY_SIMULATION: SimulationConfig = {
  id: "tiny-fixture",
  grid: Array.from({ length: 5 }, () =>
    Array.from({ length: 5 }, () => "EMPTY" as const),
  ) as Grid,
  playerStart: { row: 2, col: 1 },
  opponentStart: { row: 2, col: 4 },
  maxCycles: 50,
  nextSimulationDate: "19th September",
  shareEventDate: "19th September",
};
