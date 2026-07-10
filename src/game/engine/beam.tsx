import { inBounds, isWalkable, offsetPosition, positionsEqual } from "./grid";
import type {
  BeamPath,
  Bot,
  Direction,
  GameState,
  Grid,
  Instruction,
  Position,
} from "./types";

export function getBeamCells(
  grid: Grid,
  from: Position,
  direction: Direction,
): Position[] {
  const cells: Position[] = [];
  let current = offsetPosition(from, direction);

  while (inBounds(grid, current)) {
    cells.push({ ...current });

    if (grid[current.row][current.col] === "WALL") {
      break;
    }

    current = offsetPosition(current, direction);
  }

  return cells;
}

export function beamHitsTarget(
  grid: Grid,
  from: Position,
  direction: Direction,
  target: Position,
): boolean {
  let current = offsetPosition(from, direction);

  while (inBounds(grid, current)) {
    if (positionsEqual(current, target)) {
      return true;
    }

    if (grid[current.row][current.col] === "WALL") {
      return false;
    }

    current = offsetPosition(current, direction);
  }

  return false;
}

export function getBeamPath(
  grid: Grid,
  attacker: Bot,
  direction: Direction,
  target: Bot,
): BeamPath {
  const from = { row: attacker.row, col: attacker.col };
  const targetPos = { row: target.row, col: target.col };
  const cells: Position[] = [];
  let current = offsetPosition(from, direction);

  while (inBounds(grid, current)) {
    cells.push({ ...current });

    if (positionsEqual(current, targetPos)) {
      break;
    }

    if (grid[current.row][current.col] === "WALL") {
      break;
    }

    current = offsetPosition(current, direction);
  }

  const hit = beamHitsTarget(grid, from, direction, targetPos);
  const blockedByWall = cells.some(
    (cell) => grid[cell.row][cell.col] === "WALL",
  );

  return {
    attacker: attacker.id,
    direction,
    cells,
    hit,
    blockedByWall,
  };
}

function isOpposingHorizontal(a: Direction, b: Direction): boolean {
  return (a === "LEFT" && b === "RIGHT") || (a === "RIGHT" && b === "LEFT");
}

function isOpposingVertical(a: Direction, b: Direction): boolean {
  return (a === "UP" && b === "DOWN") || (a === "DOWN" && b === "UP");
}

function buildClashBeamPath(
  grid: Grid,
  attacker: Bot,
  direction: Direction,
  clashPoint: Position,
  includeClashCell: boolean,
): BeamPath {
  const from = { row: attacker.row, col: attacker.col };
  const cells: Position[] = [];
  let current = offsetPosition(from, direction);

  while (inBounds(grid, current)) {
    if (positionsEqual(current, clashPoint)) {
      if (includeClashCell) {
        cells.push({ ...current });
      }
      break;
    }

    cells.push({ ...current });

    if (grid[current.row][current.col] === "WALL") {
      break;
    }

    current = offsetPosition(current, direction);
  }

  return {
    attacker: attacker.id,
    direction,
    cells,
    hit: false,
    blockedByWall: false,
    truncatedAt: clashPoint,
  };
}

function areFacingHeadOnHorizontal(
  playerFrom: Position,
  opponentFrom: Position,
  playerDir: Direction,
  opponentDir: Direction,
): boolean {
  if (
    playerFrom.row !== opponentFrom.row ||
    !isOpposingHorizontal(playerDir, opponentDir)
  ) {
    return false;
  }

  const playerIsLeft = playerFrom.col < opponentFrom.col;
  return (
    (playerIsLeft && playerDir === "RIGHT" && opponentDir === "LEFT") ||
    (!playerIsLeft && playerDir === "LEFT" && opponentDir === "RIGHT")
  );
}

