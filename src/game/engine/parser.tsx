import {
  ALL_DIRECTIONS,
  INSTRUCTION_MAP,
  INSTRUCTION_STRINGS,
} from "./constants";
import { offsetPosition, positionsEqual } from "./grid";
import type { Direction, GameState, Instruction } from "./types";

export function parseInstruction(input: string): Instruction | null {
  const normalized = input.trim();
  return INSTRUCTION_MAP.get(normalized) ?? null;
}

export function instructionToString(instruction: Instruction): string {
  if (instruction.type === "SHIELD") {
    return "SHIELD()";
  }

  if (instruction.type === "WAIT") {
    return "WAIT()";
  }

  return `${instruction.type}(${instruction.direction})`;
}

export function getCompletions(partial: string): string[] {
  const normalized = partial.trimStart();

  return INSTRUCTION_STRINGS.filter((candidate) =>
    candidate.startsWith(normalized),
  );
}

export function isValidInstruction(input: string): boolean {
  return parseInstruction(input) !== null;
}

function canPlayerMoveTo(state: GameState, direction: Direction): boolean {
  const playerFrom = { row: state.player.row, col: state.player.col };
  const opponentFrom = { row: state.opponent.row, col: state.opponent.col };
  const target = offsetPosition(playerFrom, direction);
  const { grid } = state;

  if (
    target.row < 0 ||
    target.row >= grid.length ||
    target.col < 0 ||
    target.col >= grid[0].length
  ) {
    return false;
  }

  if (grid[target.row][target.col] !== "EMPTY") {
    return false;
  }

  return !positionsEqual(target, opponentFrom);
}

export function getPlayableInstructionStrings(state: GameState): string[] {
  const instructions: string[] = [];

  for (const direction of ALL_DIRECTIONS) {
    if (canPlayerMoveTo(state, direction)) {
      instructions.push(`MOVE(${direction})`);
    }
  }

  for (const direction of ALL_DIRECTIONS) {
    instructions.push(`ATTACK(${direction})`);
  }

  instructions.push("SHIELD()");

  return instructions;
}
