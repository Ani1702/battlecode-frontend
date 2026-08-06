import type { Bot, Direction, Instruction } from "./types";

export function canUseAction(bot: Bot, action: "ATTACK" | "SHIELD"): boolean {
  if (action === "ATTACK") {
    return bot.attackCooldown <= 0;
  }

  return bot.shieldCooldown <= 0;
}

export function isInstructionAllowed(
  bot: Bot,
  instruction: Instruction,
): boolean {
  if (instruction.type === "ATTACK") {
    return canUseAction(bot, "ATTACK");
  }

  if (instruction.type === "SHIELD") {
    return canUseAction(bot, "SHIELD");
  }

  return true;
}

export const STARTING_LIVES = 2 as const;

/** Kept for save shape compatibility; attempts are unlimited in gameplay. */
export const STARTING_ATTEMPTS = 5 as const;

export const DEFAULT_MAX_CYCLES = 50;

export const MOVE_ANIMATION_MS = 180;
export const ATTACK_CHARGE_MS = 80;
export const BEAM_TRAVEL_MS = 120;
export const COMBAT_HOLD_MS = 450;
export const BEAM_FADE_MS = 100;

export const ATTACK_COOLDOWN_TURNS = 2;
export const SHIELD_COOLDOWN_TURNS = 2;

export const INVALID_CELL_FLASH_MS = 250;

/** @deprecated Use getCycleAnimationDurationMs */
export const BEAM_ANIMATION_MS =
  MOVE_ANIMATION_MS +
  ATTACK_CHARGE_MS +
  BEAM_TRAVEL_MS +
  COMBAT_HOLD_MS +
  BEAM_FADE_MS;

export function getCycleAnimationDurationMs(hasAttack: boolean): number {
  if (!hasAttack) {
    return MOVE_ANIMATION_MS;
  }

  return BEAM_ANIMATION_MS;
}

export function cycleHasAttack(
  playerInstruction: Instruction,
  opponentInstruction: Instruction,
): boolean {
  return (
    playerInstruction.type === "ATTACK" || opponentInstruction.type === "ATTACK"
  );
}

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
