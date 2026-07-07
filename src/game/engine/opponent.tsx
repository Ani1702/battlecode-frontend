import { ALL_DIRECTIONS } from "./constants";
import { getAttackDirectionTowardPlayer } from "./beam";
import {
  inBounds,
  isWalkable,
  manhattanDistance,
  offsetPosition,
  positionsEqual,
} from "./grid";
import type { Bot, GameState, Instruction, Position } from "./types";

function cloneBot(bot: Bot): Bot {
  return { ...bot };
}

function getOtherBotPosition(state: GameState, mover: Bot["id"]): Position {
  const other = mover === "player" ? state.opponent : state.player;
  return { row: other.row, col: other.col };
}

function canMoveTo(
  grid: GameState["grid"],
  to: Position,
  otherPos: Position,
): boolean {
  if (!inBounds(grid, to) || !isWalkable(grid, to)) {
    return false;
  }

  return !positionsEqual(to, otherPos);
}

function getMoveTarget(
  state: GameState,
  bot: Bot,
  instruction: Instruction,
): Position | null {
  if (instruction.type !== "MOVE") {
    return null;
  }

  const to = offsetPosition(
    { row: bot.row, col: bot.col },
    instruction.direction,
  );
  const otherPos = getOtherBotPosition(state, bot.id);

  return canMoveTo(state.grid, to, otherPos) ? to : null;
}

function getPreferredMoveDirections(state: GameState): Instruction[] {
  const from = { row: state.opponent.row, col: state.opponent.col };
  const to = { row: state.player.row, col: state.player.col };
  const rowDelta = to.row - from.row;
  const colDelta = to.col - from.col;

  const directions: Instruction[] = [];

  if (Math.abs(rowDelta) >= Math.abs(colDelta)) {
    if (rowDelta < 0) {
      directions.push({ type: "MOVE", direction: "UP" });
    } else if (rowDelta > 0) {
      directions.push({ type: "MOVE", direction: "DOWN" });
    }

    if (colDelta < 0) {
      directions.push({ type: "MOVE", direction: "LEFT" });
    } else if (colDelta > 0) {
      directions.push({ type: "MOVE", direction: "RIGHT" });
    }
  } else {
    if (colDelta < 0) {
      directions.push({ type: "MOVE", direction: "LEFT" });
    } else if (colDelta > 0) {
      directions.push({ type: "MOVE", direction: "RIGHT" });
    }

    if (rowDelta < 0) {
      directions.push({ type: "MOVE", direction: "UP" });
    } else if (rowDelta > 0) {
      directions.push({ type: "MOVE", direction: "DOWN" });
    }
  }

  for (const direction of ALL_DIRECTIONS) {
    const candidate: Instruction = { type: "MOVE", direction };
    if (
      !directions.some(
        (existing) =>
          existing.type === "MOVE" && existing.direction === direction,
      )
    ) {
      directions.push(candidate);
    }
  }

  return directions;
}

export function chooseOpponentInstruction(state: GameState): Instruction {
  const attackDirection = getAttackDirectionTowardPlayer(state);
  if (attackDirection !== null) {
    return { type: "ATTACK", direction: attackDirection };
  }

  const opponent = state.opponent;
  const startDistance = manhattanDistance(
    { row: opponent.row, col: opponent.col },
    { row: state.player.row, col: state.player.col },
  );

  for (const candidate of getPreferredMoveDirections(state)) {
    const target = getMoveTarget(state, opponent, candidate);
    if (target === null) {
      continue;
    }

    const nextDistance = manhattanDistance(target, {
      row: state.player.row,
      col: state.player.col,
    });

    if (nextDistance < startDistance) {
      return candidate;
    }
  }

  return { type: "SHIELD" };
}

export function cloneGameState(state: GameState): GameState {
  return {
    cycle: state.cycle,
    grid: state.grid.map((row) => [...row]),
    player: cloneBot(state.player),
    opponent: cloneBot(state.opponent),
  };
}
