import { TINY_SIMULATION } from "../__fixtures__/tiny";
import { ACTIVE_SIMULATION } from "../../simulations/active";
import {
  createFreshSave,
  deleteSimulation,
  gameStateToSave,
  loadRoot,
  loadSimulation,
  resetStorageForTests,
  saveSimulation,
  saveToGameState,
  setRawStorageForTests,
  setTutorialDone,
  getTutorialDone,
} from "../../storage/simulationStorage";
import { step } from "../runner";

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

resetStorageForTests();

// --- fresh save ---
{
  const fresh = createFreshSave(ACTIVE_SIMULATION);
  assert(fresh.attemptsRemaining === 2, "fresh save has 2 attempts");
  assert(fresh.status === "playing", "fresh save is playing");
  assert(
    fresh.player.row === ACTIVE_SIMULATION.playerStart.row &&
      fresh.player.col === ACTIVE_SIMULATION.playerStart.col,
    "fresh save player spawn",
  );
  assert(
    fresh.opponent.row === ACTIVE_SIMULATION.opponentStart.row &&
      fresh.opponent.col === ACTIVE_SIMULATION.opponentStart.col,
    "fresh save opponent spawn",
  );
  assert(
    fresh.player.lives === 2 && fresh.opponent.lives === 2,
    "fresh save lives",
  );
}

// --- save/load round trip ---
{
  saveSimulation(ACTIVE_SIMULATION.id, createFreshSave(ACTIVE_SIMULATION));
  let state = saveToGameState(loadSimulation(ACTIVE_SIMULATION.id)!);

  const result = step(state, { type: "SHIELD" }, ACTIVE_SIMULATION);
  state = result.nextState;

  const midGameSave = gameStateToSave(state, {
    attemptsRemaining: 2,
    status: "playing",
  });
  saveSimulation(ACTIVE_SIMULATION.id, midGameSave);

  const loaded = loadSimulation(ACTIVE_SIMULATION.id)!;
  assert(loaded.cycle === 1, "round trip preserves cycle");
  assert(loaded.player.lives === 2, "round trip preserves player lives");
  assert(loaded.opponent.lives === 2, "round trip preserves opponent lives");
  assert(
    loaded.player.row === state.player.row &&
      loaded.opponent.col === state.opponent.col,
    "round trip preserves positions",
  );
}

// --- tutorialDone at root ---
{
  setTutorialDone(true);
  assert(getTutorialDone(), "tutorialDone saved");
  assert(loadRoot().tutorialDone, "tutorialDone in root");
}

// --- multiple sim ids ---
{
  saveSimulation("sim-001", createFreshSave(ACTIVE_SIMULATION));
  saveSimulation("sim-002", createFreshSave(TINY_SIMULATION));

  const root = loadRoot();
  assert(!!root.simulations["sim-001"], "sim-001 cached");
  assert(!!root.simulations["sim-002"], "sim-002 cached");
  assert(
    root.simulations["sim-001"].player.row === 4 &&
      root.simulations["sim-002"].player.row === 2,
    "sim saves are independent",
  );

  deleteSimulation("sim-002");
  assert(loadSimulation("sim-002") === null, "deleteSimulation removes entry");
  assert(
    loadSimulation("sim-001") !== null,
    "deleteSimulation keeps other entries",
  );
}

// --- missing / corrupt key ---
{
  resetStorageForTests();
  assert(
    loadRoot().tutorialDone === false,
    "missing key defaults tutorialDone",
  );
  assert(loadSimulation("sim-001") === null, "missing key returns null save");

  setRawStorageForTests("{not json");
  assert(loadRoot().version === 1, "corrupt json falls back to default root");

  setRawStorageForTests(
    JSON.stringify({
      version: 1,
      tutorialDone: false,
      simulations: { bad: { foo: "bar" } },
    }),
  );
  assert(
    loadSimulation("bad") === null,
    "invalid save entries are filtered out",
  );
}

console.log("Phase 4 OK");
