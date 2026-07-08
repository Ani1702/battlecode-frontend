"use client";

import type { GameState } from "@/game/engine/types";
import AttemptsBadge from "./AttemptsBadge";
import LivesHud from "./LivesHud";
import SimulationLayout from "./SimulationLayout";
import TurnInputPlain from "./TurnInputPlain";
import { useSimulationGame } from "@/game/hooks/useSimulationGame";

function DebugBoard({ state }: { state: GameState }) {
  const { grid, player, opponent } = state;

  return (
    <div className="glass-box overflow-x-auto rounded-lg p-4 font-mono text-xs">
      {grid.map((row, rowIndex) => (
        <div key={rowIndex} className="flex gap-1">
          {row.map((tile, colIndex) => {
            let cell = tile === "WALL" ? "#" : ".";
            if (
              player.row === rowIndex &&
              player.col === colIndex &&
              player.lives > 0
            ) {
              cell = "P";
            }
            if (
              opponent.row === rowIndex &&
              opponent.col === colIndex &&
              opponent.lives > 0
            ) {
              cell = "O";
            }

            return (
              <span
                key={`${rowIndex}-${colIndex}`}
                className="inline-flex h-8 w-8 items-center justify-center rounded border border-white/10 bg-black/30"
              >
                {cell}
              </span>
            );
          })}
        </div>
      ))}
      <p className="mt-3 text-white/50">P = you, O = bot, # = wall</p>
    </div>
  );
}

function OutcomePanel({
  title,
  body,
  actionLabel,
  onAction,
}: {
  title: string;
  body: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="glass-box rounded-lg p-6 text-center">
      <h2 className="orbitron text-2xl">{title}</h2>
      <p className="mt-4 text-white/80">{body}</p>
      {actionLabel && onAction ? (
        <button
          type="button"
          onClick={onAction}
          className="gradient-border-button mt-6 px-6 py-2 text-sm uppercase tracking-wider"
        >
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}

export default function SimulationGame() {
  const {
    config,
    phase,
    save,
    gameState,
    opponentInstructionLabel,
    inputError,
    submitInstruction,
    retryAfterLoss,
  } = useSimulationGame();

  if (phase === "loading" || !save) {
    return (
      <SimulationLayout>
        <div className="flex flex-1 items-center justify-center text-white/70">
          Loading simulation...
        </div>
      </SimulationLayout>
    );
  }

  return (
    <SimulationLayout>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="orbitron text-2xl">BattleCode Simulation</h1>
          <p className="mt-1 text-sm text-white/60">{config.id}</p>
        </div>
        {phase === "playing" ? (
          <AttemptsBadge attemptsRemaining={save.attemptsRemaining} />
        ) : null}
      </div>

      {phase === "playing" && gameState ? (
        <div className="flex flex-1 flex-col gap-4">
          <DebugBoard state={gameState} />
          <LivesHud
            cycle={gameState.cycle}
            playerLives={gameState.player.lives}
            opponentLives={gameState.opponent.lives}
          />
          {opponentInstructionLabel ? (
            <p className="text-sm text-white/70">
              Opponent:{" "}
              <span className="font-mono">{opponentInstructionLabel}</span>
            </p>
          ) : null}
          <TurnInputPlain
            disabled={false}
            onSubmit={submitInstruction}
            error={inputError}
          />
        </div>
      ) : null}

      {phase === "won" ? (
        <OutcomePanel
          title="You Win"
          body={`You beat the robot in ${save.cyclesToWin ?? gameState?.cycle ?? 0} moves with ${save.playerLivesRemaining ?? gameState?.player.lives ?? 0} lives left.`}
        />
      ) : null}

      {phase === "lost" ? (
        <OutcomePanel
          title="Defeated"
          body={`Attempts remaining: ${save.attemptsRemaining}. Try again?`}
          actionLabel="Retry"
          onAction={retryAfterLoss}
        />
      ) : null}

      {phase === "exhausted" ? (
        <OutcomePanel
          title="Out of Attempts"
          body={`Next simulation on ${config.nextSimulationDate}. Share screen coming in a later phase.`}
        />
      ) : null}
    </SimulationLayout>
  );
}
