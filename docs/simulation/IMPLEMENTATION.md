# BattleCode Simulation — Implementation Plan

> **Companion to:** [`ARCHITECTURE.md`](./ARCHITECTURE.md) (rules & product spec)  
> **Phased build plan:** [`PHASES.md`](./PHASES.md) (testable phases — start here)  
> **Status:** Pre-implementation  
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
TurnInput submit
  → parseInstruction(text)
  → chooseOpponentInstruction(state)
  → step(state, playerInstr, config) → { nextState, beamPaths, outcome, events }
  → GridBoard plays beam animation (500ms)
  → saveSimulation(simId, save)
  → if win/loss → ShareCard | ExhaustedView
  → else → clear input, prompt next cycle
```

### What we are not building in v1

- Landing page link to `/simulations`
- Registration CTA
- Commander dialogue
- Simulation archive UI
- Backend / auth integration
- Automated tests (optional phase — no test runner in repo today)

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

| Token                  | Value                    | Usage                     |
| ---------------------- | ------------------------ | ------------------------- |
| `--sim-player-color`   | `#F97316` (orange)       | Player bot marker         |
| `--sim-opponent-color` | `#EF4444` (red)          | Opponent bot marker       |
| `--sim-wall-color`     | `#374151` (gray-700)     | Wall cells                |
| `--sim-cell-empty`     | `rgba(255,255,255,0.03)` | Empty cell background     |
| `--sim-beam-color`     | `rgba(249,115,22,0.6)`   | Beam animation overlay    |
| `--sim-shield-color`   | `rgba(59,130,246,0.5)`   | Shield active ring on bot |
| `--sim-grid-gap`       | `4px`                    | CSS grid gap              |
| `--sim-beam-duration`  | `500ms`                  | Animation timing          |

### Bot markers

- **Player:** rounded square or circle, orange fill, thin white border, optional outer glow.
- **Opponent:** same shape, red fill.
- **Shield active:** pulsing blue ring around bot (CSS animation).
- **Dead (0 lives):** bot hidden or grayed ghost on last position (prefer **hidden**).

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
│   │   ├── beam.tsx                         [NEW]
│   │   ├── opponent.tsx                     [NEW]
│   │   ├── resolver.tsx                     [NEW]
│   │   ├── runner.tsx                       [NEW]
│   │   └── index.tsx                        [NEW] re-exports
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
│       ├── TutorialOverlay.tsx             [NEW]
│       ├── tutorialSteps.tsx                [NEW]
│       ├── GridBoard.tsx                   [NEW]
│       ├── GridCell.tsx                    [NEW]
│       ├── BotMarker.tsx                     [NEW]
│       ├── BeamOverlay.tsx                 [NEW]
│       ├── TurnInput.tsx                   [NEW]
│       ├── instructionLanguage.tsx          [NEW] Monaco language + completions
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

**New files:** ~32  
**Modified files:** 3 (`layout.tsx`, `MobileOnly.tsx`, `globals.css`)

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
  cells: Position[];
  hit: boolean;
  blockedByWall: boolean;
}

export type GameEvent =
  | { type: "SHIELD_UP"; bot: BotId }
  | { type: "MOVE"; bot: BotId; from: Position; to: Position; blocked: boolean }
  | { type: "ATTACK"; bot: BotId; path: BeamPath }
  | { type: "DAMAGE"; bot: BotId; blockedByShield: boolean }
  | { type: "CYCLE_END"; cycle: number };

