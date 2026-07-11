# BattleCode Simulation — Implementation Plan

> **Companion to:** [`ARCHITECTURE.md`](./ARCHITECTURE.md) (rules & product spec)  
> **Phased build plan:** [`PHASES.md`](./PHASES.md) (testable phases — start here)  
> **Status:** v2 shipped — click input, cooldowns, interactive tutorial modal  
> **Last updated:** 10 July 2026  
> **Route:** `/simulations`

This document specifies **how to build** the simulation mini-game: visual theme, every file, exports, responsibilities, props, and build order. Game rules live in `ARCHITECTURE.md`; this doc does not redefine them.

---

## Table of Contents

1. [Implementation Overview](#1-implementation-overview)
2. [Visual Theme & Design System](#2-visual-theme--design-system)
3. [Complete File Tree](#3-complete-file-tree)
4. [Engine Layer (`src/game/engine/`)](#4-engine-layer-srcgameengine)
5. [Simulation Config (`src/game/simulations/`)](#5-simulation-config-srcgamesimulations)
6. [Storage Layer (`src/game/storage/`)](#6-storage-layer-srcgamestorage)
7. [React Hooks (`src/game/hooks/`)](#7-react-hooks-srcgamehooks)
8. [UI Components (`src/components/simulation/`)](#8-ui-components-srccomponentssimulation)
9. [Route & Layout Changes](#9-route--layout-changes)
10. [Analytics (`src/lib/analytics.tsx`)](#10-analytics-srclibanalyticstsx)
11. [Styles (`globals.css` additions)](#11-styles-globalscss-additions)
12. [Assets (`public/`)](#12-assets-public)
13. [Type Reference (consolidated)](#13-type-reference-consolidated)
14. [Constants & Magic Numbers](#14-constants--magic-numbers)
15. [Component Layout Wireframes](#15-component-layout-wireframes)
16. [Implementation Phases & PR Plan](#16-implementation-phases--pr-plan)
17. [Definition of Done](#17-definition-of-done)
18. [Implementation Status (v1 snapshot)](#18-implementation-status-v1-snapshot)

---

## 1. Implementation Overview

### File extension convention

**All new simulation code uses `.tsx`**, matching this repository. That includes engine and storage modules even when they contain no JSX — no standalone `.ts` files for this feature.

### Dependency direction (must not violate)

```
page.tsx
  └── SimulationGame.tsx
        ├── engine (pure TS — no React imports)
        ├── simulationStorage.tsx
        ├── analytics.tsx
        └── child UI components
```

### Runtime data flow (one cycle)

```
TurnInput submit                    ← v1 (deprecated, not in UI)
ActionPanel + GridBoard click       ← v2 (shipped)
  → instructionFromSelection(mode, state, cell)  // or SHIELD without cell
  → validate canUseAction(bot, ATTACK|SHIELD)
  → chooseOpponentInstruction(state)  // cooldown-aware
  → step(state, playerInstr, config) → StepResult
  → animation phases (unchanged)
  → saveSimulation(simId, save)     // includes cooldown fields
  → outcome screens
```

**Move-only cycles** skip charge/beam/hold/fade (~180ms total).

### What we are not building in v1

- Registration CTA
- Commander dialogue
- Simulation archive UI
- Backend / auth integration
- Automated test runner in CI
- Interactive tutorial sandbox in modal popup (shipped)
- Click-based ActionPanel, grid selection, cooldowns (shipped)
- Monaco `TurnInput` removed from player UI (parser retained for dev/tests)

---

## 2. Visual Theme & Design System

### Aesthetic goal

**BattleCode HUD tactical terminal** — same world as the landing page: dark, orange-amber accents, glass panels, sci-fi typography. The simulation should feel like a **mini command console**, not a casual mobile puzzle game.

### Reuse from existing codebase

| Token / utility          | Source                              | Usage in simulation                                    |
| ------------------------ | ----------------------------------- | ------------------------------------------------------ |
| `oxanium`                | `globals.css`                       | Body copy, HUD labels, input hints                     |
| `orbitron`               | `globals.css`                       | Headings, cycle counter, share card title              |
| `glass-box`              | `globals.css`                       | Grid frame, input panel, tutorial modal, share overlay |
| `gradient-border-button` | `globals.css`                       | Primary actions: Submit, Download, Share, Retry        |
| Orange gradient          | `#fbbf24 → #f97316 → #dc2626`       | Player bot, beams, accents                             |
| `judge-zero` glow        | `globals.css`                       | Optional glow on active input                          |
| Background               | `bg-black` + subtle radial gradient | Page backdrop (match Hero overlay)                     |

### Simulation-specific design tokens (add to `globals.css` or inline Tailwind)

| Token                      | Value                        | Usage                           |
| -------------------------- | ---------------------------- | ------------------------------- |
| `--sim-player-color`       | `#F97316` (orange)           | Player bot marker               |
| `--sim-opponent-color`     | `#EF4444` (red)              | Opponent bot marker             |
| `--sim-wall-color`         | `#374151` (gray-700)         | Wall cells                      |
| `--sim-cell-empty`         | `rgba(255,255,255,0.03)`     | Empty cell background           |
| `--sim-beam-player-glow`   | `rgba(249,115,22,0.25)`      | Player outer beam glow          |
| `--sim-beam-opponent-glow` | `rgba(239,68,68,0.25)`       | Opponent outer beam glow        |
| `--sim-beam-core`          | `#FFFFFF`                    | Beam inner core (1–2px)         |
| `--sim-clash-orb`          | `#FDE68A` + white hot center | Clash orb (brightest on screen) |
| `--sim-shield-color`       | `rgba(56,189,248,0.45)`      | Shield barrier cyan/blue        |
| `--sim-shield-edge`        | `rgba(34,211,238,0.9)`       | Shield edge highlight           |
| `--sim-grid-gap`           | `4px`                        | CSS grid gap                    |

### Bot markers (implemented)

- **Player:** orange fill, **YOU** label on marker, hearts below (Minecraft-style).
- **Opponent:** red fill, **BOT** label, hearts below.
- **Shield active:** pulsing cyan ring during combat replay (barrier VFX in `CombatVfxLayer`).
- **Dead (0 lives):** marker hidden.

### Wall cells

- Dark gray fill, lighter border, subtle inner shadow — reads as solid block.

### Typography scale

| Element             | Font                       | Size (desktop / mobile) |
| ------------------- | -------------------------- | ----------------------- |
| Page title          | Orbitron                   | `text-2xl` / `text-xl`  |
| Cycle label         | Orbitron                   | `text-lg` / `text-base` |
| HUD lives           | Oxanium                    | `text-sm`               |
| Input / pseudo-code | Monospace (Monaco default) | 14px / 13px             |
| Tutorial body       | Oxanium                    | `text-sm`               |
| Share card headline | Orbitron                   | Canvas-rendered ~32px   |

### Page background

```tsx
// SimulationGame outer wrapper
className =
  "min-h-screen bg-black bg-[radial-gradient(50%_50%_at_50%_50%,rgba(0,0,0,0.3)_0%,rgba(0,0,0,0.85)_100%)] text-white oxanium";
```

Optional: faint `Landingpage.svg` at low opacity behind grid (match brand).

---

## 3. Complete File Tree

```
src/
├── app/
│   ├── layout.tsx                          [MODIFY] GA4 scripts
│   └── simulations/
│       └── page.tsx                        [NEW]
├── game/
│   ├── engine/
│   │   ├── types.tsx                       [NEW]
│   │   ├── constants.tsx                   [NEW]
│   │   ├── grid.tsx                          [NEW]
│   │   ├── parser.tsx                       [NEW]
│   │   ├── beam.tsx                         [SHIPPED] paths, adjacent head-on clash
│   │   ├── combatScenario.tsx               [SHIPPED] deriveCombatScenario
│   │   ├── opponent.tsx                     [SHIPPED]
│   │   ├── resolver.tsx                     [SHIPPED]
│   │   ├── runner.tsx                       [SHIPPED]
│   │   ├── index.tsx                        [SHIPPED]
│   │   ├── actionSelection.tsx            [SHIPPED] click → Instruction + validation
│   │   └── __fixtures__/
│   │       ├── tiny.tsx                   [SHIPPED] dev fixture
│   │       └── tutorialScenarios.tsx     [SHIPPED] sandbox grids + demo scripts
│   ├── simulations/
│   │   ├── active.tsx                       [NEW]
│   │   ├── validate.tsx                     [NEW]
│   │   └── index.tsx                        [NEW]
│   ├── storage/
│   │   └── simulationStorage.tsx            [NEW]
│   └── hooks/
│       └── useSimulationGame.tsx            [NEW]
├── components/
│   ├── MobileOnly.tsx                      [MODIFY]
│   └── simulation/
│       ├── SimulationGame.tsx              [NEW]
│       ├── SimulationLayout.tsx            [NEW]
│       ├── TutorialOverlay.tsx             [SHIPPED] modal shell
│       ├── TutorialSandbox.tsx             [SHIPPED] watch/practice sandbox
│       ├── tutorialSteps.tsx               [SHIPPED] step definitions
│       ├── cycleAnimation.tsx              [SHIPPED] shared animation replay
│       ├── GridBoard.tsx                   [SHIPPED] clickable + preview
│       ├── GridCell.tsx                    [SHIPPED]
│       ├── BotMarker.tsx                   [SHIPPED]
│       ├── CombatVfxLayer.tsx              [SHIPPED] canvas combat VFX
│       ├── combatVfxTypes.tsx              [SHIPPED] VFX payload + animation types
│       ├── ActionPanel.tsx                 [SHIPPED] Move / Attack / Shield + Submit
│       ├── TurnInput.tsx                   [deprecated] not in player UI
│       ├── instructionLanguage.tsx         [deprecated] parser for tests
│       ├── LivesHud.tsx                    [NEW]
│       ├── AttemptsBadge.tsx               [NEW]
│       ├── StaticCommander.tsx             [NEW]
│       ├── ShareCard.tsx                   [NEW]
│       ├── shareCanvas.tsx                  [NEW]
│       ├── ExhaustedView.tsx               [NEW]
│       └── OpponentMoveReveal.tsx          [NEW] shows opponent's last move
├── lib/
│   └── analytics.tsx                        [NEW]
└── app/globals.css                         [MODIFY] sim utilities

public/
└── simulation/
    ├── battlecode-logo.png                 [NEW] share card logo
    └── commander-placeholder.svg             [NEW] optional v1 placeholder

docs/simulation/
├── ARCHITECTURE.md                         [EXISTS]
└── IMPLEMENTATION.md                       [THIS FILE]
```

**New files:** ~35 (simulation feature)  
**Modified files:** `layout.tsx`, `MobileOnly.tsx`, `globals.css`, `Hero.tsx`

---

## 4. Engine Layer (`src/game/engine/`)

Pure TypeScript. **No React, no DOM, no localStorage.**

### `types.tsx`

**Purpose:** All shared engine types.

**Exports:**

```typescript
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
  attackCooldown: number; // v2 — 0 = ready
  shieldCooldown: number; // v2 — 0 = ready
}

export type Instruction =
  | { type: "MOVE"; direction: Direction }
  | { type: "ATTACK"; direction: Direction }
  | { type: "SHIELD" };

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

export interface BeamPath {
  attacker: BotId;
  direction: Direction;
  cells: Position[];
  hit: boolean;
  blockedByWall: boolean;
  truncatedAt?: Position; // set when beam ends at head-on clash point
}

export type CombatScenario = "none" | "clash" | "shield_block" | "hit" | "miss";

export type GameEvent =
  | { type: "SHIELD_UP"; bot: BotId }
  | { type: "MOVE"; bot: BotId; from: Position; to: Position; blocked: boolean }
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
```

---

### `combatScenario.tsx`

**Purpose:** Map resolved events + beam paths to UI combat scenario.

**Exports:**

| Function                                  | Behavior                                                                |
| ----------------------------------------- | ----------------------------------------------------------------------- |
| `deriveCombatScenario(events, beamPaths)` | `clash` if `CLASH` event; else `hit` / `shield_block` / `miss` / `none` |
| `getClashPoint(events)`                   | Returns `clashPoint` from first `CLASH` event                           |

Called from `runner.step()` after `resolveCycle()`.

---

### `constants.tsx`

**Purpose:** Engine magic numbers (avoid scattering literals).

**Exports:**

```typescript
export const STARTING_LIVES = 2 as const;
export const STARTING_ATTEMPTS = 2 as const;
export const DEFAULT_MAX_CYCLES = 50;
export const ALL_DIRECTIONS: Direction[] = ["UP", "DOWN", "LEFT", "RIGHT"];
export const INSTRUCTION_STRINGS: readonly string[] = [
  "MOVE(UP)",
  "MOVE(DOWN)",
  "MOVE(LEFT)",
  "MOVE(RIGHT)",
  "ATTACK(UP)",
  "ATTACK(DOWN)",
  "ATTACK(LEFT)",
  "ATTACK(RIGHT)",
  "SHIELD()",
];

// Combat VFX timing (UI replay — see ARCHITECTURE §11)
export const MOVE_ANIMATION_MS = 180;
export const ATTACK_CHARGE_MS = 80;
export const BEAM_TRAVEL_MS = 120;
export const COMBAT_HOLD_MS = 450;
export const BEAM_FADE_MS = 100;

// v2 cooldowns
export const ATTACK_COOLDOWN_TURNS = 2;
export const SHIELD_COOLDOWN_TURNS = 2;

export function cycleHasAttack(playerInstruction, opponentInstruction): boolean;
export function getCycleAnimationDurationMs(hasAttack: boolean): number;
export function canUseAction(bot: Bot, action: "ATTACK" | "SHIELD"): boolean;
```

---

### `grid.tsx`

**Purpose:** Grid geometry helpers.

**Exports:**

| Function            | Signature                     | Behavior              |
| ------------------- | ----------------------------- | --------------------- |
| `getRows`           | `(grid) => number`            | `grid.length`         |
| `getCols`           | `(grid) => number`            | `grid[0].length`      |
| `inBounds`          | `(grid, pos) => boolean`      | Row/col within grid   |
| `getTile`           | `(grid, pos) => Tile \| null` | null if OOB           |
| `isWalkable`        | `(grid, pos) => boolean`      | EMPTY and in bounds   |
| `offsetPosition`    | `(pos, dir) => Position`      | One step in direction |
| `manhattanDistance` | `(a, b) => number`            | \|Δrow\| + \|Δcol\|   |
| `cloneGrid`         | `(grid) => Grid`              | Deep copy rows        |
| `positionsEqual`    | `(a, b) => boolean`           | Same row/col          |

---

### `parser.tsx`

**Purpose:** String ↔ Instruction (strict enum).

**Exports:**

| Function                                               | Behavior                                                               |
| ------------------------------------------------------ | ---------------------------------------------------------------------- |
| `parseInstruction(input: string): Instruction \| null` | Trim; exact match against `INSTRUCTION_STRINGS`                        |
| `instructionToString(instr: Instruction): string`      | Canonical pseudo-code string                                           |
| `getCompletions(partial: string): string[]`            | Prefix filter on valid strings for autocomplete                        |
| `getPlayableInstructionStrings(state): string[]`       | Legal moves for MOVE (dev/tests); v2 UI uses `actionSelection` instead |
| `isValidInstruction(input: string): boolean`           | `parseInstruction !== null`                                            |

**Parsing:** use a `Map<string, Instruction>` built from constants — no regex execution of user code.

---

### `beam.tsx`

**Purpose:** Beam path calculation, hit detection, head-on clash detection.

**Exports:**

| Function                                               | Behavior                                                             |
| ------------------------------------------------------ | -------------------------------------------------------------------- |
| `getBeamCells(...)`                                    | Cells beam travels through; stops at wall                            |
| `getBeamPath(...)`                                     | Path to target (stops at opponent cell); hit flag                    |
| `detectHeadOnClash(state, playerInstr, opponentInstr)` | Opposing ATTACK on same axis → clash (incl. **adjacent** gap=1)      |
| `buildClashBeamPath(...)`                              | Internal — truncated paths with optional empty `cells` when adjacent |
| `getAttackDirectionTowardPlayer(state)`                | Opponent AI helper                                                   |

---

### `actionSelection.tsx` — **v2 NEW**

**Purpose:** Convert grid clicks into `Instruction` + preview cell lists (see ARCHITECTURE §10).

**Recommended location:** `src/game/engine/actionSelection.tsx` (pure, testable) or `src/components/simulation/actionSelection.tsx`.

**Exports:**

| Function                                      | Behavior                                                   |
| --------------------------------------------- | ---------------------------------------------------------- |
| `getMoveTargetIfValid(state, cell)`           | `{ direction }` if legal one-step move, else `null`        |
| `getAttackFromCell(state, cell)`              | `{ direction, pathCells }` if aligned row/col, else `null` |
| `instructionFromSelection(mode, state, cell)` | `Instruction \| null`                                      |
| `getAttackPreviewCells(state, direction)`     | Highlight cells for attack preview                         |

---

### `resolver.tsx`

**Purpose:** Resolve one simultaneous cycle.

**Exports:**

| Function            | Behavior                                                                 |
| ------------------- | ------------------------------------------------------------------------ |
| `resolveCycle(...)` | Runs shield → move → attack (clash pre-check) → cleanup → terminal check |

**Internal phases (private):** `applyShields`, `applyMoves`, `resolveAttacks`, `applyCleanup`, `checkOutcome`.

**Head-on clash:** opposing ATTACK on same axis (incl. adjacent) → `CLASH`, no damage.

**v2 — cleanup order:**

1. Clear `shieldActive`
2. Decrement both cooldowns by 1 (min 0)
3. If instruction was `ATTACK` → `attackCooldown = ATTACK_COOLDOWN_TURNS`
4. If instruction was `SHIELD` → `shieldCooldown = SHIELD_COOLDOWN_TURNS`
5. Increment `cycle`

**v2 — validation:** reject instructions that use ATTACK/SHIELD while respective cooldown `> 0`.

---

### `opponent.tsx`

**Purpose:** Logical hardcoded opponent AI (see ARCHITECTURE §8).

**Exports:**

| Function                           | Behavior                                                                               |
| ---------------------------------- | -------------------------------------------------------------------------------------- |
| `chooseOpponentInstruction(state)` | Attack if hittable **and off cooldown**; else move; stuck → `SHIELD()` if off cooldown |
| `getMoveTowardPlayer(state)`       | Deterministic Manhattan step                                                           |

**v2:** gate ATTACK/SHIELD branches with `canUseAction(opponent, ...)`.

---

### `runner.tsx`

**Purpose:** Public engine entry points for UI.

**Exports:**

| Function                                             | Behavior                                                                    |
| ---------------------------------------------------- | --------------------------------------------------------------------------- |
| `createInitialState(config): GameState`              | Cycle 0, bots at spawns, 2 lives, grid from config                          |
| `step(state, playerInstruction, config): StepResult` | Calls `chooseOpponentInstruction` + `resolveCycle` + `deriveCombatScenario` |
| `gameStateToSave(state, meta): SimulationSave`       | Merge engine state + save metadata                                          |
| `saveToGameState(save): GameState`                   | Extract grid + bots + cycle from save                                       |

---

### `index.tsx`

Re-export all public engine API from one import path:

```typescript
export * from "./types";
export * from "./constants";
export * from "./runner";
export * from "./parser";
export { chooseOpponentInstruction } from "./opponent";
```

---

## 5. Simulation Config (`src/game/simulations/`)

### `active.tsx`

**Purpose:** The one live simulation players see.

**Exports:**

```typescript
export const ACTIVE_SIMULATION: SimulationConfig = {
  id: "sim-001",
  grid: [
    /* 2D array — placeholder until designed */
  ],
  playerStart: { row: 0, col: 0 },
  opponentStart: { row: 0, col: 0 },
  maxCycles: 50,
  nextSimulationDate: "19th September",
  shareEventDate: "19th September",
};
```

**Note:** fill grid before ship. Use `validateSimulationConfig()` in dev.

---

### `validate.tsx`

**Purpose:** Assert config integrity at module load (dev) or app mount.

**Exports:**

```typescript
export function validateSimulationConfig(config: SimulationConfig): void;
// throws Error with message if:
// - empty grid, ragged rows
// - spawn OOB or on WALL
// - spawns same cell
// - maxCycles < 1
```

---

### `index.tsx`

```typescript
export { ACTIVE_SIMULATION } from "./active";
export { validateSimulationConfig } from "./validate";
```

---

## 6. Storage Layer (`src/game/storage/`)

### `simulationStorage.tsx`

**Purpose:** localStorage cache — one root key, per-sim saves.

**Storage key:** `battlecode_sim_v1`

**Exports:**

| Function                                                    | Behavior                                                                                        |
| ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `loadRoot(): RootStorage`                                   | Parse JSON; if missing/corrupt → default `{ version: 1, tutorialDone: false, simulations: {} }` |
| `saveRoot(root): void`                                      | `JSON.stringify` + setItem                                                                      |
| `getTutorialDone(): boolean`                                | From root                                                                                       |
| `setTutorialDone(done: boolean): void`                      | Update root                                                                                     |
| `loadSimulation(id: string): SimulationSave \| null`        | From root.simulations[id]                                                                       |
| `saveSimulation(id: string, save: SimulationSave): void`    | Merge into root.simulations[id]                                                                 |
| `deleteSimulation(id: string): void`                        | Remove key from simulations map                                                                 |
| `createFreshSave(config: SimulationConfig): SimulationSave` | 2 attempts, playing, initial GameState from engine                                              |

**Types:** define `RootStorage` and `SimulationSave` here (or import Bot/Grid from engine types).

**SSR safety:** all functions guard `typeof window === "undefined"`.

---

## 7. React Hooks (`src/game/hooks/`)

### `useSimulationGame.tsx`

**Purpose:** Encapsulate game state machine + persistence for `SimulationGame`.

**Returns:**

```typescript
{
  phase:
    | "loading"
    | "tutorial"
    | "playing"
    | "animating"
    | "won"
    | "lost"
    | "exhausted";
  animationPhase: "idle" | "move" | "charge" | "beam" | "hold" | "fade";
  config: SimulationConfig;
  gameState: GameState | null; // displayState during animating; committed after fade
  save: SimulationSave | null;
  lastStep: StepResult | null;
  combatVfx: CombatVfxPayload | null;
  moveTweens: Partial<Record<BotId, MoveTween>>;
  beamProgress: number;
  fadeOpacity: number;
  vfxPulse: number;
  hitFlashBot: BotId | null;
  isAnimating: boolean;
  opponentInstructionLabel: string | null;
  // v2 click input
  actionMode: "move" | "attack" | "shield" | null;
  previewCells: Position[];
  invalidFlashCell: Position | null;
  canSubmit: boolean;
  setActionMode: (mode: "move" | "attack" | "shield") => void;
  handleCellClick: (cell: Position) => void;
  submitSelection: () => void;
  skipTutorial: () => void;
  completeTutorial: () => void;
  retryAfterLoss: () => void;
}
```

**Internal responsibilities (v2 additions):**

- Track `actionMode`, `previewCells`, `invalidFlashCell` while `phase === "playing"`.
- `handleCellClick`: call `actionSelection` helpers; valid → set preview; invalid → trigger red flash timer (~250ms).
- `setActionMode`: clear preview; ignore ATTACK/SHIELD if `canUseAction(player, ...)` false.
- `submitSelection`: build `Instruction` → `step()` → animation (same as v1 flow).
- Reset selection after submit / when animation starts.
- `createInitialState` / save must include `attackCooldown: 0`, `shieldCooldown: 0`.

---

## 8. UI Components (`src/components/simulation/`)

### `SimulationGame.tsx`

**Purpose:** Top-level orchestrator. Only component `page.tsx` mounts.

**Props:** none

**Renders:**

- `SimulationLayout` wrapper
- Phase switch:
  - `tutorial` → `TutorialOverlay`
  - `playing` | `animating` → grid + HUD + **ActionPanel** + commander
  - `won` | `lost` → `ShareCard`
  - `exhausted` → `ExhaustedView`
- Calls `useSimulationGame()`

**Side effects:** `trackEvent("sim_page_view")` on mount; validate config in dev.

---

### `SimulationLayout.tsx`

**Purpose:** Responsive page shell.

**Props:** `{ children: ReactNode }`

**Layout:**

- Desktop: grid left/center, side panel right (commander + HUD + input)
- Mobile: single column — grid top, HUD, input, commander bottom

**Classes:** min-h-screen, max-w-5xl mx-auto, padding, flex/grid per breakpoint.

---

### `TutorialOverlay.tsx`

**Purpose:** Tutorial modal shell — compact popup over the page (ARCHITECTURE §12).

**Props:**

```typescript
{
  onComplete: () => void;
  onSkip: () => void;
}
```

**State:** `stepIndex: number`

**Renders:** fixed modal (`max-w-md`) with header (title + progress), `TutorialSandbox` in body, **Skip** + **Next** in footer. **Next** always enabled; watch steps loop until Next.

**Analytics:** `sim_tutorial_complete` / `sim_tutorial_skip`.

---

### `TutorialSandbox.tsx`

**Purpose:** Embedded watch/practice arena inside the tutorial modal.

**Props:**

```typescript
{
  step: TutorialStep;
  onPracticeSuccess?: () => void;
}
```

**Watch steps:** auto-plays demo script via `replayStepAnimation()`; holds **3s** after animation (`TUTORIAL_RESET_DELAY_MS`) then resets and loops.

**Practice steps:** compact `GridBoard` + `ActionPanel`; validates submit against step scenario; calls `onPracticeSuccess` when correct.

---

### `cycleAnimation.tsx`

**Purpose:** Shared step animation replay extracted from `useSimulationGame` — used by main game hook and tutorial sandbox.

**Exports:** `replayStepAnimation(...)` and related animation helpers.

---

### `tutorialSteps.tsx`

**Purpose:** Tutorial content + scenario bindings.

**Exports:**

```typescript
export const TUTORIAL_RESET_DELAY_MS = 3000;

export type TutorialStep =
  | { type: "watch"; title: string; body: string; scenarioId: string; demoScript: ... }
  | {
      type: "practice";
      title: string;
      body: string;
      hint: string;
      scenarioId: string;
      validateSelection: (instruction: Instruction) => boolean;
    };

export const TUTORIAL_STEPS: TutorialStep[];
```

---

### `GridBoard.tsx`

**Purpose:** Render clickable grid + bot markers + selection preview layer.

**Props (v2 additions):**

```typescript
{
  state: GameState;
  combatVfx: CombatVfxPayload | null;
  animationPhase: AnimationPhase;
  moveTweens: Partial<Record<BotId, MoveTween>>;
  hitFlashBot: BotId | null;
  beamProgress: number;
  fadeOpacity: number;
  vfxPulse: number;
  // v2
  previewCells: Position[];
  invalidFlashCell: Position | null;
  onCellClick: (cell: Position) => void;
  interactionEnabled: boolean;
}
```

**Renders:** CSS Grid of clickable `GridCell`, `BotMarker`, `CombatVfxLayer` overlay.

---

### `GridCell.tsx`

**Props (v2):**

```typescript
{
  tile: Tile;
  row: number;
  col: number;
  isPreview?: boolean;       // move target or attack path cell
  isInvalidFlash?: boolean;  // red flash animation
  onClick?: () => void;
  disabled?: boolean;        // during animating or walls for move mode
}
```

---

### `ActionPanel.tsx` — **shipped**

**Purpose:** Side action buttons + Submit + cooldown display.

**Props:**

```typescript
{
  actionMode: "move" | "attack" | "shield" | null;
  attackCooldown: number;
  shieldCooldown: number;
  canSubmit: boolean;
  disabled: boolean;
  onSelectMove: () => void;
  onSelectAttack: () => void;
  onSelectShield: () => void;
  onSubmit: () => void;
}
```

**Renders:**

- Three `gradient-border-button` or toggle buttons: **Move**, **Attack**, **Shield**
- Attack/Shield disabled + muted when respective cooldown `> 0`; optional badge with remaining turns
- Active mode highlighted (orange ring)
- **Submit** primary button — disabled until valid preview (or shield mode ready)

**Layout:** right panel on desktop (`SimulationLayout`); horizontal button row above Submit on mobile.

---

### `TurnInput.tsx` — **deprecated v2**

Remove from `SimulationGame` render tree. File may remain for reference until deleted. Player no longer types pseudo-code.

### `BotMarker.tsx`

**Props:** `{ bot: Bot; style?: CSSProperties }` — supports move slide / hit knockback.

**Renders:** labeled marker + Minecraft-style hearts below.

---

### `CombatVfxLayer.tsx` — **shipped**

**Purpose:** Canvas combat VFX per ARCHITECTURE §11.

**Props:**

```typescript
{
  state: GameState;
  payload: CombatVfxPayload | null;
  phase: AnimationPhase;
  beamProgress: number;
  fadeOpacity: number;
  pulse: number;
}
```

**Behaviour:**

- **Charge:** pulsing glow at each attacker's cell center.
- **Beam / hold / fade:** three-layer beams from origin to computed endpoint.
- **Clash:** endpoints at midpoint between bot centers; clash orb at midpoint.
- **Shield block:** beam stops at shield radius inset; shield circle drawn **after** beams.
- **Miss/hit:** endpoint at last path cell.

**Helpers (private):** `getBeamEndpoint`, `stopPointBeforeTarget`, `drawBeam`, `drawClashOrb`, `drawShieldBarrier`.

**Replaces:** legacy `.sim-grid-cell--beam` cell flash.

---

### `TurnInput.tsx` / `instructionLanguage.tsx`

**Status:** v1 shipped, **v2 deprecated** — not mounted in player UI. Parser retained in engine for tests.

### `LivesHud.tsx`

**Props:**

```typescript
{
  cycle: number;
}
```

**Renders:** `Cycle 7` only — lives shown on grid under each bot marker.

---

### `AttemptsBadge.tsx`

**Props:** `{ attemptsRemaining: number }`

**Renders:** `Attempts: 2` or icon-style pips. Hidden when won/exhausted.

---

### `StaticCommander.tsx`

**Purpose:** Placeholder — reserved visual slot.

**Props:** none

**Renders:** `public/simulation/commander-placeholder.svg` or gray silhouette + "Commander" label. No dialogue.

---

### `OpponentMoveReveal.tsx`

**Purpose:** After each cycle, show what opponent did (transparency / learning).

**Props:** `{ instruction: Instruction | null }`

**Renders:** small label: `Opponent: ATTACK(LEFT)` in muted text below grid.

---

### `ShareCard.tsx`

**Purpose:** Post-game share UI with preview + actions.

**Props:**

```typescript
{
  variant: "win" | "loss";
  cyclesToWin?: number;
  playerLivesRemaining?: number;
  shareEventDate: string;
  onRetry?: () => void;  // loss with attempts left
}
```

**Renders:**

- Canvas preview (scaled down)
- `gradient-border-button`: Download, Share
- Retry button if `onRetry` provided
- Hidden `<canvas>` for full-res export via `shareCanvas.tsx`

---

### `shareCanvas.tsx`

**Purpose:** Draw share PNG offscreen.

**Exports:**

```typescript
export async function renderShareCanvas(options: {
  variant: "win" | "loss";
  cyclesToWin?: number;
  playerLivesRemaining?: number;
  shareEventDate: string;
}): Promise<HTMLCanvasElement>;

export function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob>;
export function downloadBlob(blob: Blob, filename: string): void;
export async function nativeShare(blob: Blob, title: string): Promise<boolean>;
```

**Canvas size:** 1080 × 1920 (Instagram Story aspect).

**Layout:**

- Top: BattleCode logo centered
- Middle: headline (win/loss copy from ARCHITECTURE §15)
- Win: hearts + move count
- Bottom: `BattleCode on {shareEventDate}`

**Colors:** black background, orange accent line, white text.

---

### `ExhaustedView.tsx`

**Purpose:** No retries left — share only + next date.

**Props:**

```typescript
{
  nextSimulationDate: string;
  shareEventDate: string;
}
```

**Renders:** `ShareCard variant="loss"` (no retry) + message: `Next simulation on {nextSimulationDate}`.

---

## 9. Route & Layout Changes

### `src/app/simulations/page.tsx` [NEW]

```typescript
"use client";
import SimulationGame from "@/components/simulation/SimulationGame";

export default function SimulationsPage() {
  return <SimulationGame />;
}
```

**Metadata:** add `layout.tsx` in same folder if SEO title needed:

```typescript
export const metadata = { title: "BattleCode Simulation" };
// Note: metadata requires server component layout; page stays client
```

Optional pattern: `page.tsx` client + `layout.tsx` server for title only.

---

### `src/components/MobileOnly.tsx` [MODIFIED — shipped]

Add pathname check:

```typescript
const MOBILE_ALLOWED_PATHS = ["/", "/simulations"];
```

---

### `src/components/shared/Hero.tsx` [MODIFIED — shipped]

**Play Minigame** link → `/simulations` on landing page hero CTA row.

---

### `src/app/layout.tsx` [MODIFY]

Add GA4 (only if env var set):

```tsx
{
  process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID && (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=...`}
        strategy="afterInteractive"
      />
      <Script id="ga-init" strategy="afterInteractive">
        {/* gtag config */}
      </Script>
    </>
  );
}
```

---

## 10. Analytics (`src/lib/analytics.tsx`)

**Exports:**

```typescript
export function trackEvent(
  name: string,
  params?: Record<string, string | number | boolean>,
): void;

// Typed helpers (optional):
export const SimEvents = {
  pageView: () => trackEvent("sim_page_view"),
  tutorialComplete: () => trackEvent("sim_tutorial_complete"),
  // ... etc
} as const;
```

**Implementation:** no-op if `window.gtag` undefined or no measurement ID.

---

## 11. Styles (`globals.css` additions)

Add section `/* Simulation mini-game */`:

| Class                           | Purpose                                              |
| ------------------------------- | ---------------------------------------------------- |
| `.sim-grid-cell`                | Base cell styling                                    |
| `.sim-grid-cell--wall`          | Wall variant                                         |
| `.sim-grid-cell--beam`          | **Deprecated** — use CombatVfxLayer                  |
| `.sim-bot--player`              | Orange bot                                           |
| `.sim-bot--opponent`            | Red bot                                              |
| `.sim-bot--shield`              | Pulsing ring `@keyframes sim-shield-pulse`           |
| `.sim-grid-cell--preview`       | Selection / attack path highlight (v2)               |
| `.sim-grid-cell--invalid-flash` | Red flash `@keyframes sim-invalid-flash` ~250ms (v2) |
| `.sim-action-btn--cooldown`     | Muted disabled action button (v2)                    |

---

## 12. Assets (`public/`)

| Path                                          | Spec                                    |
| --------------------------------------------- | --------------------------------------- |
| `public/simulation/battlecode-logo.png`       | ~512px wide, transparent PNG for canvas |
| `public/simulation/commander-placeholder.svg` | Simple silhouette, orange stroke        |

Until assets exist, use text "BATTLECODE" on canvas and gray box for commander.

---

## 13. Type Reference (consolidated)

See [ARCHITECTURE.md §6, §14, §17](./ARCHITECTURE.md) and engine `types.tsx` above.

**UI-only types** (define in `useSimulationGame.tsx` / `combatVfxTypes.tsx`):

```typescript
type GamePhase =
  | "loading"
  | "tutorial"
  | "playing"
  | "animating"
  | "won"
  | "lost"
  | "exhausted";

type AnimationPhase = "idle" | "move" | "charge" | "beam" | "hold" | "fade";

interface CombatVfxPayload {
  scenario: CombatScenario;
  beamPaths: BeamPath[];
  clashPoint?: Position;
  shieldBot?: BotId;
  hitBot?: BotId;
}
```

---

## 14. Constants & Magic Numbers

| Constant                | Value                 | Location                   |
| ----------------------- | --------------------- | -------------------------- |
| `STARTING_LIVES`        | 2                     | engine/constants.tsx       |
| `STARTING_ATTEMPTS`     | 2                     | engine/constants.tsx       |
| `DEFAULT_MAX_CYCLES`    | 50                    | engine/constants.tsx       |
| `MOVE_ANIMATION_MS`     | 180                   | engine/constants.tsx       |
| `ATTACK_CHARGE_MS`      | 80                    | engine/constants.tsx       |
| `BEAM_TRAVEL_MS`        | 120                   | engine/constants.tsx       |
| `COMBAT_HOLD_MS`        | 450                   | engine/constants.tsx       |
| `BEAM_FADE_MS`          | 100                   | engine/constants.tsx       |
| `STORAGE_KEY`           | `"battlecode_sim_v1"` | simulationStorage.tsx      |
| Share canvas size       | 1080 × 1920           | shareCanvas.tsx            |
| `ATTACK_COOLDOWN_TURNS` | 2                     | engine/constants.tsx (v2)  |
| `SHIELD_COOLDOWN_TURNS` | 2                     | engine/constants.tsx (v2)  |
| Invalid flash duration  | ~250ms                | GridCell / hook timer (v2) |

---

## 15. Component Layout Wireframes

### Desktop (`md+`)

```
┌─────────────────────────────────────────────────────────┐
│  BATTLECODE SIMULATION                    Attempts: 2   │
├──────────────────────────────┬──────────────────────────┤
│                              │  [ Move ] [ Attack¹ ] [ Shield ] │
│         GRID BOARD           │  [ Submit ]                     │
│    (click cells)             │  ¹ cooldown badge if > 0        │
│                              │  [Static Commander]             │
│                              │  Cycle 3                          │
│                              │  Opponent: MOVE(LEFT)             │
└──────────────────────────────┴──────────────────────────┘
```

### Mobile

```
┌──────────────────────┐
│ BATTLECODE SIM       │
│ Attempts: 2          │
├──────────────────────┤
│      GRID BOARD      │
├──────────────────────┤
│ Cycle 3              │
│ Opponent: MOVE(L)    │
│ [Move][Attack][Shield]│
│ [ Submit ]           │
│ [Commander placeholder]
└──────────────────────┘
```

### Share / Exhausted

```
┌────────────────────────┐
│   [Share card preview] │
│                        │
│  [Download]  [Share]   │
│      [Retry]           │  ← loss only, if attempts left
│                        │
│ Next sim on 19th Sep   │  ← exhausted only
└────────────────────────┘
```

---

## 16. Implementation Phases & PR Plan

### PR 1 — Engine + storage (no UI) ✅

**Files:** all of `src/game/engine/*`, `simulations/*`, `storage/simulationStorage.tsx`

**Done:** `step()` resolves cycles; storage round-trips JSON.

---

### PR 2 — Playable shell ✅

**Files:** `page.tsx`, `SimulationGame`, `SimulationLayout`, `GridBoard`, `GridCell`, `BotMarker`, `LivesHud`, `TurnInput`, `useSimulationGame`, `MobileOnly` change

**Done:** full game playable on `/simulations`; persistence on refresh.

---

### PR 3 — Polish input, animation, opponent reveal ✅

**Files:** `TurnInput` Monaco, `instructionLanguage.tsx`, `OpponentMoveReveal`, `globals.css` sim styles

**Done:** autocomplete, opponent move reveal, sim styles.

---

### PR 4 — Tutorial, share, exhausted, analytics ✅

**Files:** `TutorialOverlay`, `tutorialSteps.tsx`, `ShareCard`, `shareCanvas.tsx`, `ExhaustedView`, `StaticCommander`, `AttemptsBadge`, `analytics.tsx`, `layout.tsx` GA4

**Done:** full v1 flow shippable.

---

### PR 5 — Content & QA 🔄

**Files:** `active.tsx` real map, logo asset, copy pass on tutorial + share

**Partial:** engine + UI complete; map art and assets may still be placeholder.

---

### PR 6 — Combat VFX + clash rule (engine + UI) ✅

**Files:** `resolver.tsx`, `beam.tsx`, `combatScenario.tsx`, `types.tsx`, `CombatVfxLayer.tsx`, `combatVfxTypes.tsx`, `useSimulationGame.tsx`, `GridBoard.tsx`, `BotMarker.tsx`

**Done:** head-on clash (incl. adjacent) deals no damage; animation timeline; clash orb + shield edge stop; move-only faster than combat.

---

### PR 7 — Interactive tutorial sandbox ✅

**Files:** `TutorialOverlay.tsx`, `TutorialSandbox.tsx`, `tutorialSteps.tsx`, `cycleAnimation.tsx`, `__fixtures__/tutorialScenarios.tsx`, reuse `CombatVfxLayer`, `ActionPanel`, `GridBoard`

**Done:** watch steps auto-loop with 3s hold; practice steps use click-based ActionPanel; compact modal layout; Skip + Next always available.

---

### PR 8 — Click input + cooldowns (v2) ✅

**Engine files:** `types.tsx`, `constants.tsx`, `resolver.tsx`, `opponent.tsx`, `runner.tsx`, `actionSelection.tsx`, `simulationStorage.tsx`

**UI files:** `ActionPanel.tsx`, `GridBoard.tsx`, `GridCell.tsx`, `useSimulationGame.tsx`, `SimulationGame.tsx`, `globals.css`

**Done:**

- Move / Attack / Shield buttons + grid click preview + Submit
- Attack path highlights full row/column; move highlights one cell
- Invalid click → red flash; Submit disabled until valid
- ATTACK/SHIELD 2-cycle cooldown in engine, opponent AI, persistence, disabled buttons
- Move always available
- `TurnInput` removed from player UI; combat VFX + clash behaviour unchanged

---

## 17. Definition of Done

- [x] `/simulations` playable unauthenticated
- [x] Live turn-by-turn click-based input (ActionPanel + grid)
- [x] Opponent uses logical AI from cycle 1
- [x] Beams animate; walls block correctly
- [x] 2 lives, 2 attempts (loss only)
- [x] localStorage cache per sim id; refresh resumes
- [x] New sim id → fresh save; tutorialDone preserved
- [x] Win/loss share cards — download + native share
- [x] Exhausted state shows next simulation date
- [x] Interactive tutorial modal (watch + practice, skippable once)
- [x] Mobile works on `/simulations`
- [x] GA4 on site + sim events
- [x] Head-on beam clash: no damage + clash VFX (incl. adjacent)
- [x] Move turns faster than attack turns (~180ms vs ~930ms)
- [x] CombatVfxLayer replaces cell-flash beams
- [x] Bot YOU/BOT labels + hearts on grid
- [x] Shield block: beam stops at barrier
- [x] ActionPanel + clickable grid with preview highlights
- [x] Attack/Shield 2-cycle cooldown (engine + UI + persist)
- [x] Invalid cell red flash on bad click
- [ ] `validateSimulationConfig` passes for production map (depends on final `active.tsx` content)
- [ ] Share logo asset on canvas

---

## 18. Implementation Status

### Shipped (v1 + v2)

Engine, VFX, click input, cooldowns, interactive tutorial modal, persistence, share, GA4 — see ARCHITECTURE §24.

| Work item                                         | Status |
| ------------------------------------------------- | ------ |
| Click-based Move / Attack / Shield + grid preview | ✅     |
| Submit button flow                                | ✅     |
| Invalid cell red flash                            | ✅     |
| `attackCooldown` / `shieldCooldown` on `Bot`      | ✅     |
| Cleanup cooldown tick + 2-turn lockout            | ✅     |
| Opponent AI respects cooldowns                    | ✅     |
| `TurnInput` removed from player UI                | ✅     |
| Persist cooldowns in `SimulationSave`             | ✅     |
| Interactive tutorial modal (watch + practice)     | ✅     |

### Deprecated (retained for tests)

| Work item                | Status                                        |
| ------------------------ | --------------------------------------------- |
| Monaco `TurnInput` in UI | Removed — parser in `instructionLanguage.tsx` |

---

_End of implementation plan._
