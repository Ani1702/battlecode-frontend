import type { GameState, Instruction } from "@/game/engine/types";
import {
  TUTORIAL_ATTACK_DEMO,
  TUTORIAL_ATTACK_SCENARIO,
  TUTORIAL_COOLDOWN_SCENARIO,
  TUTORIAL_INTRO_SCENARIO,
  TUTORIAL_MOVE_DEMO,
  TUTORIAL_MOVE_SCENARIO,
  TUTORIAL_SHIELD_DEMO,
  TUTORIAL_SHIELD_SCENARIO,
  type TutorialDemoCycle,
} from "@/game/engine/__fixtures__/tutorialScenarios";

export type TutorialStepType = "watch" | "practice";

export interface TutorialStep {
  id: string;
  type: TutorialStepType;
  title: string;
  body: string;
  scenario: GameState;
  helperText?: string;
  demo?: TutorialDemoCycle;
  pulseLoop?: boolean;
  validateInstruction?: (instruction: Instruction) => boolean;
  successMessage?: string;
}

export const TUTORIAL_RESET_DELAY_MS = 3000;

export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: "intro",
    type: "watch",
    title: "Eliminate the bot",
    body: "You and the opponent each control one bot. Reduce the enemy to 0 lives before you are eliminated. Watch the board — this loops until you press Next.",
    scenario: TUTORIAL_INTRO_SCENARIO,
    pulseLoop: true,
  },
  {
    id: "watch-move",
    type: "watch",
    title: "Move",
    body: "Select Move, click an adjacent cell, then Submit. Your bot slides one cell per cycle.",
    scenario: TUTORIAL_MOVE_SCENARIO,
    demo: TUTORIAL_MOVE_DEMO,
  },
  {
    id: "practice-move",
    type: "practice",
    title: "Try it: Move",
    body: "Move your bot one cell to the right.",
    scenario: TUTORIAL_MOVE_SCENARIO,
    helperText: "Select Move, click the cell to your right, then Submit.",
    validateInstruction: (instruction) =>
      instruction.type === "MOVE" && instruction.direction === "RIGHT",
    successMessage: "Nice move!",
  },
  {
    id: "watch-attack",
    type: "watch",
    title: "Attack",
    body: "Select Attack and click a cell on your row or column. The beam travels that line and can hit the bot.",
    scenario: TUTORIAL_ATTACK_SCENARIO,
    demo: TUTORIAL_ATTACK_DEMO,
  },
  {
    id: "practice-attack",
    type: "practice",
    title: "Try it: Attack",
    body: "Fire a beam to the right and hit the bot.",
    scenario: TUTORIAL_ATTACK_SCENARIO,
    helperText:
      "Select Attack, click a cell to the right on your row, then Submit.",
    validateInstruction: (instruction) =>
      instruction.type === "ATTACK" && instruction.direction === "RIGHT",
    successMessage: "Direct hit!",
  },
  {
    id: "watch-shield",
    type: "watch",
    title: "Shield",
    body: "Select Shield and Submit to block beam damage for that cycle. Both bots act at the same time.",
    scenario: TUTORIAL_SHIELD_SCENARIO,
    demo: TUTORIAL_SHIELD_DEMO,
  },
  {
    id: "practice-shield",
    type: "practice",
    title: "Try it: Shield",
    body: "Raise your shield. (The live bot won't attack here — just practice the input.)",
    scenario: TUTORIAL_SHIELD_SCENARIO,
    helperText: "Select Shield, then Submit.",
    validateInstruction: (instruction) => instruction.type === "SHIELD",
    successMessage: "Shield up!",
  },
  {
    id: "watch-cooldown",
    type: "watch",
    title: "Cooldowns",
    body: "After Attack or Shield, that action is unavailable for 2 cycles. Move is always ready. Notice Attack is greyed out below.",
    scenario: TUTORIAL_COOLDOWN_SCENARIO,
    pulseLoop: true,
  },
  {
    id: "start",
    type: "watch",
    title: "You're ready",
    body: "Press Start to enter the live simulation. You have 2 attempts if you lose. Good luck!",
    scenario: TUTORIAL_INTRO_SCENARIO,
    pulseLoop: true,
  },
];
