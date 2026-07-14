export type Direction = "UP" | "DOWN" | "LEFT" | "RIGHT";

export type Tile = "EMPTY" | "WALL";

export type Grid = Tile[][];

export type BotId = "player" | "opponent";

export interface Position {
  row: number;
  col: number;
}

export interface Bot {
  id: BotId;
  row: number;
  col: number;
  lives: 0 | 1 | 2;
  shieldActive: boolean;
  attackCooldown: number;
  shieldCooldown: number;
}

export type Instruction =
  | { type: "MOVE"; direction: Direction }
  | { type: "ATTACK"; direction: Direction }
  | { type: "SHIELD" }
  | { type: "WAIT" };

export interface SimulationConfig {
  id: string;
  grid: Grid;
  playerStart: Position;
  opponentStart: Position;
  maxCycles: number;
  nextSimulationDate: string;
  shareEventDate: string;
}

export interface GameState {
  cycle: number;
  player: Bot;
  opponent: Bot;
  grid: Grid;
}

export type GameOutcome = "continue" | "win" | "loss";

export type CombatScenario = "none" | "clash" | "shield_block" | "hit" | "miss";

export interface BeamPath {
  attacker: BotId;
  direction: Direction;
  cells: Position[];
  hit: boolean;
  blockedByWall: boolean;
  truncatedAt?: Position;
}

export type GameEvent =
  | { type: "SHIELD_UP"; bot: BotId }
  | {
      type: "MOVE";
      bot: BotId;
      from: Position;
      to: Position;
      blocked: boolean;
    }
  | { type: "ATTACK"; bot: BotId; path: BeamPath }
  | {
      type: "CLASH";
      clashPoint: Position;
      playerPath: BeamPath;
      opponentPath: BeamPath;
    }
  | { type: "DAMAGE"; bot: BotId; blockedByShield: boolean }
  | { type: "CYCLE_END"; cycle: number };

export interface StepResult {
  nextState: GameState;
  playerInstruction: Instruction;
  opponentInstruction: Instruction;
  beamPaths: BeamPath[];
  events: GameEvent[];
  outcome: GameOutcome;
  combatScenario: CombatScenario;
  clashPoint?: Position;
}
