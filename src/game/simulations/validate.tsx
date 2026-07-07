import { getCols, getRows, inBounds, isWalkable } from "../engine/grid";
import type { SimulationConfig } from "../engine/types";

export function validateSimulationConfig(config: SimulationConfig): void {
  const { grid, playerStart, opponentStart, maxCycles } = config;

  if (getRows(grid) === 0 || getCols(grid) === 0) {
    throw new Error("Simulation grid must not be empty");
  }

  const expectedCols = getCols(grid);
  for (let row = 0; row < getRows(grid); row += 1) {
    if (grid[row].length !== expectedCols) {
      throw new Error("Simulation grid must be rectangular");
    }
  }

  if (maxCycles < 1) {
    throw new Error("maxCycles must be at least 1");
  }

  if (!config.id.trim()) {
    throw new Error("Simulation id must not be empty");
  }

  validateSpawn(grid, playerStart, "player");
  validateSpawn(grid, opponentStart, "opponent");

  if (
    playerStart.row === opponentStart.row &&
    playerStart.col === opponentStart.col
  ) {
    throw new Error("Player and opponent cannot share the same spawn cell");
  }
}

function validateSpawn(
  grid: SimulationConfig["grid"],
  spawn: SimulationConfig["playerStart"],
  label: string,
): void {
  if (!inBounds(grid, spawn)) {
    throw new Error(`${label} spawn is out of bounds`);
  }

  if (!isWalkable(grid, spawn)) {
    throw new Error(`${label} spawn must be on an EMPTY tile`);
  }
}
