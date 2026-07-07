import type { Direction, Grid, Position, Tile } from "./types";

export function getRows(grid: Grid): number {
  return grid.length;
}

export function getCols(grid: Grid): number {
  return grid[0]?.length ?? 0;
}

export function inBounds(grid: Grid, pos: Position): boolean {
  return (
    pos.row >= 0 &&
    pos.row < getRows(grid) &&
    pos.col >= 0 &&
    pos.col < getCols(grid)
  );
}

export function getTile(grid: Grid, pos: Position): Tile | null {
  if (!inBounds(grid, pos)) {
    return null;
  }

  return grid[pos.row][pos.col];
}

export function isWalkable(grid: Grid, pos: Position): boolean {
  return getTile(grid, pos) === "EMPTY";
}

export function offsetPosition(pos: Position, direction: Direction): Position {
  switch (direction) {
    case "UP":
      return { row: pos.row - 1, col: pos.col };
    case "DOWN":
      return { row: pos.row + 1, col: pos.col };
    case "LEFT":
      return { row: pos.row, col: pos.col - 1 };
    case "RIGHT":
      return { row: pos.row, col: pos.col + 1 };
  }
}

export function manhattanDistance(a: Position, b: Position): number {
  return Math.abs(a.row - b.row) + Math.abs(a.col - b.col);
}

export function cloneGrid(grid: Grid): Grid {
  return grid.map((row) => [...row]);
}

export function positionsEqual(a: Position, b: Position): boolean {
  return a.row === b.row && a.col === b.col;
}
