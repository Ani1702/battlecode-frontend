import { inBounds, isWalkable, offsetPosition, positionsEqual } from "./grid";
import type {
  BeamPath,
  Bot,
  Direction,
  GameState,
  Grid,
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
  const cells = getBeamCells(grid, from, direction);
  const targetPos = { row: target.row, col: target.col };
  const hit = beamHitsTarget(grid, from, direction, targetPos);
  const blockedByWall = cells.some(
    (cell) => grid[cell.row][cell.col] === "WALL",
  );

  return {
    attacker: attacker.id,
    cells,
    hit,
    blockedByWall,
  };
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