function areFacingHeadOnVertical(
  playerFrom: Position,
  opponentFrom: Position,
  playerDir: Direction,
  opponentDir: Direction,
): boolean {
  if (
    playerFrom.col !== opponentFrom.col ||
    !isOpposingVertical(playerDir, opponentDir)
  ) {
    return false;
  }

  const playerIsAbove = playerFrom.row < opponentFrom.row;
  return (
    (playerIsAbove && playerDir === "DOWN" && opponentDir === "UP") ||
    (!playerIsAbove && playerDir === "UP" && opponentDir === "DOWN")
  );
}

export interface HeadOnClashResult {
  clashPoint: Position;
  playerPath: BeamPath;
  opponentPath: BeamPath;
}

export function detectHeadOnClash(
  state: GameState,
  playerInstruction: Instruction,
  opponentInstruction: Instruction,
): HeadOnClashResult | null {
  if (
    playerInstruction.type !== "ATTACK" ||
    opponentInstruction.type !== "ATTACK"
  ) {
    return null;
  }

  const playerFrom = { row: state.player.row, col: state.player.col };
  const opponentFrom = { row: state.opponent.row, col: state.opponent.col };
  const playerDir = playerInstruction.direction;
  const opponentDir = opponentInstruction.direction;

  if (
    areFacingHeadOnHorizontal(playerFrom, opponentFrom, playerDir, opponentDir)
  ) {
    const colGap = Math.abs(playerFrom.col - opponentFrom.col);
    if (colGap === 0) {
      return null;
    }

    const playerIsLeft = playerFrom.col < opponentFrom.col;
    const clashPoint =
      colGap === 1
        ? {
            row: playerFrom.row,
            col: playerIsLeft ? opponentFrom.col : playerFrom.col,
          }
        : {
            row: playerFrom.row,
            col: Math.floor((playerFrom.col + opponentFrom.col) / 2),
          };

    return {
      clashPoint,
      playerPath: buildClashBeamPath(
        state.grid,
        state.player,
        playerDir,
        clashPoint,
        colGap > 1,
      ),
      opponentPath: buildClashBeamPath(
        state.grid,
        state.opponent,
        opponentDir,
        clashPoint,
        colGap > 1,
      ),
    };
  }

  if (
    areFacingHeadOnVertical(playerFrom, opponentFrom, playerDir, opponentDir)
  ) {
    const rowGap = Math.abs(playerFrom.row - opponentFrom.row);
    if (rowGap === 0) {
      return null;
    }

    const playerIsAbove = playerFrom.row < opponentFrom.row;
    const clashPoint =
      rowGap === 1
        ? {
            row: playerIsAbove ? opponentFrom.row : playerFrom.row,
            col: playerFrom.col,
          }
        : {
            row: Math.floor((playerFrom.row + opponentFrom.row) / 2),
            col: playerFrom.col,
          };

    return {
      clashPoint,
      playerPath: buildClashBeamPath(
        state.grid,
        state.player,
        playerDir,
        clashPoint,
        rowGap > 1,
      ),
      opponentPath: buildClashBeamPath(
        state.grid,
        state.opponent,
        opponentDir,
        clashPoint,
        rowGap > 1,
      ),
    };
  }

  return null;
}

export function getAttackDirectionTowardTarget(
  grid: Grid,
  from: Position,
  target: Position,
): Direction | null {
  if (from.row === target.row && from.col !== target.col) {
    const direction: Direction = target.col > from.col ? "RIGHT" : "LEFT";
    return beamHitsTarget(grid, from, direction, target) ? direction : null;
  }

  if (from.col === target.col && from.row !== target.row) {
    const direction: Direction = target.row > from.row ? "DOWN" : "UP";
    return beamHitsTarget(grid, from, direction, target) ? direction : null;
  }

  return null;
}

export function getAttackDirectionTowardPlayer(
  state: GameState,
): Direction | null {
  const opponentPos = { row: state.opponent.row, col: state.opponent.col };
  const playerPos = { row: state.player.row, col: state.player.col };

  return getAttackDirectionTowardTarget(state.grid, opponentPos, playerPos);
}
