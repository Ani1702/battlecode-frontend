"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ATTACK_CHARGE_MS,
  BEAM_FADE_MS,
  BEAM_TRAVEL_MS,
  COMBAT_HOLD_MS,
  canUseAction,
  cycleHasAttack,
  INVALID_CELL_FLASH_MS,
  MOVE_ANIMATION_MS,
} from "../engine/constants";
import {
  type ActionMode,
  getPreviewCellsForSelection,
  instructionFromSelection,
  isValidAttackCell,
  isValidMoveCell,
} from "../engine/actionSelection";
import { instructionToString } from "../engine/parser";
import { step } from "../engine/runner";
import { ACTIVE_SIMULATION } from "../simulations/active";
import {
  createFreshSave,
  gameStateToSave,
  getTutorialDone,
  loadSimulation,
  saveSimulation,
  saveToGameState,
  setTutorialDone,
  type SimulationSave,
  type SimulationStatus,
} from "../storage/simulationStorage";
import type {
  GameEvent,
  GameState,
  Instruction,
  Position,
  StepResult,
} from "../engine/types";
import { SimEvents } from "@/lib/analytics";
import {
  buildCombatVfxPayload,
  getMoveTweens,
  type AnimationPhase,
  type CombatVfxPayload,
} from "@/components/simulation/combatVfxTypes";

export type GamePhase =
  | "loading"
  | "tutorial"
  | "playing"
  | "animating"
  | "won"
  | "lost"
  | "exhausted";

function resolvePlayingPhase(): GamePhase {
  return getTutorialDone() ? "playing" : "tutorial";
}

function resolvePhaseFromSave(save: SimulationSave): GamePhase {
  if (save.status !== "playing") {
    return save.status;
  }

  return resolvePlayingPhase();
}

function trackOutcomePhase(phase: GamePhase, save: SimulationSave): void {
  if (phase === "won") {
    SimEvents.win(save.cyclesToWin ?? 0);
    return;
  }

  if (phase === "lost") {
    SimEvents.loss(save.attemptsRemaining);
    return;
  }

  if (phase === "exhausted") {
    SimEvents.attemptsExhausted();
  }
}

interface PendingTransition {
  save: SimulationSave;
  phase: GamePhase;
  preState: GameState;
}

function resolveOutcome(
  result: StepResult,
  currentSave: SimulationSave,
): { save: SimulationSave; phase: GamePhase } {
  if (result.outcome === "win") {
    return {
      save: gameStateToSave(result.nextState, {
        attemptsRemaining: currentSave.attemptsRemaining,
        status: "won",
        cyclesToWin: result.nextState.cycle,
        playerLivesRemaining: result.nextState.player.lives,
      }),
      phase: "won",
    };
  }

  if (result.outcome === "loss") {
    const attemptsRemaining = Math.max(0, currentSave.attemptsRemaining - 1);
    const status: SimulationStatus =
      attemptsRemaining === 0 ? "exhausted" : "lost";

    return {
      save: gameStateToSave(result.nextState, {
        attemptsRemaining,
        status,
      }),
      phase: status,
    };
  }

  return {
    save: gameStateToSave(result.nextState, {
      attemptsRemaining: currentSave.attemptsRemaining,
      status: "playing",
    }),
    phase: "playing",
  };
}

function cloneState(state: GameState): GameState {
  return {
    ...state,
    player: { ...state.player },
    opponent: { ...state.opponent },
    grid: state.grid,
  };
}

function applyMidCycleDisplay(pre: GameState, events: GameEvent[]): GameState {
  const next = cloneState(pre);

  for (const event of events) {
    if (event.type === "SHIELD_UP") {
      const bot = event.bot === "player" ? next.player : next.opponent;
      bot.shieldActive = true;
    }

    if (event.type === "MOVE" && !event.blocked) {
      const bot = event.bot === "player" ? next.player : next.opponent;
      bot.row = event.to.row;
      bot.col = event.to.col;
    }
  }

  return next;
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function animateProgress(
  durationMs: number,
  onFrame: (progress: number) => void,
) {
  return new Promise<void>((resolve) => {
    const start = performance.now();

    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / durationMs);
      onFrame(progress);

      if (progress >= 1) {
        resolve();
        return;
      }

      window.requestAnimationFrame(tick);
    };

    window.requestAnimationFrame(tick);
  });
}

