import { chooseOpponentInstruction } from "../opponent";
import { resolveCycle } from "../resolver";
import type { Bot, GameState, Grid } from "../types";

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

function makeBot(
  id: Bot["id"],
  row: number,
  col: number,
  lives: Bot["lives"] = 2,
): Bot {
  return { id, row, col, lives, shieldActive: false };
}

function makeState(
  grid: Grid,
  player: Bot,
  opponent: Bot,
  cycle = 0,
): GameState {
  return { cycle, grid, player, opponent };
}

const empty5x5: Grid = Array.from({ length: 5 }, () =>
  Array.from({ length: 5 }, () => "EMPTY" as const),
);

// 1. Shield blocks aligned attack
{
  const state = makeState(
    empty5x5,
    makeBot("player", 2, 1),
    makeBot("opponent", 2, 4),
  );
  const result = resolveCycle(
    state,
    { type: "SHIELD" },
    { type: "ATTACK", direction: "LEFT" },
    50,
  );
  assert(result.nextState.player.lives === 2, "shield blocks damage");
  assert(result.outcome === "continue", "shield scenario continues");
}

// 2. Player attack hits opponent
{
  const state = makeState(
    empty5x5,
    makeBot("player", 2, 1),
    makeBot("opponent", 2, 4),
  );
  const result = resolveCycle(
    state,
    { type: "ATTACK", direction: "RIGHT" },
    { type: "ATTACK", direction: "UP" },
    50,
  );
  assert(
    result.nextState.opponent.lives === 1,
    "attack reduces opponent lives",
  );
}

// 3. Wall blocks beam — no damage through wall
{
  const grid: Grid = empty5x5.map((row) => [...row]);
  grid[2][3] = "WALL";

  const state = makeState(
    grid,
    makeBot("player", 2, 1),
    makeBot("opponent", 2, 4),
  );
  const result = resolveCycle(
    state,
    { type: "ATTACK", direction: "RIGHT" },
    { type: "ATTACK", direction: "UP" },
    50,
  );
  assert(result.nextState.opponent.lives === 2, "wall prevents beam damage");
  assert(result.beamPaths[0]?.blockedByWall === true, "beam stopped by wall");
}

// 4. Both bots target same cell — neither moves
{
  const state = makeState(
    empty5x5,
    makeBot("player", 2, 2),
    makeBot("opponent", 2, 4),
  );
  const result = resolveCycle(
    state,
    { type: "MOVE", direction: "RIGHT" },
    { type: "MOVE", direction: "LEFT" },
    50,
  );
  assert(
    result.nextState.player.row === 2 && result.nextState.player.col === 2,
    "player did not move",
  );
  assert(
    result.nextState.opponent.row === 2 && result.nextState.opponent.col === 4,
    "opponent did not move",
  );
}

// 5. Opponent attacks when aligned
{
  const state = makeState(
    empty5x5,
    makeBot("player", 2, 4),
    makeBot("opponent", 2, 1),
  );
  const instruction = chooseOpponentInstruction(state);
  assert(
    instruction.type === "ATTACK" && instruction.direction === "RIGHT",
    "opponent attacks toward player",
  );
}

// 6. Opponent moves when not aligned
{
  const state = makeState(
    empty5x5,
    makeBot("player", 4, 4),
    makeBot("opponent", 0, 0),
  );
  const instruction = chooseOpponentInstruction(state);
  assert(
    instruction.type === "MOVE",
    "opponent moves toward player when not aligned",
  );
}

// 7. Mutual elimination — player loss
{
  const state = makeState(
    empty5x5,
    makeBot("player", 2, 1, 1),
    makeBot("opponent", 2, 4, 1),
  );
  const result = resolveCycle(
    state,
    { type: "ATTACK", direction: "RIGHT" },
    { type: "ATTACK", direction: "LEFT" },
    50,
  );
  assert(result.nextState.player.lives === 0, "player eliminated");
  assert(result.nextState.opponent.lives === 0, "opponent eliminated");
  assert(result.outcome === "loss", "mutual elimination is player loss");
}

// Determinism
{
  const state = makeState(
    empty5x5,
    makeBot("player", 4, 4),
    makeBot("opponent", 0, 0),
  );
  const first = chooseOpponentInstruction(state);
  const second = chooseOpponentInstruction(state);
  assert(
    first.type === second.type &&
      (first.type !== "MOVE" ||
        first.direction === (second as typeof first).direction),
    "opponent AI is deterministic",
  );
}

console.log("Phase 2 OK");
