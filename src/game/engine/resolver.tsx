import { detectHeadOnClash, getBeamPath } from "./beam";
import {
  ATTACK_COOLDOWN_TURNS,
  isInstructionAllowed,
  SHIELD_COOLDOWN_TURNS,
} from "./constants";
import { cloneGameState } from "./opponent";
import { offsetPosition, positionsEqual } from "./grid";
import type {
  BeamPath,
  Bot,
  GameEvent,
  GameOutcome,
  GameState,
  Instruction,
} from "./types";

export interface ResolveCycleResult {
  nextState: GameState;
  events: GameEvent[];
  beamPaths: BeamPath[];
  outcome: GameOutcome;
}

function applyShields(
  state: GameState,
  playerInstruction: Instruction,
  opponentInstruction: Instruction,
  events: GameEvent[],
): void {
  if (playerInstruction.type === "SHIELD") {
    state.player.shieldActive = true;
    events.push({ type: "SHIELD_UP", bot: "player" });
  }

  if (opponentInstruction.type === "SHIELD") {
    state.opponent.shieldActive = true;
    events.push({ type: "SHIELD_UP", bot: "opponent" });
  }
}

function applyMoves(
  state: GameState,
  playerInstruction: Instruction,
  opponentInstruction: Instruction,
  events: GameEvent[],
): void {
  const playerFrom = { row: state.player.row, col: state.player.col };
  const opponentFrom = { row: state.opponent.row, col: state.opponent.col };

  const playerTarget =
    playerInstruction.type === "MOVE"
      ? offsetPosition(playerFrom, playerInstruction.direction)
      : null;
  const opponentTarget =
    opponentInstruction.type === "MOVE"
      ? offsetPosition(opponentFrom, opponentInstruction.direction)
      : null;

  const playerCanMove =
    playerTarget !== null &&
    isValidMoveTarget(state, playerTarget, opponentFrom);
  const opponentCanMove =
    opponentTarget !== null &&
    isValidMoveTarget(state, opponentTarget, playerFrom);

  let playerMoves = false;
  let opponentMoves = false;

  if (playerCanMove && opponentCanMove) {
    const isSwap =
      positionsEqual(playerTarget!, opponentFrom) &&
      positionsEqual(opponentTarget!, playerFrom);
    const isSameTarget = positionsEqual(playerTarget!, opponentTarget!);

    if (!isSwap && !isSameTarget) {
      playerMoves = true;
      opponentMoves = true;
    }
  } else if (playerCanMove) {
    playerMoves = true;
  } else if (opponentCanMove) {
    opponentMoves = true;
  }

  if (playerMoves && playerTarget) {
    state.player.row = playerTarget.row;
    state.player.col = playerTarget.col;
    events.push({
      type: "MOVE",
      bot: "player",
      from: playerFrom,
      to: playerTarget,
      blocked: false,
    });
  } else if (playerInstruction.type === "MOVE") {
    events.push({
      type: "MOVE",
      bot: "player",
      from: playerFrom,
      to: playerTarget ?? playerFrom,
      blocked: true,
    });
  }

  if (opponentMoves && opponentTarget) {
    state.opponent.row = opponentTarget.row;
    state.opponent.col = opponentTarget.col;
    events.push({
      type: "MOVE",
      bot: "opponent",
      from: opponentFrom,
      to: opponentTarget,
      blocked: false,
    });
  } else if (opponentInstruction.type === "MOVE") {
    events.push({
      type: "MOVE",
      bot: "opponent",
      from: opponentFrom,
      to: opponentTarget ?? opponentFrom,
      blocked: true,
    });
  }
}

function isValidMoveTarget(
  state: GameState,
  target: { row: number; col: number },
  otherFrom: { row: number; col: number },
): boolean {
  const { grid } = state;

  if (
    target.row < 0 ||
    target.row >= grid.length ||
    target.col < 0 ||
    target.col >= grid[0].length
  ) {
    return false;
  }

  if (grid[target.row][target.col] !== "EMPTY") {
    return false;
  }

  return !positionsEqual(target, otherFrom);
}

