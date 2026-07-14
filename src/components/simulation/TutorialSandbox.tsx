"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  type ActionMode,
  getPreviewCellsForSelection,
  instructionFromSelection,
  isPlayerBotCell,
  isValidAttackCell,
  isValidMoveCell,
} from "@/game/engine/actionSelection";
import {
  deriveCombatScenario,
  getClashPoint,
} from "@/game/engine/combatScenario";
import { canUseAction, INVALID_CELL_FLASH_MS } from "@/game/engine/constants";
import { positionsEqual } from "@/game/engine/grid";
import { resolveCycle } from "@/game/engine/resolver";
import type {
  GameState,
  Instruction,
  Position,
  StepResult,
} from "@/game/engine/types";
import ActionPanel, { getActionHelperText } from "./ActionPanel";
import GridBoard from "./GridBoard";
import {
  cloneDisplayState,
  playCycleAnimation,
  type CycleAnimationFrame,
} from "./cycleAnimation";
import type { TutorialStep } from "./tutorialSteps";
import { TUTORIAL_RESET_DELAY_MS } from "./tutorialSteps";
import { getTutorialVisualHints } from "./tutorialVisualHints";

const IDLE_FRAME: Omit<CycleAnimationFrame, "displayState"> = {
  animationPhase: "idle",
  moveProgress: 1,
  beamProgress: 0,
  fadeOpacity: 1,
  vfxPulse: 0,
  combatVfx: null,
  hitFlashBot: null,
  moveTweens: {},
};

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function buildStepResult(
  scenario: GameState,
  playerInstruction: Instruction,
  opponentInstruction: Instruction,
): StepResult {
  const result = resolveCycle(
    scenario,
    playerInstruction,
    opponentInstruction,
    50,
  );

  return {
    nextState: result.nextState,
    playerInstruction,
    opponentInstruction,
    beamPaths: result.beamPaths,
    events: result.events,
    outcome: result.outcome,
    combatScenario: deriveCombatScenario(result.events, result.beamPaths),
    clashPoint: getClashPoint(result.events),
  };
}

const DEFAULT_OPPONENT_MOVE: Instruction = { type: "MOVE", direction: "UP" };