export interface StepResult {
  nextState: GameState;
  playerInstruction: Instruction;
  opponentInstruction: Instruction;
  beamPaths: BeamPath[];
  events: GameEvent[];
  outcome: GameOutcome;
}
```

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

| Function                                               | Behavior                                        |
| ------------------------------------------------------ | ----------------------------------------------- |
| `parseInstruction(input: string): Instruction \| null` | Trim; exact match against `INSTRUCTION_STRINGS` |
| `instructionToString(instr: Instruction): string`      | Canonical pseudo-code string                    |
| `getCompletions(partial: string): string[]`            | Prefix filter on valid strings for autocomplete |
| `isValidInstruction(input: string): boolean`           | `parseInstruction !== null`                     |

**Parsing:** use a `Map<string, Instruction>` built from constants — no regex execution of user code.

---

### `beam.tsx`

**Purpose:** Beam path calculation and hit detection.

**Exports:**

| Function                                                                    | Behavior                                                                                                     |
| --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `getBeamCells(grid, attackerPos, direction): Position[]`                    | Cells beam travels through (excludes attacker); stops before/at wall — cells up to wall included, not beyond |
| `getBeamPath(grid, attacker: Bot, direction): BeamPath`                     | Full path + whether opponent is hit + wall blocked flag                                                      |
| `wouldBeamHitPlayer(grid, opponent, player): { canHit, direction } \| null` | For opponent AI — checks row align first, then column                                                        |

**Hit logic:** scan cells in order; if opponent position in path before wall end → hit.

---

### `opponent.tsx`

**Purpose:** Logical hardcoded opponent AI (see ARCHITECTURE §8).

**Exports:**

| Function                                                   | Behavior                                                                      |
| ---------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `chooseOpponentInstruction(state: GameState): Instruction` | Attack toward player if hittable; else move toward player; stuck → `SHIELD()` |
| `getMoveTowardPlayer(state): Instruction`                  | Deterministic Manhattan step with tie-breaks                                  |

**Private helpers (not exported):** `tryMoveDirection`, `canMoveTo`, `getAttackDirectionTowardPlayer`.

---

### `resolver.tsx`

**Purpose:** Resolve one simultaneous cycle.

**Exports:**

| Function                                                                                                | Behavior                                               |
| ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| `resolveCycle(state, playerInstr, opponentInstr, maxCycles): { nextState, events, beamPaths, outcome }` | Runs shield → move → attack → cleanup → terminal check |

**Internal phases (private):** `applyShields`, `applyMoves`, `applyAttacks`, `applyCleanup`, `checkOutcome`.

**Move collision:** if both target same cell or swap → neither moves.

**Mutual elimination:** both 0 lives → `outcome: "loss"`.

**Timeout:** after cleanup increment, if `cycle >= maxCycles` and still playing → `outcome: "loss"`.

---

### `runner.tsx`

**Purpose:** Public engine entry points for UI.

**Exports:**

| Function                                             | Behavior                                           |
| ---------------------------------------------------- | -------------------------------------------------- |
| `createInitialState(config): GameState`              | Cycle 0, bots at spawns, 2 lives, grid from config |
| `step(state, playerInstruction, config): StepResult` | Calls `chooseOpponentInstruction` + `resolveCycle` |
| `gameStateToSave(state, meta): SimulationSave`       | Merge engine state + save metadata                 |
| `saveToGameState(save): GameState`                   | Extract grid + bots + cycle from save              |

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
  phase: "loading" | "tutorial" | "playing" | "animating" | "won" | "lost" | "exhausted";
  config: SimulationConfig;
  gameState: GameState | null;
  save: SimulationSave | null;
  lastStep: StepResult | null;
  beamAnimation: BeamPath[] | null;
  submitInstruction: (text: string) => void;
  skipTutorial: () => void;
  completeTutorial: () => void;
  retryAfterLoss: () => void;
  clearAnimation: () => void;
}
```

**Internal responsibilities:**

- On mount: `loadSimulation(ACTIVE_SIMULATION.id)` or `createFreshSave`
- Map `save.status` → initial `phase`
- `submitInstruction`: parse → step → set animating → after timeout persist + transition phase
- On loss: decrement attempts, set status lost/exhausted, fire analytics
- On win: set cyclesToWin, playerLivesRemaining

---

## 8. UI Components (`src/components/simulation/`)

### `SimulationGame.tsx`

**Purpose:** Top-level orchestrator. Only component `page.tsx` mounts.

**Props:** none

**Renders:**

- `SimulationLayout` wrapper
- Phase switch:
  - `tutorial` → `TutorialOverlay`
  - `playing` | `animating` → grid + HUD + input + commander
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

