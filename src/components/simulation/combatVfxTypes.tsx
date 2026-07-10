import type {
  BeamPath,
  BotId,
  CombatScenario,
  GameEvent,
  Position,
} from "@/game/engine/types";

export type AnimationPhase =
  | "idle"
  | "move"
  | "charge"
  | "beam"
  | "hold"
  | "fade";

export interface MoveTween {
  from: Position;
  to: Position;
  progress: number;
}

export interface CombatVfxPayload {
  scenario: CombatScenario;
  beamPaths: BeamPath[];
  clashPoint?: Position;
  shieldBot?: BotId;
  hitBot?: BotId;
}

export function buildCombatVfxPayload(
  events: GameEvent[],
  beamPaths: BeamPath[],
  scenario: CombatScenario,
  clashPoint?: Position,
): CombatVfxPayload {
  const shieldEvent = events.find(
    (event) =>
      event.type === "DAMAGE" &&
      event.blockedByShield &&
      beamPaths.some((path) => path.hit),
  );
  const hitEvent = events.find(
    (event) => event.type === "DAMAGE" && !event.blockedByShield,
  );

  return {
    scenario,
    beamPaths,
    clashPoint,
    shieldBot: shieldEvent?.type === "DAMAGE" ? shieldEvent.bot : undefined,
    hitBot: hitEvent?.type === "DAMAGE" ? hitEvent.bot : undefined,
  };
}

export function getMoveTweens(
  events: GameEvent[],
  progress: number,
): Partial<Record<BotId, MoveTween>> {
  const tweens: Partial<Record<BotId, MoveTween>> = {};

  for (const event of events) {
    if (event.type !== "MOVE" || event.blocked) {
      continue;
    }

    if (event.from.row === event.to.row && event.from.col === event.to.col) {
      continue;
    }

    tweens[event.bot] = {
      from: event.from,
      to: event.to,
      progress,
    };
  }

  return tweens;
}
