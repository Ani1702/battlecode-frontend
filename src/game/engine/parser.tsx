import { INSTRUCTION_MAP, INSTRUCTION_STRINGS } from "./constants";
import type { Instruction } from "./types";

export function parseInstruction(input: string): Instruction | null {
  const normalized = input.trim();
  return INSTRUCTION_MAP.get(normalized) ?? null;
}

export function instructionToString(instruction: Instruction): string {
  if (instruction.type === "SHIELD") {
    return "SHIELD()";
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
