import { cloneGrid } from "../grid";
import type { GameState, Grid, Instruction } from "../types";

const EMPTY_5X5: Grid = Array.from({ length: 5 }, () =>
  Array.from({ length: 5 }, () => "EMPTY" as const),
) as Grid;

function createScenario(
  playerPos: { row: number; col: number },
  opponentPos: { row: number; col: number },
  overrides?: {
    playerCooldown?: { attack?: number; shield?: number };
    opponentCooldown?: { attack?: number; shield?: number };
  },
): GameState {
  return {
    cycle: 0,
    grid: cloneGrid(EMPTY_5X5),
    player: {
      id: "player",
      row: playerPos.row,
      col: playerPos.col,
      lives: 2,
      shieldActive: false,
      attackCooldown: overrides?.playerCooldown?.attack ?? 0,
      shieldCooldown: overrides?.playerCooldown?.shield ?? 0,
    },
    opponent: {
      id: "opponent",
      row: opponentPos.row,
      col: opponentPos.col,
      lives: 2,
      shieldActive: false,
      attackCooldown: overrides?.opponentCooldown?.attack ?? 0,
      shieldCooldown: overrides?.opponentCooldown?.shield ?? 0,
    },
  };
}

export const TUTORIAL_INTRO_SCENARIO = createScenario(
  { row: 4, col: 0 },
  { row: 0, col: 4 },
);

export const TUTORIAL_MOVE_SCENARIO = createScenario(
  { row: 2, col: 0 },
  { row: 0, col: 4 },
);

export const TUTORIAL_ATTACK_SCENARIO = createScenario(
  { row: 2, col: 1 },
  { row: 2, col: 3 },
);

export const TUTORIAL_SHIELD_SCENARIO = createScenario(
  { row: 2, col: 1 },
  { row: 2, col: 3 },
);

export const TUTORIAL_COOLDOWN_SCENARIO = createScenario(
  { row: 2, col: 1 },
  { row: 2, col: 3 },
  { playerCooldown: { attack: 2 } },
);

export interface TutorialDemoCycle {
  playerInstruction: Instruction;
  opponentInstruction: Instruction;
}

export const TUTORIAL_MOVE_DEMO: TutorialDemoCycle = {
  playerInstruction: { type: "MOVE", direction: "RIGHT" },
  opponentInstruction: { type: "MOVE", direction: "DOWN" },
};

export const TUTORIAL_ATTACK_DEMO: TutorialDemoCycle = {
  playerInstruction: { type: "ATTACK", direction: "RIGHT" },
  opponentInstruction: { type: "MOVE", direction: "UP" },
};

export const TUTORIAL_SHIELD_DEMO: TutorialDemoCycle = {
  playerInstruction: { type: "SHIELD" },
  opponentInstruction: { type: "ATTACK", direction: "LEFT" },
};
