"use client";

import AttemptsBadge from "./AttemptsBadge";
import GridBoard from "./GridBoard";
import LivesHud from "./LivesHud";
import OpponentMoveReveal from "./OpponentMoveReveal";
import SimulationLayout from "./SimulationLayout";
import StaticCommander from "./StaticCommander";
import TurnInput from "./TurnInput";
import { useSimulationGame } from "@/game/hooks/useSimulationGame";

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
    beamPaths,
    isAnimating,
    opponentInstructionLabel,
    inputError,
    submitInstruction,
    retryAfterLoss,
  } = useSimulationGame();

  const inputDisabled = phase !== "playing";
  const showPlayingBoard =
    (phase === "playing" || phase === "animating") && gameState;

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
        {showPlayingBoard ? (
          <AttemptsBadge attemptsRemaining={save.attemptsRemaining} />
        ) : null}
      </div>

      {showPlayingBoard ? (
        <div className="flex flex-1 flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,1fr)_280px] lg:items-start lg:gap-6">
          <GridBoard state={gameState} beamPaths={beamPaths} />

          <div className="flex flex-col gap-4">
            <StaticCommander />
            <LivesHud
              cycle={gameState.cycle}
              playerLives={gameState.player.lives}
              opponentLives={gameState.opponent.lives}
            />
            <OpponentMoveReveal instructionLabel={opponentInstructionLabel} />
            <TurnInput
              disabled={inputDisabled}
              onSubmit={submitInstruction}
              error={inputError}
            />
            {isAnimating ? (
              <p className="text-xs uppercase tracking-wider text-orange-300/80">
                Resolving attack...
              </p>
            ) : null}
          </div>
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
