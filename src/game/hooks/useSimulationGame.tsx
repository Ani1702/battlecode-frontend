"use client";

import { useCallback, useEffect, useState } from "react";
import { BEAM_ANIMATION_MS } from "../engine/constants";
import { instructionToString, parseInstruction } from "../engine/parser";
import { step } from "../engine/runner";
import { ACTIVE_SIMULATION } from "../simulations/active";
import {
  createFreshSave,
  gameStateToSave,
  loadSimulation,
  saveSimulation,
  saveToGameState,
  type SimulationSave,
  type SimulationStatus,
} from "../storage/simulationStorage";
import type {
  BeamPath,
  GameState,
  Instruction,
  StepResult,
} from "../engine/types";

export type GamePhase =
  | "loading"
  | "playing"
  | "animating"
  | "won"
  | "lost"
  | "exhausted";

interface PendingTransition {
  save: SimulationSave;
  phase: GamePhase;
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

export function useSimulationGame() {
  const config = ACTIVE_SIMULATION;
  const [phase, setPhase] = useState<GamePhase>("loading");
  const [save, setSave] = useState<SimulationSave | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [lastStep, setLastStep] = useState<StepResult | null>(null);
  const [beamPaths, setBeamPaths] = useState<BeamPath[] | null>(null);
  const [pendingTransition, setPendingTransition] =
    useState<PendingTransition | null>(null);
  const [inputError, setInputError] = useState<string | null>(null);

  const persistSave = useCallback(
    (nextSave: SimulationSave) => {
      saveSimulation(config.id, nextSave);
      setSave(nextSave);
    },
    [config.id],
  );

  const syncPhaseFromSave = useCallback((loaded: SimulationSave) => {
    setSave(loaded);
    setGameState(saveToGameState(loaded));
    setPhase(loaded.status === "playing" ? "playing" : loaded.status);
  }, []);

  useEffect(() => {
    const existing = loadSimulation(config.id);
    if (existing) {
      syncPhaseFromSave(existing);
      return;
    }

    const fresh = createFreshSave(config);
    persistSave(fresh);
    setGameState(saveToGameState(fresh));
    setPhase("playing");
  }, [config.id, persistSave, syncPhaseFromSave]);

  useEffect(() => {
    if (phase !== "animating" || !pendingTransition) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      persistSave(pendingTransition.save);
      setPhase(pendingTransition.phase);
      setPendingTransition(null);
      setBeamPaths(null);
    }, BEAM_ANIMATION_MS);

    return () => window.clearTimeout(timeoutId);
  }, [phase, pendingTransition, persistSave]);

  const submitInstruction = useCallback(
    (rawInput: string) => {
      if (phase !== "playing" || !gameState || !save) {
        return;
      }

      const instruction = parseInstruction(rawInput);
      if (!instruction) {
        setInputError("Enter a valid instruction, e.g. MOVE(UP) or SHIELD()");
        return;
      }

      setInputError(null);
      const result = step(gameState, instruction, config);
      const transition = resolveOutcome(result, save);

      setLastStep(result);
      setGameState(result.nextState);

      const shouldAnimate = result.beamPaths.some(
        (path) => path.cells.length > 0,
      );

      if (shouldAnimate) {
        setBeamPaths(result.beamPaths);
        setPendingTransition(transition);
        setPhase("animating");
        return;
      }

      setBeamPaths(null);
      persistSave(transition.save);
      setPhase(transition.phase);
    },
    [phase, gameState, save, config, persistSave],
  );

  const retryAfterLoss = useCallback(() => {
    if (!save || save.attemptsRemaining <= 0) {
      return;
    }

    const fresh = createFreshSave(config);
    fresh.attemptsRemaining = save.attemptsRemaining;
    persistSave(fresh);
    setGameState(saveToGameState(fresh));
    setLastStep(null);
    setBeamPaths(null);
    setPendingTransition(null);
    setInputError(null);
    setPhase("playing");
  }, [save, config, persistSave]);

  const opponentInstruction: Instruction | null =
    lastStep?.opponentInstruction ?? null;

  return {
    config,
    phase,
    save,
    gameState,
    lastStep,
    beamPaths,
    isAnimating: phase === "animating",
    opponentInstruction,
    opponentInstructionLabel: opponentInstruction
      ? instructionToString(opponentInstruction)
      : null,
    inputError,
    submitInstruction,
    retryAfterLoss,
  };
}
