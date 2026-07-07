import type { Direction, Instruction } from "./types";

export const STARTING_LIVES = 2 as const;

export const STARTING_ATTEMPTS = 2 as const;

export const DEFAULT_MAX_CYCLES = 50;

export const ALL_DIRECTIONS: Direction[] = ["UP", "DOWN", "LEFT", "RIGHT"];

export const INSTRUCTION_STRINGS = [
  "MOVE(UP)",
  "MOVE(DOWN)",
  "MOVE(LEFT)",
  "MOVE(RIGHT)",
  "ATTACK(UP)",
  "ATTACK(DOWN)",
  "ATTACK(LEFT)",
  "ATTACK(RIGHT)",
  "SHIELD()",
] as const;

export type InstructionString = (typeof INSTRUCTION_STRINGS)[number];

export const INSTRUCTION_MAP: ReadonlyMap<string, Instruction> = new Map([
  ["MOVE(UP)", { type: "MOVE", direction: "UP" }],
  ["MOVE(DOWN)", { type: "MOVE", direction: "DOWN" }],
  ["MOVE(LEFT)", { type: "MOVE", direction: "LEFT" }],
  ["MOVE(RIGHT)", { type: "MOVE", direction: "RIGHT" }],
  ["ATTACK(UP)", { type: "ATTACK", direction: "UP" }],
  ["ATTACK(DOWN)", { type: "ATTACK", direction: "DOWN" }],
  ["ATTACK(LEFT)", { type: "ATTACK", direction: "LEFT" }],
  ["ATTACK(RIGHT)", { type: "ATTACK", direction: "RIGHT" }],
  ["SHIELD()", { type: "SHIELD" }],
]);
