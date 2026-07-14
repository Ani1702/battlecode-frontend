import type { ActionMode } from "@/game/engine/actionSelection";
import type { Position } from "@/game/engine/types";
import type { TutorialStep } from "./tutorialSteps";

export interface TutorialVisualHints {
  hintAction: ActionMode | null;
  hintCell: Position | null;
  hintConfirm: boolean;
}

export function getTutorialVisualHints(
  step: TutorialStep,
  actionMode: ActionMode | null,
  confirmReady: boolean,
  isAnimating: boolean,
  practiceSuccess: boolean,
): TutorialVisualHints {
  if (
    step.type !== "practice" ||
    isAnimating ||
    practiceSuccess ||
    !step.hintAction
  ) {
    return { hintAction: null, hintCell: null, hintConfirm: false };
  }

  if (!actionMode || actionMode !== step.hintAction) {
    return {
      hintAction: step.hintAction,
      hintCell: null,
      hintConfirm: false,
    };
  }

  if (step.hintCell) {
    return {
      hintAction: null,
      hintCell: step.hintCell,
      hintConfirm: confirmReady,
    };
  }

  return { hintAction: null, hintCell: null, hintConfirm: false };
}
