import { STARTING_LIVES } from "./constants";
import { deriveCombatScenario, getClashPoint } from "./combatScenario";
import { cloneGrid } from "./grid";
import { chooseOpponentInstruction } from "./opponent";
import { resolveCycle } from "./resolver";
import type {
  GameState,
  Instruction,
  SimulationConfig,
  StepResult,
} from "./types";

export function createInitialState(config: SimulationConfig): GameState {
  return {
    cycle: 0,
    grid: cloneGrid(config.grid),
    player: {
      id: "player",
      row: config.playerStart.row,
      col: config.playerStart.col,
      lives: STARTING_LIVES,
      shieldActive: false,
      attackCooldown: 0,
      shieldCooldown: 0,
    },
    opponent: {
      id: "opponent",
      row: config.opponentStart.row,
      col: config.opponentStart.col,
      lives: STARTING_LIVES,
      shieldActive: false,
      attackCooldown: 0,
      shieldCooldown: 0,
    },
  };
}

export function step(
  state: GameState,
  playerInstruction: Instruction,
  config: SimulationConfig,
): StepResult {
  const opponentInstruction = chooseOpponentInstruction(state);
  const result = resolveCycle(
    state,
    playerInstruction,
    opponentInstruction,
    config.maxCycles,
  );

  return {
    nextState: result.nextState,
    playerInstruction,
    opponentInstruction,
    beamPaths: result.beamPaths,
    events: result.events,
    outcome: result.outcome,
    combatScenario: deriveCombatScenario(result.events, result.beamPaths),
    clashPoint: getClashPoint(result.events),
  };
}
