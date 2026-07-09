"use client";

import { useMemo } from "react";
import AttemptsBadge from "./AttemptsBadge";
import ExhaustedView from "./ExhaustedView";
import GridBoard from "./GridBoard";
import LivesHud from "./LivesHud";
import OpponentMoveReveal from "./OpponentMoveReveal";
import ShareCard from "./ShareCard";
import SimulationLayout from "./SimulationLayout";
import StaticCommander from "./StaticCommander";
import TurnInput from "./TurnInput";
import TutorialOverlay from "./TutorialOverlay";
import { getPlayableInstructionStrings } from "@/game/engine/parser";
import { useSimulationGame } from "@/game/hooks/useSimulationGame";

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
    completeTutorial,
    skipTutorial,
  } = useSimulationGame();

  const inputDisabled = phase !== "playing";
  const showPlayingBoard =
    (phase === "playing" || phase === "animating" || phase === "tutorial") &&
    gameState;
  const playableInstructions = useMemo(
    () => (gameState ? getPlayableInstructionStrings(gameState) : []),
    [gameState],
  );

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
            <LivesHud cycle={gameState.cycle} />
            <OpponentMoveReveal instructionLabel={opponentInstructionLabel} />
            <TurnInput
              disabled={inputDisabled}
              onSubmit={submitInstruction}
              error={inputError}
              playableInstructions={playableInstructions}
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
        <ShareCard
          variant="win"
          cyclesToWin={save.cyclesToWin ?? gameState?.cycle ?? 0}
          playerLivesRemaining={
            save.playerLivesRemaining ?? gameState?.player.lives ?? 0
          }
          shareEventDate={config.shareEventDate}
        />
      ) : null}

      {phase === "lost" ? (
        <ShareCard
          variant="loss"
          shareEventDate={config.shareEventDate}
          onRetry={retryAfterLoss}
        />
      ) : null}

      {phase === "exhausted" ? (
        <ExhaustedView
          nextSimulationDate={config.nextSimulationDate}
          shareEventDate={config.shareEventDate}
        />
      ) : null}

      {phase === "tutorial" ? (
        <TutorialOverlay onComplete={completeTutorial} onSkip={skipTutorial} />
      ) : null}
    </SimulationLayout>
  );
}