export default function TutorialSandbox({
  step,
  runToken,
  compact = false,
  onPracticeComplete,
  onHelperTextChange,
}: {
  step: TutorialStep;
  runToken: number;
  compact?: boolean;
  onPracticeComplete?: () => void;
  onHelperTextChange?: (text: string | null) => void;
}) {
  const [frame, setFrame] = useState<CycleAnimationFrame>(() => ({
    displayState: cloneDisplayState(step.scenario),
    ...IDLE_FRAME,
  }));
  const [actionMode, setActionModeState] = useState<ActionMode | null>(null);
  const [selectedCell, setSelectedCell] = useState<Position | null>(null);
  const [previewCells, setPreviewCells] = useState<Position[]>([]);
  const [invalidFlashCell, setInvalidFlashCell] = useState<Position | null>(
    null,
  );
  const [isAnimating, setIsAnimating] = useState(false);
  const [practiceSuccess, setPracticeSuccess] = useState(false);
  const invalidFlashTimerRef = useRef<number | null>(null);
  const loopTokenRef = useRef(0);

  const resetPracticeSelection = useCallback(() => {
    setActionModeState(null);
    setSelectedCell(null);
    setPreviewCells([]);
    setInvalidFlashCell(null);
  }, []);

  const resetToScenario = useCallback(() => {
    setFrame({
      displayState: cloneDisplayState(step.scenario),
      ...IDLE_FRAME,
    });
    setPracticeSuccess(false);
    resetPracticeSelection();
    setIsAnimating(false);
  }, [step.scenario, resetPracticeSelection]);

  useEffect(() => {
    resetToScenario();
    loopTokenRef.current += 1;
    const loopToken = loopTokenRef.current;

    const applyFrame = (next: CycleAnimationFrame) => {
      if (loopTokenRef.current !== loopToken) {
        return;
      }

      setFrame(next);
    };

    const runWatchLoop = async () => {
      if (step.type !== "watch") {
        return;
      }

      if (step.pulseLoop) {
        while (loopTokenRef.current === loopToken) {
          const pulseStart = performance.now();
          while (performance.now() - pulseStart < 2200) {
            if (loopTokenRef.current !== loopToken) {
              return;
            }

            const pulse =
              ((Math.sin((performance.now() - pulseStart) / 180) + 1) / 2) *
              0.45;

            applyFrame({
              displayState: cloneDisplayState(step.scenario),
              ...IDLE_FRAME,
              vfxPulse: pulse,
            });
            await wait(32);
          }

          await wait(TUTORIAL_RESET_DELAY_MS);
        }
        return;
      }

      if (!step.demo) {
        return;
      }

      while (loopTokenRef.current === loopToken) {
        const preState = cloneDisplayState(step.scenario);
        const result = buildStepResult(
          preState,
          step.demo.playerInstruction,
          step.demo.opponentInstruction,
        );

        setIsAnimating(true);
        const completed = await playCycleAnimation(
          preState,
          result,
          loopTokenRef,
          loopToken,
          { onFrame: applyFrame },
        );

        if (loopTokenRef.current !== loopToken) {
          return;
        }

        setIsAnimating(false);

        if (completed) {
          await wait(TUTORIAL_RESET_DELAY_MS);
          if (loopTokenRef.current !== loopToken) {
            return;
          }
        }
      }
    };

    void runWatchLoop();

    return () => {
      loopTokenRef.current += 1;
    };
  }, [step, runToken, resetToScenario]);

  const triggerInvalidFlash = useCallback((cell: Position) => {
    setInvalidFlashCell(cell);
    setSelectedCell(null);
    setPreviewCells([]);

    if (invalidFlashTimerRef.current !== null) {
      window.clearTimeout(invalidFlashTimerRef.current);
    }

    invalidFlashTimerRef.current = window.setTimeout(() => {
      setInvalidFlashCell(null);
      invalidFlashTimerRef.current = null;
    }, INVALID_CELL_FLASH_MS);
  }, []);

  const setActionMode = useCallback(
    (mode: ActionMode) => {
      if (step.type !== "practice" || isAnimating) {
        return;
      }

      const state = frame.displayState;

      if (mode === "attack" && !canUseAction(state.player, "ATTACK")) {
        return;
      }

      if (mode === "shield" && !canUseAction(state.player, "SHIELD")) {
        return;
      }

      setActionModeState(mode);
      setSelectedCell(null);
      setInvalidFlashCell(null);

      if (mode === "shield") {
        setPreviewCells(getPreviewCellsForSelection("shield", state, null));
        return;
      }

      setPreviewCells([]);
    },
    [step.type, isAnimating, frame.displayState],
  );

  const runPracticeSubmit = useCallback(
    async (instruction: Instruction) => {
      if (step.type !== "practice" || isAnimating) {
        return;
      }

      const opponentInstruction =
        step.opponentInstruction ?? DEFAULT_OPPONENT_MOVE;
      const preState = cloneDisplayState(step.scenario);
      const result = buildStepResult(
        preState,
        instruction,
        opponentInstruction,
      );
      const isValid = step.validateInstruction?.(instruction) ?? false;

      if (isValid) {
        setPracticeSuccess(true);
      }

      setIsAnimating(true);
      resetPracticeSelection();

      const animationToken = loopTokenRef.current;
      await playCycleAnimation(preState, result, loopTokenRef, animationToken, {
        onFrame: setFrame,
      });

      if (loopTokenRef.current !== animationToken) {
        return;
      }

      if (isValid) {
        await wait(900);
        if (loopTokenRef.current !== animationToken) {
          return;
        }
        onPracticeComplete?.();
        return;
      }

      await wait(TUTORIAL_RESET_DELAY_MS);

      if (loopTokenRef.current !== animationToken) {
        return;
      }

      setIsAnimating(false);
      setFrame({
        displayState: cloneDisplayState(step.scenario),
        ...IDLE_FRAME,
      });
    },
    [step, isAnimating, resetPracticeSelection, onPracticeComplete],
  );

  const handleSelectShield = useCallback(() => {
    if (step.type !== "practice" || isAnimating) {
      return;
    }

    const state = frame.displayState;

    if (!canUseAction(state.player, "SHIELD")) {
      return;
    }

    if (actionMode === "shield") {
      return;
    }

    setActionModeState("shield");
    setSelectedCell(null);
    setInvalidFlashCell(null);
    setPreviewCells(getPreviewCellsForSelection("shield", state, null));
  }, [step.type, isAnimating, frame.displayState, actionMode]);

  const handleCellClick = useCallback(
    (cell: Position) => {
      if (step.type !== "practice" || isAnimating || !actionMode) {
        return;
      }

      const state = frame.displayState;

      if (actionMode === "shield") {
        if (isPlayerBotCell(state, cell)) {
          const instruction = instructionFromSelection("shield", state, null);
          if (instruction) {
            void runPracticeSubmit(instruction);
          }
          return;
        }

        triggerInvalidFlash(cell);
        return;
      }

      if (actionMode === "move") {
        if (!isValidMoveCell(state, cell)) {
          triggerInvalidFlash(cell);
          return;
        }

        if (selectedCell && positionsEqual(selectedCell, cell)) {
          const instruction = instructionFromSelection("move", state, cell);
          if (instruction) {
            void runPracticeSubmit(instruction);
          }
          return;
        }

        setSelectedCell(cell);
        setPreviewCells(getPreviewCellsForSelection("move", state, cell));
        return;
      }

      if (!isValidAttackCell(state, cell)) {
        triggerInvalidFlash(cell);
        return;
      }

      if (selectedCell && positionsEqual(selectedCell, cell)) {
        const instruction = instructionFromSelection("attack", state, cell);
        if (instruction) {
          void runPracticeSubmit(instruction);
        }
        return;
      }

      setSelectedCell(cell);
      setPreviewCells(getPreviewCellsForSelection("attack", state, cell));
    },
    [
      step.type,
      isAnimating,
      actionMode,
      frame.displayState,
      selectedCell,
      triggerInvalidFlash,
      runPracticeSubmit,
    ],
  );

  const confirmReady =
    (actionMode === "move" || actionMode === "attack") && selectedCell !== null;

  useEffect(() => {
    if (!onHelperTextChange) {
      return;
    }

    if (step.type !== "practice") {
      onHelperTextChange(null);
      return;
    }

    onHelperTextChange(
      getActionHelperText(actionMode, confirmReady, step.helperText),
    );
  }, [
    step.type,
    step.helperText,
    actionMode,
    confirmReady,
    onHelperTextChange,
  ]);

  const controlsDisabled =
    step.type !== "practice" || isAnimating || step.id === "start";

  const showActionPanel = step.type === "practice";
  const visualHints = getTutorialVisualHints(
    step,
    actionMode,
    confirmReady,
    isAnimating,
    practiceSuccess,
  );

  return (
    <div
      className={
        compact
          ? "flex flex-col gap-3"
          : "flex flex-1 flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,1fr)_280px] lg:items-start lg:gap-6"
      }
    >
      <GridBoard
        state={frame.displayState}
        combatVfx={frame.combatVfx}
        animationPhase={frame.animationPhase}
        moveTweens={frame.moveTweens}
        hitFlashBot={frame.hitFlashBot}
        beamProgress={frame.beamProgress}
        fadeOpacity={frame.fadeOpacity}
        vfxPulse={frame.vfxPulse}
        previewCells={step.type === "practice" ? previewCells : []}
        hintCell={visualHints.hintCell}
        hintConfirm={visualHints.hintConfirm}
        invalidFlashCell={invalidFlashCell}
        shieldPreview={step.type === "practice" && actionMode === "shield"}
        interactionEnabled={
          step.type === "practice" && !isAnimating && actionMode !== null
        }
        compact={compact}
        showLegend={!compact}
        onCellClick={handleCellClick}
      />

      <div className="flex flex-col gap-2">
        {showActionPanel ? (
          <ActionPanel
            actionMode={step.type === "practice" ? actionMode : null}
            attackCooldown={frame.displayState.player.attackCooldown}
            shieldCooldown={frame.displayState.player.shieldCooldown}
            confirmReady={confirmReady}
            disabled={controlsDisabled}
            hideHelperText={compact}
            hintAction={visualHints.hintAction}
            compact={compact}
            onSelectMove={() => setActionMode("move")}
            onSelectAttack={() => setActionMode("attack")}
            onSelectShield={handleSelectShield}
          />
        ) : (
          <div
            className={[
              "rounded-md text-white/50",
              compact
                ? "bg-white/5 px-2 py-2 text-[0.65rem] leading-relaxed"
                : "glass-box p-4 text-xs leading-relaxed",
            ].join(" ")}
          >
            Demo playing on loop — press{" "}
            <span className="text-orange-300">Next</span> when ready.
          </div>
        )}

        {practiceSuccess && step.successMessage ? (
          <p className="text-center text-xs font-medium text-emerald-400">
            {step.successMessage}
          </p>
        ) : null}

        {isAnimating ? (
          <p className="text-center text-[0.65rem] uppercase tracking-wider text-orange-300/80">
            Playing...
          </p>
        ) : null}
      </div>
    </div>
  );
}
