import { TINY_SIMULATION } from "../__fixtures__/tiny";
import { createInitialState, step } from "../runner";
import { ACTIVE_SIMULATION } from "../../simulations/active";
import { validateSimulationConfig } from "../../simulations/validate";
import type { SimulationConfig } from "../types";

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

// --- validateSimulationConfig ---
validateSimulationConfig(ACTIVE_SIMULATION);

assertThrows(
  () =>
    validateSimulationConfig({
      ...ACTIVE_SIMULATION,
      playerStart: { row: 1, col: 1 },
    }),
  "reject spawn on wall",
);

assertThrows(
  () =>
    validateSimulationConfig({
      ...ACTIVE_SIMULATION,
      playerStart: ACTIVE_SIMULATION.opponentStart,
      opponentStart: ACTIVE_SIMULATION.opponentStart,
    }),
  "reject shared spawns",
);

// --- createInitialState ---
{
  const state = createInitialState(ACTIVE_SIMULATION);
  assert(state.cycle === 0, "starts at cycle 0");
  assert(
    state.player.lives === 2 && state.opponent.lives === 2,
    "starts with 2 lives",
  );
  assert(
    state.player.row === ACTIVE_SIMULATION.playerStart.row &&
      state.player.col === ACTIVE_SIMULATION.playerStart.col,
    "player spawn",
  );
  assert(
    state.opponent.row === ACTIVE_SIMULATION.opponentStart.row &&
      state.opponent.col === ACTIVE_SIMULATION.opponentStart.col,
    "opponent spawn",
  );
  assert(
    state.grid[1][1] === "WALL" &&
      state.grid[1][1] === ACTIVE_SIMULATION.grid[1][1],
    "grid copied from config",
  );
}

// --- step shape + cycle increment ---
{
  let state = createInitialState(ACTIVE_SIMULATION);
  const result = step(state, { type: "SHIELD" }, ACTIVE_SIMULATION);

  assert(
    result.opponentInstruction.type === "MOVE",
    "opponent moves on active map turn 1",
  );
  assert(result.nextState.cycle === 1, "cycle increments after step");
  assert(result.outcome === "continue", "game continues after one step");
  assert(Array.isArray(result.beamPaths), "beam paths returned");
  assert(
    result.events.some((event) => event.type === "CYCLE_END"),
    "cycle end event emitted",
  );

  state = result.nextState;
  const result2 = step(state, { type: "SHIELD" }, ACTIVE_SIMULATION);
  assert(result2.nextState.cycle === 2, "cycle increments across steps");
}

// --- maxCycles timeout ---
{
  const timeoutConfig: SimulationConfig = {
    ...TINY_SIMULATION,
    maxCycles: 3,
  };
  let state = createInitialState(timeoutConfig);
  let outcome = "continue" as const;

  for (let i = 0; i < 3; i += 1) {
    const result = step(state, { type: "SHIELD" }, timeoutConfig);
    state = result.nextState;
    outcome = result.outcome;
  }

  assert(state.cycle === 3, "cycle reaches maxCycles");
  assert(outcome === "loss", "maxCycles produces loss");
}

// --- programmatic win via step ---
{
  let state = createInitialState(TINY_SIMULATION);
  state.opponent.lives = 1;

  const result = step(
    state,
    { type: "ATTACK", direction: "RIGHT" },
    TINY_SIMULATION,
  );

  assert(
    result.opponentInstruction.type === "ATTACK",
    "aligned opponent attacks back",
  );
  assert(result.outcome === "win", "step can produce a win outcome");
  assert(result.nextState.opponent.lives === 0, "opponent eliminated on win");
  assert(result.nextState.player.lives === 1, "player survives with 1 life");
}

console.log("Phase 3 OK");

function assertThrows(fn: () => void, message: string): void {
  try {
    fn();
    throw new Error(`Expected throw: ${message}`);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Expected throw")) {
      throw error;
    }
  }
}