**Purpose:** Full-screen glass modal, skippable.

**Props:**

```typescript
{
  onComplete: () => void;
  onSkip: () => void;
}
```

**State:** `stepIndex: number`

**Renders:** step from `tutorialSteps.tsx`, Next / Skip buttons, progress dots.

**Analytics:** `sim_tutorial_complete` / `sim_tutorial_skip`.

---

### `tutorialSteps.tsx`

**Purpose:** Static tutorial content (copy TBD — use placeholders in implementation).

**Exports:**

```typescript
export interface TutorialStep {
  title: string;
  body: string;
  hint?: string;
}
export const TUTORIAL_STEPS: TutorialStep[];
// 6 steps per ARCHITECTURE §12
```

---

### `GridBoard.tsx`

**Purpose:** Render grid + bots + delegate beam animation.

**Props:**

```typescript
{
  grid: Grid;
  player: Bot;
  opponent: Bot;
  beamPaths: BeamPath[] | null;
  isAnimating: boolean;
  onAnimationComplete: () => void;
}
```

**Renders:** CSS Grid of `GridCell`, `BotMarker` overlays, `BeamOverlay` when animating.

**Cell sizing:** `width: min(calc(100vw - 32px) / cols, 64px)` per cell.

---

### `GridCell.tsx`

**Props:** `{ tile: Tile; size: number; row; col; isBeamHighlight: boolean }`

**Renders:** empty or wall styling; beam highlight class when active.

---

### `BotMarker.tsx`

**Props:** `{ bot: Bot; cellSize: number }`

**Renders:** positioned absolute within cell; orange/red; shield ring if `shieldActive`.

---

### `BeamOverlay.tsx`

**Purpose:** Animate beam highlights sequentially or all-at-once across cells.

**Props:** `{ paths: BeamPath[]; gridDimensions; onComplete: () => void }`

**Behavior:** apply highlight class to path cells; `setTimeout(BEAM_DURATION)` → `onComplete`.

---

### `TurnInput.tsx`

**Purpose:** Monaco single-line pseudo-code input with inline completions.

**Props:**

```typescript
{
  disabled: boolean;
  onSubmit: (value: string) => void;
  cycle: number;
}
```

**Implementation details:**

- Dynamic import Monaco (`@monaco-editor/react`) with `ssr: false`
- Height ~40px, `wordWrap: off`, hide minimap, line numbers off
- Register language from `instructionLanguage.tsx`
- `Enter` → if valid, call `onSubmit` and clear
- `Tab` → accept completion
- Show helper text: `Tab · Enter to submit`

---

### `instructionLanguage.tsx`

**Purpose:** Monaco monarch language + completion provider.

**Exports:**

```typescript
export function registerInstructionLanguage(monaco: Monaco): void;
```

**Completions:** filter `INSTRUCTION_STRINGS` by prefix; trigger on `(`, letters.

---

### `LivesHud.tsx`

**Props:**

```typescript
{
  cycle: number;
  playerLives: number;
  opponentLives: number;
}
```

**Renders:** `Cycle 7` + `You ♥♥` + `Bot ♥` (filled/empty hearts).

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

### `src/components/MobileOnly.tsx` [MODIFY]

Add pathname check:

```typescript
import { usePathname } from "next/navigation";

const MOBILE_ALLOWED = ["/", "/simulations"];

// if mobile && !MOBILE_ALLOWED.includes(pathname) → block
```

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

| Class                  | Purpose                                    |
| ---------------------- | ------------------------------------------ |
| `.sim-grid-cell`       | Base cell styling                          |
| `.sim-grid-cell--wall` | Wall variant                               |
| `.sim-grid-cell--beam` | Beam flash animation                       |
| `.sim-bot--player`     | Orange bot                                 |
| `.sim-bot--opponent`   | Red bot                                    |
| `.sim-bot--shield`     | Pulsing ring `@keyframes sim-shield-pulse` |
| `.sim-beam-flash`      | `@keyframes sim-beam-flash` 500ms          |

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