function resolveAttacks(
  state: GameState,
  playerInstruction: Instruction,
  opponentInstruction: Instruction,
  events: GameEvent[],
  beamPaths: BeamPath[],
): void {
  const clash = detectHeadOnClash(
    state,
    playerInstruction,
    opponentInstruction,
  );

  if (clash) {
    beamPaths.push(clash.playerPath, clash.opponentPath);
    events.push({
      type: "CLASH",
      clashPoint: clash.clashPoint,
      playerPath: clash.playerPath,
      opponentPath: clash.opponentPath,
    });
    events.push({ type: "ATTACK", bot: "player", path: clash.playerPath });
    events.push({ type: "ATTACK", bot: "opponent", path: clash.opponentPath });
    return;
  }

  applyAttack(
    state,
    state.player,
    state.opponent,
    playerInstruction,
    events,
    beamPaths,
  );
  applyAttack(
    state,
    state.opponent,
    state.player,
    opponentInstruction,
    events,
    beamPaths,
  );
}

function applyAttack(
  state: GameState,
  attacker: Bot,
  target: Bot,
  instruction: Instruction,
  events: GameEvent[],
  beamPaths: BeamPath[],
): void {
  if (instruction.type !== "ATTACK") {
    return;
  }

  const path = getBeamPath(state.grid, attacker, instruction.direction, target);
  beamPaths.push(path);
  events.push({ type: "ATTACK", bot: attacker.id, path });

  if (!path.hit) {
    return;
  }

  if (target.shieldActive) {
    events.push({ type: "DAMAGE", bot: target.id, blockedByShield: true });
    return;
  }

  target.lives = Math.max(0, target.lives - 1) as Bot["lives"];
  events.push({ type: "DAMAGE", bot: target.id, blockedByShield: false });
}

function applyCleanup(
  state: GameState,
  playerInstruction: Instruction,
  opponentInstruction: Instruction,
  events: GameEvent[],
): void {
  state.player.shieldActive = false;
  state.opponent.shieldActive = false;

  state.player.attackCooldown = Math.max(0, state.player.attackCooldown - 1);
  state.player.shieldCooldown = Math.max(0, state.player.shieldCooldown - 1);
  state.opponent.attackCooldown = Math.max(
    0,
    state.opponent.attackCooldown - 1,
  );
  state.opponent.shieldCooldown = Math.max(
    0,
    state.opponent.shieldCooldown - 1,
  );

  if (playerInstruction.type === "ATTACK") {
    state.player.attackCooldown = ATTACK_COOLDOWN_TURNS;
  } else if (playerInstruction.type === "SHIELD") {
    state.player.shieldCooldown = SHIELD_COOLDOWN_TURNS;
  }

  if (opponentInstruction.type === "ATTACK") {
    state.opponent.attackCooldown = ATTACK_COOLDOWN_TURNS;
  } else if (opponentInstruction.type === "SHIELD") {
    state.opponent.shieldCooldown = SHIELD_COOLDOWN_TURNS;
  }

  state.cycle += 1;
  events.push({ type: "CYCLE_END", cycle: state.cycle });
}

function checkOutcome(state: GameState, maxCycles: number): GameOutcome {
  if (state.opponent.lives === 0 && state.player.lives === 0) {
    return "loss";
  }

  if (state.opponent.lives === 0) {
    return "win";
  }

  if (state.player.lives === 0 || state.cycle >= maxCycles) {
    return "loss";
  }

  return "continue";
}

export function resolveCycle(
  state: GameState,
  playerInstruction: Instruction,
  opponentInstruction: Instruction,
  maxCycles: number,
): ResolveCycleResult {
  if (!isInstructionAllowed(state.player, playerInstruction)) {
    throw new Error("Player instruction not allowed (cooldown)");
  }

  if (!isInstructionAllowed(state.opponent, opponentInstruction)) {
    throw new Error("Opponent instruction not allowed (cooldown)");
  }

  const nextState = cloneGameState(state);
  const events: GameEvent[] = [];
  const beamPaths: BeamPath[] = [];

  applyShields(nextState, playerInstruction, opponentInstruction, events);
  applyMoves(nextState, playerInstruction, opponentInstruction, events);
  resolveAttacks(
    nextState,
    playerInstruction,
    opponentInstruction,
    events,
    beamPaths,
  );
  applyCleanup(nextState, playerInstruction, opponentInstruction, events);

  return {
    nextState,
    events,
    beamPaths,
    outcome: checkOutcome(nextState, maxCycles),
  };
}
