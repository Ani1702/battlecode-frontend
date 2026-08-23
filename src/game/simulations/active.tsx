import type { Grid, SimulationConfig } from "../engine/types";
import { validateSimulationConfig } from "./validate";

const grid: Grid = [
  ["EMPTY", "EMPTY", "WALL", "EMPTY", "EMPTY"],
  ["EMPTY", "WALL", "EMPTY", "EMPTY", "EMPTY"],
  ["EMPTY", "WALL", "EMPTY", "WALL", "EMPTY"],
  ["EMPTY", "EMPTY", "EMPTY", "WALL", "EMPTY"],
  ["EMPTY", "EMPTY", "WALL", "EMPTY", "EMPTY"],
];

export const ACTIVE_SIMULATION: SimulationConfig = {
  id: "sim-008",
  grid,
  playerStart: { row: 4, col: 0 },
  opponentStart: { row: 0, col: 4 },
  maxCycles: 50,
  nextSimulationDate: "19th September",
  shareEventDate: "19th September",
};

validateSimulationConfig(ACTIVE_SIMULATION);
