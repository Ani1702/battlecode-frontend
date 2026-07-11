import { getBeamPath } from "./beam";
import { canUseAction } from "./constants";
import { offsetPosition, positionsEqual } from "./grid";
import type { Direction, GameState, Instruction, Position } from "./types";

export type ActionMode = "move" | "attack" | "shield";

function playerPosition(state: GameState): Position {
  return { row: state.player.row, col: state.player.col };
}

function directionBetween(from: Position, to: Position): Direction | null {
  const dRow = to.row - from.row;
  const dCol = to.col - from.col;

  if (dRow === -1 && dCol === 0) {
    return "UP";
  }
  if (dRow === 1 && dCol === 0) {
    return "DOWN";
  }
  if (dRow === 0 && dCol === -1) {
    return "LEFT";
  }
  if (dRow === 0 && dCol === 1) {
    return "RIGHT";
  }

  return null;
}

function attackDirectionFromCell(
  from: Position,
  cell: Position,
): Direction | null {
  if (positionsEqual(from, cell)) {
    return null;
  }

  if (from.row === cell.row) {
    return cell.col > from.col ? "RIGHT" : "LEFT";
  }

  if (from.col === cell.col) {
    return cell.row > from.row ? "DOWN" : "UP";
  }

  return null;
}

export function isValidMoveCell(state: GameState, cell: Position): boolean {
  return getMoveDirectionIfValid(state, cell) !== null;
}

export function getMoveDirectionIfValid(
  state: GameState,
  cell: Position,
): Direction | null {
  const from = playerPosition(state);
  const direction = directionBetween(from, cell);

  if (direction === null) {
    return null;
  }

  const target = offsetPosition(from, direction);
  if (!positionsEqual(target, cell)) {
    return null;
  }

  const opponentFrom = { row: state.opponent.row, col: state.opponent.col };
  const { grid } = state;

  if (
    target.row < 0 ||
    target.row >= grid.length ||
    target.col < 0 ||
    target.col >= grid[0].length
  ) {
    return null;
  }

  if (grid[target.row][target.col] !== "EMPTY") {
    return null;
  }

  if (positionsEqual(target, opponentFrom)) {
    return null;
  }

  return direction;
}

export function isValidAttackCell(state: GameState, cell: Position): boolean {
  return getAttackDirectionFromCell(state, cell) !== null;
}

export function getAttackDirectionFromCell(
  state: GameState,
  cell: Position,
): Direction | null {
  return attackDirectionFromCell(playerPosition(state), cell);
}

export function getAttackPreviewCells(
  state: GameState,
  direction: Direction,
): Position[] {
  const path = getBeamPath(state.grid, state.player, direction, state.opponent);

  return path.cells.map((cell) => ({ ...cell }));
}

export function getPreviewCellsForSelection(
  mode: ActionMode,
  state: GameState,
  cell: Position | null,
): Position[] {
  if (mode === "shield") {
    return [playerPosition(state)];
  }

  if (!cell) {
    return [];
  }

  if (mode === "move") {
    return isValidMoveCell(state, cell) ? [{ ...cell }] : [];
  }

  const direction = getAttackDirectionFromCell(state, cell);
  if (direction === null) {
    return [];
  }

  return getAttackPreviewCells(state, direction);
}

export function instructionFromSelection(
  mode: ActionMode,
  state: GameState,
  cell: Position | null,
): Instruction | null {
  if (mode === "shield") {
    if (!canUseAction(state.player, "SHIELD")) {
      return null;
    }

    return { type: "SHIELD" };
  }

  if (!cell) {
    return null;
  }

  if (mode === "move") {
    const direction = getMoveDirectionIfValid(state, cell);
    return direction ? { type: "MOVE", direction } : null;
  }

  if (!canUseAction(state.player, "ATTACK")) {
    return null;
  }

  const direction = getAttackDirectionFromCell(state, cell);
  return direction ? { type: "ATTACK", direction } : null;
}
