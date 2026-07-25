"use client";

import ActionPanel from "./ActionPanel";
import AttemptsBadge from "./AttemptsBadge";
import ExhaustedView from "./ExhaustedView";
import GridBoard from "./GridBoard";
import OpponentMoveReveal from "./OpponentMoveReveal";
import ShareCard from "./ShareCard";
import SimulationLayout from "./SimulationLayout";
import TutorialOverlay from "./TutorialOverlay";
import { useSimulationGame } from "@/game/hooks/useSimulationGame";

export default function SimulationGame() {
  const {
    config,
    phase,
    save,
    gameState,
    combatVfx,
    animationPhase,
    moveTweens,
    hitFlashBot,
    beamProgress,
    fadeOpacity,
    vfxPulse,
    isAnimating,
    opponentInstructionLabel,
    actionMode,
    previewCells,
    invalidFlashCell,
    confirmReady,
    setActionMode,
    handleCellClick,
    handleSelectShield,
    retryAttempt,
    completeTutorial,
    skipTutorial,
  } = useSimulationGame();

  const controlsDisabled = phase !== "playing";
  const showPlayingBoard =
    (phase === "playing" || phase === "animating") && gameState;
  const isEndScreen =
    phase === "won" || phase === "lost" || phase === "exhausted";

  if (phase === "loading" || !save) {
    return (
      <SimulationLayout>
        <div className="flex flex-1 items-center justify-center text-white/70">
          Loading simulation...
        </div>
      </SimulationLayout>
    );
  }

  if (phase === "tutorial") {
    return (
      <SimulationLayout>
        <TutorialOverlay onComplete={completeTutorial} onSkip={skipTutorial} />
      </SimulationLayout>
    );
  }

  return (
    <SimulationLayout compact={isEndScreen}>
      {!isEndScreen ? (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-2 sm:mb-6 sm:gap-4">
          <div>
            <h1 className="orbitron text-lg sm:text-2xl">
              BattleCode Simulation
            </h1>
            <p className="mt-0.5 text-[0.65rem] font-medium uppercase tracking-wider text-orange-300/90 sm:mt-1 sm:text-sm">
              Beat the bot in minimum moves
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {showPlayingBoard ? (
              <AttemptsBadge
                attemptsRemaining={save.attemptsRemaining}
                cycle={gameState.cycle}
              />
            ) : null}
          </div>
        </div>
      ) : null}

      {showPlayingBoard ? (
        <div className="flex flex-1 flex-col gap-2.5 sm:gap-4 lg:grid lg:grid-cols-[minmax(0,1fr)_280px] lg:items-start lg:gap-6">
          <GridBoard
            state={gameState}
            combatVfx={combatVfx}
            animationPhase={animationPhase}
            moveTweens={moveTweens}
            hitFlashBot={hitFlashBot}
            beamProgress={beamProgress}
            fadeOpacity={fadeOpacity}
            vfxPulse={vfxPulse}
            previewCells={previewCells}
            invalidFlashCell={invalidFlashCell}
            shieldPreview={actionMode === "shield"}
            interactionEnabled={phase === "playing" && actionMode !== null}
            onCellClick={handleCellClick}
          />

          <div className="flex flex-col gap-2 sm:gap-4">
            <OpponentMoveReveal instructionLabel={opponentInstructionLabel} />
            <ActionPanel
              actionMode={actionMode}
              attackCooldown={gameState.player.attackCooldown}
              shieldCooldown={gameState.player.shieldCooldown}
              confirmReady={confirmReady}
              disabled={controlsDisabled}
              onSelectMove={() => setActionMode("move")}
              onSelectAttack={() => setActionMode("attack")}
              onSelectShield={handleSelectShield}
            />
            {isAnimating ? (
              <p className="text-[0.65rem] uppercase tracking-wider text-orange-300/80 sm:text-xs">
                {animationPhase === "move"
                  ? "Moving..."
                  : animationPhase === "charge"
                    ? "Charging..."
                    : "Resolving combat..."}
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
          attemptsRemaining={save.attemptsRemaining}
          onRetry={save.attemptsRemaining > 0 ? retryAttempt : undefined}
        />
      ) : null}

      {phase === "lost" ? (
        <ShareCard
          variant="loss"
          shareEventDate={config.shareEventDate}
          attemptsRemaining={save.attemptsRemaining}
          onRetry={retryAttempt}
        />
      ) : null}

      {phase === "exhausted" ? (
        <ExhaustedView
          nextSimulationDate={config.nextSimulationDate}
          shareEventDate={config.shareEventDate}
        />
      ) : null}
    </SimulationLayout>
  );
}
