import {
  getAttackDirectionTowardPlayer,
  getAttackDirectionTowardTarget,
} from "./beam";
import { ALL_DIRECTIONS, canUseAction } from "./constants";
import {
  inBounds,
  isWalkable,
  manhattanDistance,
  offsetPosition,
  positionsEqual,
} from "./grid";
import type { Bot, Direction, GameState, Instruction, Position } from "./types";

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

function getPreferredDirections(from: Position, to: Position): Direction[] {
  const rowDelta = to.row - from.row;
  const colDelta = to.col - from.col;
  const directions: Direction[] = [];

  if (Math.abs(rowDelta) >= Math.abs(colDelta)) {
    if (rowDelta < 0) {
      directions.push("UP");
    } else if (rowDelta > 0) {
      directions.push("DOWN");
    }

    if (colDelta < 0) {
      directions.push("LEFT");
    } else if (colDelta > 0) {
      directions.push("RIGHT");
    }
  } else {
    if (colDelta < 0) {
      directions.push("LEFT");
    } else if (colDelta > 0) {
      directions.push("RIGHT");
    }

    if (rowDelta < 0) {
      directions.push("UP");
    } else if (rowDelta > 0) {
      directions.push("DOWN");
    }
  }

  for (const direction of ALL_DIRECTIONS) {
    if (!directions.includes(direction)) {
      directions.push(direction);
    }
  }

  return directions;
}

function getPreferredMoveDirections(state: GameState): Instruction[] {
  return getPreferredDirections(
    { row: state.opponent.row, col: state.opponent.col },
    { row: state.player.row, col: state.player.col },
  ).map((direction) => ({ type: "MOVE" as const, direction }));
}

function getPredictedPlayerLanding(state: GameState): Position | null {
  const playerPos = { row: state.player.row, col: state.player.col };
  const opponentPos = { row: state.opponent.row, col: state.opponent.col };

  // Only the first legal closing step — same axis preference the bot uses.
  // Side-steps and hesitation are not covered. That is the tell.
  for (const direction of getPreferredDirections(playerPos, opponentPos)) {
    const landing = offsetPosition(playerPos, direction);
    if (canMoveTo(state.grid, landing, opponentPos)) {
      return landing;
    }
  }

  return null;
}

const CLOSE_RANGE = 2;

function isCloseRange(state: GameState): boolean {
  return (
    manhattanDistance(
      { row: state.opponent.row, col: state.opponent.col },
      { row: state.player.row, col: state.player.col },
    ) <= CLOSE_RANGE
  );
}

function getOffensiveAttackDirection(state: GameState): Direction | null {
  const aligned = getAttackDirectionTowardPlayer(state);
  if (aligned !== null) {
    return aligned;
  }

  // Only reads the next step when you are already in its face.
  if (!isCloseRange(state)) {
    return null;
  }

  const landing = getPredictedPlayerLanding(state);
  if (landing === null) {
    return null;
  }

  return getAttackDirectionTowardTarget(
    state.grid,
    { row: state.opponent.row, col: state.opponent.col },
    landing,
  );
}

function playerCanHit(state: GameState, pos: Position): boolean {
  return (
    getAttackDirectionTowardTarget(
      state.grid,
      { row: state.player.row, col: state.player.col },
      pos,
    ) !== null
  );
}

function pickMove(
  state: GameState,
  options: { requireCloser: boolean; avoidExposure: boolean },
): Instruction | null {
  const opponent = state.opponent;
  const playerPos = { row: state.player.row, col: state.player.col };
  const startDistance = manhattanDistance(
    { row: opponent.row, col: opponent.col },
    playerPos,
  );

  for (const candidate of getPreferredMoveDirections(state)) {
    const target = getMoveTarget(state, opponent, candidate);
    if (target === null) {
      continue;
    }

    if (options.avoidExposure && playerCanHit(state, target)) {
      continue;
    }

    if (
      options.requireCloser &&
      manhattanDistance(target, playerPos) >= startDistance
    ) {
      continue;
    }

    return candidate;
  }

  return null;
}

export function chooseOpponentInstruction(state: GameState): Instruction {
  const attackDirection = getOffensiveAttackDirection(state);
  if (attackDirection !== null && canUseAction(state.opponent, "ATTACK")) {
    return { type: "ATTACK", direction: attackDirection };
  }

  // At close range it will not walk into a cell you can already snipe.
  // From farther away it just chases, including into your beam.
  const avoidExposure =
    canUseAction(state.opponent, "ATTACK") && isCloseRange(state);

  const closing = pickMove(state, {
    requireCloser: true,
    avoidExposure,
  });
  if (closing) {
    return closing;
  }

  if (avoidExposure) {
    const sidestep = pickMove(state, {
      requireCloser: false,
      avoidExposure: true,
    });
    if (sidestep) {
      return sidestep;
    }
  }

  if (canUseAction(state.opponent, "SHIELD")) {
    return { type: "SHIELD" };
  }

  for (const direction of ALL_DIRECTIONS) {
    const candidate: Instruction = { type: "MOVE", direction };
    if (getMoveTarget(state, state.opponent, candidate) !== null) {
      return candidate;
    }
  }

  return { type: "MOVE", direction: ALL_DIRECTIONS[0] };
}

export function cloneGameState(state: GameState): GameState {
  return {
    cycle: state.cycle,
    grid: state.grid.map((row) => [...row]),
    player: cloneBot(state.player),
    opponent: cloneBot(state.opponent),
  };
}
