import {
  getCols,
  getRows,
  inBounds,
  isWalkable,
  manhattanDistance,
  offsetPosition,
  positionsEqual,
  cloneGrid,
} from "../grid";
import {
  getCompletions,
  instructionToString,
  isValidInstruction,
  parseInstruction,
} from "../parser";
import type { Grid } from "../types";

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

const grid: Grid = [
  ["EMPTY", "WALL"],
  ["EMPTY", "EMPTY"],
];

// --- parser ---
assert(parseInstruction("MOVE(UP)")?.type === "MOVE", "MOVE(UP) type");
assert(parseInstruction("MOVE(UP)")?.direction === "UP", "MOVE(UP) direction");
assert(parseInstruction("  MOVE(UP)  ")?.type === "MOVE", "trim whitespace");
assert(parseInstruction("ATTACK(RIGHT)")?.type === "ATTACK", "ATTACK(RIGHT)");
assert(parseInstruction("SHIELD()")?.type === "SHIELD", "SHIELD()");
assert(parseInstruction("move(up)") === null, "reject lowercase");
assert(parseInstruction("MOVE(UP") === null, "reject incomplete");
assert(parseInstruction("") === null, "reject empty");

assert(
  instructionToString({ type: "MOVE", direction: "LEFT" }) === "MOVE(LEFT)",
  "instructionToString MOVE",
);
assert(
  instructionToString({ type: "SHIELD" }) === "SHIELD()",
  "instructionToString SHIELD",
);

assert(isValidInstruction("MOVE(DOWN)"), "isValidInstruction true");
assert(!isValidInstruction("MOVE(Diagonal)"), "isValidInstruction false");

const attackCompletions = getCompletions("ATTACK(R");
assert(
  attackCompletions.includes("ATTACK(RIGHT)") &&
    !attackCompletions.includes("MOVE(RIGHT)"),
  "ATTACK(R prefix completions",
);
assert(
  getCompletions("M").every((value) => value.startsWith("M")),
  "M prefix completions",
);
assert(
  getCompletions("SHIELD(").includes("SHIELD()"),
  "SHIELD( prefix completions",
);
assert(getCompletions("MOVE(UP)").length === 1, "exact match completion");

// --- grid ---
assert(getRows(grid) === 2, "getRows");
assert(getCols(grid) === 2, "getCols");
assert(inBounds(grid, { row: 0, col: 0 }), "inBounds inside");
assert(!inBounds(grid, { row: 2, col: 0 }), "inBounds outside row");
assert(!inBounds(grid, { row: 0, col: -1 }), "inBounds outside col");
assert(isWalkable(grid, { row: 0, col: 0 }), "walkable empty");
assert(!isWalkable(grid, { row: 0, col: 1 }), "not walkable wall");
assert(!isWalkable(grid, { row: 5, col: 0 }), "not walkable OOB");

assert(
  positionsEqual(offsetPosition({ row: 1, col: 1 }, "UP"), {
    row: 0,
    col: 1,
  }),
  "offset UP",
);
assert(
  positionsEqual(offsetPosition({ row: 1, col: 1 }, "RIGHT"), {
    row: 1,
    col: 2,
  }),
  "offset RIGHT",
);
assert(
  manhattanDistance({ row: 0, col: 0 }, { row: 2, col: 1 }) === 3,
  "manhattan",
);

const cloned = cloneGrid(grid);
cloned[0][0] = "WALL";
assert(grid[0][0] === "EMPTY", "cloneGrid deep copy");

console.log("Phase 1 OK");