**UI-only types** (define in `SimulationGame.tsx` or `useSimulationGame.tsx`):

```typescript
type GamePhase =
  | "loading"
  | "tutorial"
  | "playing"
  | "animating"
  | "won"
  | "lost"
  | "exhausted";
```

---

## 14. Constants & Magic Numbers

| Constant             | Value                 | Location                   |
| -------------------- | --------------------- | -------------------------- |
| `STARTING_LIVES`     | 2                     | engine/constants.tsx       |
| `STARTING_ATTEMPTS`  | 2                     | engine/constants.tsx       |
| `DEFAULT_MAX_CYCLES` | 50                    | engine/constants.tsx       |
| `BEAM_ANIMATION_MS`  | 500                   | engine/constants.tsx or UI |
| `STORAGE_KEY`        | `"battlecode_sim_v1"` | simulationStorage.tsx      |
| Share canvas size    | 1080 × 1920           | shareCanvas.tsx            |
| Monaco font size     | 14                    | TurnInput.tsx              |

---

## 15. Component Layout Wireframes

### Desktop (`md+`)

```
┌─────────────────────────────────────────────────────────┐
│  BATTLECODE SIMULATION                    Attempts: 2   │
├──────────────────────────────┬──────────────────────────┤
│                              │  [Static Commander]       │
│         GRID BOARD           │                          │
│                              │  Cycle 3                  │
│                              │  You ♥♥   Bot ♥♥          │
│                              │                          │
│                              │  Opponent: MOVE(LEFT)     │
│                              │  ┌────────────────────┐  │
│                              │  │ MOVE(UP█           │  │
│                              │  └────────────────────┘  │
│                              │  Tab · Enter to submit    │
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
│ Cycle 3  You ♥♥      │
│ Opponent: MOVE(L)    │
│ ┌──────────────────┐ │
│ │ SHIELD(█         │ │
│ └──────────────────┘ │
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

### PR 1 — Engine + storage (no UI)

**Files:** all of `src/game/engine/*`, `simulations/*`, `storage/simulationStorage.tsx`

**Done when:** can call `step()` in a Node script or temp test page; storage round-trips JSON.

---

### PR 2 — Playable shell

**Files:** `page.tsx`, `SimulationGame`, `SimulationLayout`, `GridBoard`, `GridCell`, `BotMarker`, `LivesHud`, `TurnInput` (basic text input first), `useSimulationGame`, `MobileOnly` change

**Done when:** can play full game with plain input on `/simulations`; persistence works on refresh.

---

### PR 3 — Polish input, animation, opponent reveal

**Files:** `TurnInput` Monaco, `instructionLanguage.tsx`, `BeamOverlay`, `OpponentMoveReveal`, `globals.css` sim styles

**Done when:** autocomplete works; beams animate; opponent move shown.

---

### PR 4 — Tutorial, share, exhausted, analytics

**Files:** `TutorialOverlay`, `tutorialSteps.tsx`, `ShareCard`, `shareCanvas.tsx`, `ExhaustedView`, `StaticCommander`, `AttemptsBadge`, `analytics.tsx`, `layout.tsx` GA4

**Done when:** full v1 flow shippable.

---

### PR 5 — Content & QA

**Files:** `active.tsx` real map, logo asset, copy pass on tutorial + share

**Done when:** Definition of Done checklist complete.

---

## 17. Definition of Done

- [ ] `/simulations` playable unauthenticated
- [ ] Live turn-by-turn input with Monaco autocomplete
- [ ] Opponent uses logical AI from cycle 1
- [ ] Beams animate; walls block correctly
- [ ] 2 lives, 2 attempts (loss only)
- [ ] localStorage cache per sim id; refresh resumes
- [ ] New sim id → fresh save; tutorialDone preserved
- [ ] Win/loss share cards — download + native share
- [ ] Exhausted state shows next simulation date
- [ ] Tutorial skippable once
- [ ] Mobile works on `/simulations`
- [ ] GA4 on site + sim events
- [ ] `validateSimulationConfig` passes for active sim

---

_End of implementation plan._
