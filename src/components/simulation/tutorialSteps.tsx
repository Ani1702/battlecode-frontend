import type { GameState, Instruction, Position } from "@/game/engine/types";
import type { ActionMode } from "@/game/engine/actionSelection";
import {
  TUTORIAL_ATTACK_SCENARIO,
  TUTORIAL_INTRO_SCENARIO,
  TUTORIAL_MOVE_SCENARIO,
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
  hintAction?: ActionMode;
  hintCell?: Position;
  demo?: TutorialDemoCycle;
  pulseLoop?: boolean;
  opponentInstruction?: Instruction;
  validateInstruction?: (instruction: Instruction) => boolean;
  successMessage?: string;
}

export const TUTORIAL_RESET_DELAY_MS = 3000;

export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: "intro",
    type: "watch",
    title: "Eliminate the bot",
    body: "You and the opponent each have one bot and 2 lives. Win by reducing the enemy to 0 lives first. Each cycle: pick Move, Attack, or Shield — tap the grid to preview, then tap the same cell again to confirm. For Shield, tap Shield, then tap your bot.",
    scenario: TUTORIAL_INTRO_SCENARIO,
    pulseLoop: true,
  },
  {
    id: "practice-move",
    type: "practice",
    title: "Move",
    body: "Move one cell to the right.",
    scenario: TUTORIAL_MOVE_SCENARIO,
    helperText: "Move → tap a cell → tap again to confirm.",
    hintAction: "move",
    hintCell: { row: 2, col: 1 },
    opponentInstruction: { type: "MOVE", direction: "UP" },
    validateInstruction: (instruction) =>
      instruction.type === "MOVE" && instruction.direction === "RIGHT",
    successMessage: "Nice move!",
  },
  {
    id: "practice-attack",
    type: "practice",
    title: "Attack",
    body: "Fire a beam to the right and hit the bot — watch it lose a life.",
    scenario: TUTORIAL_ATTACK_SCENARIO,
    helperText: "Attack → tap a cell on your row → tap again to fire.",
    hintAction: "attack",
    hintCell: { row: 2, col: 2 },
    opponentInstruction: { type: "WAIT" },
    validateInstruction: (instruction) =>
      instruction.type === "ATTACK" && instruction.direction === "RIGHT",
    successMessage: "Direct hit!",
  },
  {
    id: "practice-shield",
    type: "practice",
    title: "Shield",
    body: "The bot will attack this cycle. Raise your shield and block the beam.",
    scenario: TUTORIAL_SHIELD_SCENARIO,
    helperText: "Shield → tap your bot to confirm.",
    hintAction: "shield",
    hintCell: { row: 2, col: 1 },
    opponentInstruction: { type: "ATTACK", direction: "LEFT" },
    validateInstruction: (instruction) => instruction.type === "SHIELD",
    successMessage: "Blocked!",
  },
  {
    id: "start",
    type: "watch",
    title: "You're ready",
    body: "Attack and Shield each have a 2-cycle cooldown after use — Move is always available. You get 2 attempts if you lose. Press Start game when ready.",
    scenario: TUTORIAL_INTRO_SCENARIO,
    pulseLoop: true,
  },
];
