import {
  ATTACK_CHARGE_MS,
  BEAM_FADE_MS,
  BEAM_TRAVEL_MS,
  COMBAT_HOLD_MS,
  cycleHasAttack,
  MOVE_ANIMATION_MS,
} from "@/game/engine/constants";
import type { GameEvent, GameState, StepResult } from "@/game/engine/types";
import {
  buildCombatVfxPayload,
  getMoveTweens,
  type AnimationPhase,
  type CombatVfxPayload,
} from "./combatVfxTypes";

export function cloneDisplayState(state: GameState): GameState {
  return {
    ...state,
    player: { ...state.player },
    opponent: { ...state.opponent },
    grid: state.grid,
  };
}

function applyMidCycleDisplay(pre: GameState, events: GameEvent[]): GameState {
  const next = cloneDisplayState(pre);

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
): Promise<void> {
  return new Promise((resolve) => {
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

export interface CycleAnimationFrame {
  displayState: GameState;
  animationPhase: AnimationPhase;
  moveProgress: number;
  beamProgress: number;
  fadeOpacity: number;
  vfxPulse: number;
  combatVfx: CombatVfxPayload | null;
  hitFlashBot: "player" | "opponent" | null;
  moveTweens: ReturnType<typeof getMoveTweens>;
}

export interface CycleAnimationCallbacks {
  onFrame: (frame: CycleAnimationFrame) => void;
}

export async function playCycleAnimation(
  preState: GameState,
  result: StepResult,
  tokenRef: { current: number },
  token: number,
  callbacks: CycleAnimationCallbacks,
): Promise<boolean> {
  const hasAttack = cycleHasAttack(
    result.playerInstruction,
    result.opponentInstruction,
  );

  const combatVfx = buildCombatVfxPayload(
    result.events,
    result.beamPaths,
    result.combatScenario,
    result.clashPoint,
  );

  callbacks.onFrame({
    displayState: preState,
    animationPhase: "move",
    moveProgress: 0,
    beamProgress: 0,
    fadeOpacity: 1,
    vfxPulse: 0,
    combatVfx,
    hitFlashBot: null,
    moveTweens: getMoveTweens(result.events, 0),
  });

  let moveProgress = 0;
  await animateProgress(MOVE_ANIMATION_MS, (progress) => {
    if (tokenRef.current !== token) {
      return;
    }

    moveProgress = progress;
    callbacks.onFrame({
      displayState: preState,
      animationPhase: "move",
      moveProgress,
      beamProgress: 0,
      fadeOpacity: 1,
      vfxPulse: 0,
      combatVfx,
      hitFlashBot: null,
      moveTweens: getMoveTweens(result.events, progress),
    });
  });

  if (tokenRef.current !== token) {
    return false;
  }

  const midState = applyMidCycleDisplay(preState, result.events);

  callbacks.onFrame({
    displayState: midState,
    animationPhase: "move",
    moveProgress: 1,
    beamProgress: 0,
    fadeOpacity: 1,
    vfxPulse: 0,
    combatVfx,
    hitFlashBot: null,
    moveTweens: getMoveTweens(result.events, 1),
  });

  if (!hasAttack) {
    callbacks.onFrame({
      displayState: result.nextState,
      animationPhase: "idle",
      moveProgress: 1,
      beamProgress: 0,
      fadeOpacity: 1,
      vfxPulse: 0,
      combatVfx: null,
      hitFlashBot: null,
      moveTweens: {},
    });
    return true;
  }

  callbacks.onFrame({
    displayState: midState,
    animationPhase: "charge",
    moveProgress: 1,
    beamProgress: 0,
    fadeOpacity: 1,
    vfxPulse: 0.5,
    combatVfx,
    hitFlashBot: null,
    moveTweens: {},
  });

  await wait(ATTACK_CHARGE_MS);
  if (tokenRef.current !== token) {
    return false;
  }

  await animateProgress(BEAM_TRAVEL_MS, (progress) => {
    if (tokenRef.current !== token) {
      return;
    }

    callbacks.onFrame({
      displayState: midState,
      animationPhase: "beam",
      moveProgress: 1,
      beamProgress: progress,
      fadeOpacity: 1,
      vfxPulse: 0.5,
      combatVfx,
      hitFlashBot: null,
      moveTweens: {},
    });
  });

  if (tokenRef.current !== token) {
    return false;
  }

  const hitEvent = result.events.find(
    (event) => event.type === "DAMAGE" && !event.blockedByShield,
  );
  const hitFlashBot = hitEvent?.type === "DAMAGE" ? hitEvent.bot : null;

  callbacks.onFrame({
    displayState: cloneDisplayState(result.nextState),
    animationPhase: "hold",
    moveProgress: 1,
    beamProgress: 1,
    fadeOpacity: 1,
    vfxPulse: 0.5,
    combatVfx,
    hitFlashBot,
    moveTweens: {},
  });

  const holdStart = performance.now();
  while (performance.now() - holdStart < COMBAT_HOLD_MS) {
    if (tokenRef.current !== token) {
      return false;
    }

    const pulse = (Math.sin((performance.now() - holdStart) / 120) + 1) / 2;
    callbacks.onFrame({
      displayState: cloneDisplayState(result.nextState),
      animationPhase: "hold",
      moveProgress: 1,
      beamProgress: 1,
      fadeOpacity: 1,
      vfxPulse: pulse,
      combatVfx,
      hitFlashBot,
      moveTweens: {},
    });
    await wait(32);
  }

  await animateProgress(BEAM_FADE_MS, (progress) => {
    if (tokenRef.current !== token) {
      return;
    }

    callbacks.onFrame({
      displayState: cloneDisplayState(result.nextState),
      animationPhase: "fade",
      moveProgress: 1,
      beamProgress: 1,
      fadeOpacity: 1 - progress,
      vfxPulse: 0,
      combatVfx,
      hitFlashBot: null,
      moveTweens: {},
    });
  });

  if (tokenRef.current !== token) {
    return false;
  }

  callbacks.onFrame({
    displayState: result.nextState,
    animationPhase: "idle",
    moveProgress: 1,
    beamProgress: 0,
    fadeOpacity: 1,
    vfxPulse: 0,
    combatVfx: null,
    hitFlashBot: null,
    moveTweens: {},
  });

  return true;
}
