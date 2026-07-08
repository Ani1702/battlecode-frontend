"use client";

import { useCallback, useEffect, useState } from "react";
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
} from "../storage/simulationStorage";
import type { GameState, Instruction, StepResult } from "../engine/types";

export type GamePhase = "loading" | "playing" | "won" | "lost" | "exhausted";

export function useSimulationGame() {
  const config = ACTIVE_SIMULATION;
  const [phase, setPhase] = useState<GamePhase>("loading");
  const [save, setSave] = useState<SimulationSave | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [lastStep, setLastStep] = useState<StepResult | null>(null);
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
      setLastStep(result);
      setGameState(result.nextState);

      if (result.outcome === "win") {
        const winSave = gameStateToSave(result.nextState, {
          attemptsRemaining: save.attemptsRemaining,
          status: "won",
          cyclesToWin: result.nextState.cycle,
          playerLivesRemaining: result.nextState.player.lives,
        });
        persistSave(winSave);
        setPhase("won");
        return;
      }

      if (result.outcome === "loss") {
        const attemptsRemaining = Math.max(0, save.attemptsRemaining - 1);
        const status = attemptsRemaining === 0 ? "exhausted" : "lost";
        const lossSave = gameStateToSave(result.nextState, {
          attemptsRemaining,
          status,
        });
        persistSave(lossSave);
        setPhase(status);
        return;
      }

      const playingSave = gameStateToSave(result.nextState, {
        attemptsRemaining: save.attemptsRemaining,
        status: "playing",
      });
      persistSave(playingSave);
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
    opponentInstruction,
    opponentInstructionLabel: opponentInstruction
      ? instructionToString(opponentInstruction)
      : null,
    inputError,
    submitInstruction,
    retryAfterLoss,
  };
}
