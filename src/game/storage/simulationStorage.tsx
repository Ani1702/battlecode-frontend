import { STARTING_ATTEMPTS } from "../engine/constants";
import { createInitialState } from "../engine/runner";
import type { Bot, GameState, Grid, SimulationConfig } from "../engine/types";

export const STORAGE_KEY = "battlecode_sim_v1";

export type SimulationStatus = "playing" | "won" | "lost" | "exhausted";

export interface SimulationSave {
  attemptsRemaining: number;
  status: SimulationStatus;
  cycle: number;
  player: Bot;
  opponent: Bot;
  grid: Grid;
  cyclesToWin?: number;
  playerLivesRemaining?: number;
}

export interface RootStorage {
  version: 1;
  tutorialDone: boolean;
  simulations: Record<string, SimulationSave>;
}

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

const memoryStore: Record<string, string> = {};

function getStorage(): StorageLike {
  if (typeof window !== "undefined" && window.localStorage) {
    return window.localStorage;
  }

  return {
    getItem: (key) => memoryStore[key] ?? null,
    setItem: (key, value) => {
      memoryStore[key] = value;
    },
    removeItem: (key) => {
      delete memoryStore[key];
    },
  };
}

function createDefaultRoot(): RootStorage {
  return {
    version: 1,
    tutorialDone: false,
    simulations: {},
  };
}

function isSimulationSave(value: unknown): value is SimulationSave {
  if (!value || typeof value !== "object") {
    return false;
  }

  const save = value as SimulationSave;
  return (
    typeof save.attemptsRemaining === "number" &&
    typeof save.status === "string" &&
    typeof save.cycle === "number" &&
    !!save.player &&
    !!save.opponent &&
    Array.isArray(save.grid)
  );
}

function parseRoot(raw: string | null): RootStorage {
  if (!raw) {
    return createDefaultRoot();
  }

  try {
    const parsed = JSON.parse(raw) as Partial<RootStorage>;

    if (parsed.version !== 1 || typeof parsed !== "object") {
      return createDefaultRoot();
    }

    return {
      version: 1,
      tutorialDone: parsed.tutorialDone === true,
      simulations:
        parsed.simulations && typeof parsed.simulations === "object"
          ? Object.fromEntries(
              Object.entries(parsed.simulations).filter(([, save]) =>
                isSimulationSave(save),
              ),
            )
          : {},
    };
  } catch {
    return createDefaultRoot();
  }
}

export function resetStorageForTests(): void {
  getStorage().removeItem(STORAGE_KEY);
}

/** Dev-only helper for corrupt storage tests */
export function setRawStorageForTests(raw: string | null): void {
  if (raw === null) {
    resetStorageForTests();
    return;
  }

  getStorage().setItem(STORAGE_KEY, raw);
}

export function loadRoot(): RootStorage {
  return parseRoot(getStorage().getItem(STORAGE_KEY));
}

export function saveRoot(root: RootStorage): void {
  getStorage().setItem(STORAGE_KEY, JSON.stringify(root));
}

export function getTutorialDone(): boolean {
  return loadRoot().tutorialDone;
}

export function setTutorialDone(done: boolean): void {
  const root = loadRoot();
  root.tutorialDone = done;
  saveRoot(root);
}

export function loadSimulation(id: string): SimulationSave | null {
  return loadRoot().simulations[id] ?? null;
}

export function saveSimulation(id: string, save: SimulationSave): void {
  const root = loadRoot();
  root.simulations[id] = save;
  saveRoot(root);
}

export function deleteSimulation(id: string): void {
  const root = loadRoot();
  delete root.simulations[id];
  saveRoot(root);
}

export function createFreshSave(config: SimulationConfig): SimulationSave {
  const initialState = createInitialState(config);

  return gameStateToSave(initialState, {
    attemptsRemaining: STARTING_ATTEMPTS,
    status: "playing",
  });
}

export function gameStateToSave(
  state: GameState,
  meta: {
    attemptsRemaining: number;
    status: SimulationStatus;
    cyclesToWin?: number;
    playerLivesRemaining?: number;
  },
): SimulationSave {
  return {
    attemptsRemaining: meta.attemptsRemaining,
    status: meta.status,
    cycle: state.cycle,
    player: { ...state.player, shieldActive: false },
    opponent: { ...state.opponent, shieldActive: false },
    grid: state.grid.map((row) => [...row]),
    cyclesToWin: meta.cyclesToWin,
    playerLivesRemaining: meta.playerLivesRemaining,
  };
}

export function saveToGameState(save: SimulationSave): GameState {
  return {
    cycle: save.cycle,
    grid: save.grid.map((row) => [...row]),
    player: { ...save.player, shieldActive: false },
    opponent: { ...save.opponent, shieldActive: false },
  };
}