export function useSimulationGame() {
  const config = ACTIVE_SIMULATION;
  const [phase, setPhase] = useState<GamePhase>("loading");
  const [save, setSave] = useState<SimulationSave | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [displayState, setDisplayState] = useState<GameState | null>(null);
  const [lastStep, setLastStep] = useState<StepResult | null>(null);
  const [pendingTransition, setPendingTransition] =
    useState<PendingTransition | null>(null);
  const [actionMode, setActionModeState] = useState<ActionMode | null>(null);
  const [selectedCell, setSelectedCell] = useState<Position | null>(null);
  const [previewCells, setPreviewCells] = useState<Position[]>([]);
  const [invalidFlashCell, setInvalidFlashCell] = useState<Position | null>(
    null,
  );
  const invalidFlashTimerRef = useRef<number | null>(null);
  const [animationPhase, setAnimationPhase] = useState<AnimationPhase>("idle");
  const [moveProgress, setMoveProgress] = useState(1);
  const [beamProgress, setBeamProgress] = useState(0);
  const [fadeOpacity, setFadeOpacity] = useState(1);
  const [vfxPulse, setVfxPulse] = useState(0);
  const [combatVfx, setCombatVfx] = useState<CombatVfxPayload | null>(null);
  const [hitFlashBot, setHitFlashBot] = useState<"player" | "opponent" | null>(
    null,
  );
  const animationTokenRef = useRef(0);

  const clearSelection = useCallback(() => {
    setActionModeState(null);
    setSelectedCell(null);
    setPreviewCells([]);
    setInvalidFlashCell(null);
    if (invalidFlashTimerRef.current !== null) {
      window.clearTimeout(invalidFlashTimerRef.current);
      invalidFlashTimerRef.current = null;
    }
  }, []);

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

  const persistSave = useCallback(
    (nextSave: SimulationSave) => {
      saveSimulation(config.id, nextSave);
      setSave(nextSave);
    },
    [config.id],
  );

  const syncPhaseFromSave = useCallback((loaded: SimulationSave) => {
    setSave(loaded);
    const state = saveToGameState(loaded);
    setGameState(state);
    setDisplayState(state);
    setPhase(resolvePhaseFromSave(loaded));
  }, []);

  useEffect(() => {
    const existing = loadSimulation(config.id);
    if (existing) {
      syncPhaseFromSave(existing);
      return;
    }

    const fresh = createFreshSave(config);
    persistSave(fresh);
    const state = saveToGameState(fresh);
    setGameState(state);
    setDisplayState(state);
    setPhase(resolvePlayingPhase());
  }, [config.id, persistSave, syncPhaseFromSave]);

  const finishAnimation = useCallback(
    (transition: PendingTransition, resolvedState: GameState) => {
      persistSave(transition.save);
      trackOutcomePhase(transition.phase, transition.save);
      setGameState(resolvedState);
      setDisplayState(resolvedState);
      setPhase(transition.phase);
      setPendingTransition(null);
      setLastStep(null);
      setCombatVfx(null);
      setAnimationPhase("idle");
      setMoveProgress(1);
      setBeamProgress(0);
      setFadeOpacity(1);
      setVfxPulse(0);
      setHitFlashBot(null);
      clearSelection();
    },
    [persistSave, clearSelection],
  );

  useEffect(() => {
    if (phase !== "animating" || !pendingTransition || !lastStep) {
      return;
    }

    const token = animationTokenRef.current + 1;
    animationTokenRef.current = token;

    const run = async () => {
      const result = lastStep;
      const transition = pendingTransition;
      const hasAttack = cycleHasAttack(
        result.playerInstruction,
        result.opponentInstruction,
      );

      setCombatVfx(
        buildCombatVfxPayload(
          result.events,
          result.beamPaths,
          result.combatScenario,
          result.clashPoint,
        ),
      );

      setAnimationPhase("move");
      setMoveProgress(0);
      await animateProgress(MOVE_ANIMATION_MS, setMoveProgress);

      if (animationTokenRef.current !== token) {
        return;
      }

      setDisplayState(applyMidCycleDisplay(transition.preState, result.events));
      setMoveProgress(1);

      if (!hasAttack) {
        finishAnimation(transition, result.nextState);
        return;
      }

      setAnimationPhase("charge");
      setVfxPulse(0.5);
      await wait(ATTACK_CHARGE_MS);

      if (animationTokenRef.current !== token) {
        return;
      }

      setAnimationPhase("beam");
      setBeamProgress(0);
      await animateProgress(BEAM_TRAVEL_MS, setBeamProgress);

      if (animationTokenRef.current !== token) {
        return;
      }

      setAnimationPhase("hold");
      setBeamProgress(1);
      setGameState((current) => current ?? result.nextState);
      setDisplayState(cloneState(result.nextState));

      const hitEvent = result.events.find(
        (event) => event.type === "DAMAGE" && !event.blockedByShield,
      );
      if (hitEvent?.type === "DAMAGE") {
        setHitFlashBot(hitEvent.bot);
      }

      const holdStart = performance.now();
      while (performance.now() - holdStart < COMBAT_HOLD_MS) {
        if (animationTokenRef.current !== token) {
          return;
        }

        setVfxPulse((Math.sin((performance.now() - holdStart) / 120) + 1) / 2);
        await wait(32);
      }

      setAnimationPhase("fade");
      setHitFlashBot(null);
      await animateProgress(BEAM_FADE_MS, (progress) => {
        setFadeOpacity(1 - progress);
      });

      if (animationTokenRef.current !== token) {
        return;
      }

      finishAnimation(transition, result.nextState);
    };

    void run();

    return () => {
      animationTokenRef.current += 1;
    };
  }, [phase, pendingTransition, lastStep, finishAnimation]);

  const setActionMode = useCallback(
    (mode: ActionMode) => {
      if (phase !== "playing" || !gameState) {
        return;
      }

      if (mode === "attack" && !canUseAction(gameState.player, "ATTACK")) {
        return;
      }

      if (mode === "shield" && !canUseAction(gameState.player, "SHIELD")) {
        return;
      }

      setActionModeState(mode);
      setSelectedCell(null);
      setInvalidFlashCell(null);

      if (mode === "shield") {
        setPreviewCells(getPreviewCellsForSelection("shield", gameState, null));
        return;
      }

      setPreviewCells([]);
    },
    [phase, gameState],
  );

  const handleCellClick = useCallback(
    (cell: Position) => {
      if (phase !== "playing" || !gameState || !actionMode) {
        return;
      }

      if (actionMode === "shield") {
        return;
      }

      if (actionMode === "move") {
        if (!isValidMoveCell(gameState, cell)) {
          triggerInvalidFlash(cell);
          return;
        }

        setSelectedCell(cell);
        setPreviewCells(getPreviewCellsForSelection("move", gameState, cell));
        return;
      }

      if (!isValidAttackCell(gameState, cell)) {
        triggerInvalidFlash(cell);
        return;
      }

      setSelectedCell(cell);
      setPreviewCells(getPreviewCellsForSelection("attack", gameState, cell));
    },
    [phase, gameState, actionMode, triggerInvalidFlash],
  );

  const pendingInstruction: Instruction | null =
    actionMode && gameState
      ? instructionFromSelection(actionMode, gameState, selectedCell)
      : null;

  const canSubmit =
    phase === "playing" &&
    pendingInstruction !== null &&
    ((actionMode !== "move" && actionMode !== "attack") ||
      selectedCell !== null);

  const submitSelection = useCallback(() => {
    if (phase !== "playing" || !gameState || !save || !pendingInstruction) {
      return;
    }

    const preState = cloneState(gameState);
    const result = step(preState, pendingInstruction, config);
    const transition = resolveOutcome(result, save);

    SimEvents.cycleSubmit(result.nextState.cycle);
    clearSelection();
    setDisplayState(preState);
    setLastStep(result);
    setPendingTransition({ ...transition, preState });
    setMoveProgress(0);
    setBeamProgress(0);
    setFadeOpacity(1);
    setPhase("animating");
  }, [phase, gameState, save, pendingInstruction, config, clearSelection]);

  const retryAfterLoss = useCallback(() => {
    if (!save || save.attemptsRemaining <= 0) {
      return;
    }

    animationTokenRef.current += 1;
    const fresh = createFreshSave(config);
    fresh.attemptsRemaining = save.attemptsRemaining;
    persistSave(fresh);
    const state = saveToGameState(fresh);
    setGameState(state);
    setDisplayState(state);
    setLastStep(null);
    setPendingTransition(null);
    setCombatVfx(null);
    clearSelection();
    setAnimationPhase("idle");
    setPhase("playing");
  }, [save, config, persistSave, clearSelection]);

  const completeTutorial = useCallback(() => {
    setTutorialDone(true);
    SimEvents.tutorialComplete();
    setPhase("playing");
  }, []);

  const skipTutorial = useCallback(() => {
    setTutorialDone(true);
    SimEvents.tutorialSkip();
    setPhase("playing");
  }, []);

  const opponentInstruction: Instruction | null =
    lastStep?.opponentInstruction ?? null;

  const boardState = displayState ?? gameState;
  const moveTweens =
    boardState && lastStep && animationPhase === "move"
      ? getMoveTweens(lastStep.events, moveProgress)
      : {};

  return {
    config,
    phase,
    save,
    gameState: boardState,
    lastStep,
    combatVfx,
    animationPhase,
    moveTweens,
    hitFlashBot,
    beamProgress,
    fadeOpacity,
    vfxPulse,
    isAnimating: phase === "animating",
    opponentInstruction,
    opponentInstructionLabel: opponentInstruction
      ? instructionToString(opponentInstruction)
      : null,
    actionMode,
    previewCells,
    invalidFlashCell,
    canSubmit,
    setActionMode,
    handleCellClick,
    submitSelection,
    retryAfterLoss,
    completeTutorial,
    skipTutorial,
  };
}
