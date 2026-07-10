import type { BeamPath, CombatScenario, GameEvent } from "./types";

export function deriveCombatScenario(
  events: GameEvent[],
  beamPaths: BeamPath[],
): CombatScenario {
  if (events.some((event) => event.type === "CLASH")) {
    return "clash";
  }

  const hasBeams = beamPaths.some((path) => path.cells.length > 0);
  if (!hasBeams) {
    return "none";
  }

  const damages = events.filter((event) => event.type === "DAMAGE");

  if (damages.some((event) => !event.blockedByShield)) {
    return "hit";
  }

  if (damages.some((event) => event.blockedByShield)) {
    return "shield_block";
  }

  return "miss";
}

export function getClashPoint(events: GameEvent[]) {
  const clash = events.find((event) => event.type === "CLASH");
  return clash?.type === "CLASH" ? clash.clashPoint : undefined;
}
