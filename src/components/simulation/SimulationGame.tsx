"use client";

import ActionPanel from "./ActionPanel";
import AttemptsBadge from "./AttemptsBadge";
import ExhaustedView from "./ExhaustedView";
import GridBoard from "./GridBoard";
import LivesHud from "./LivesHud";
import OpponentMoveReveal from "./OpponentMoveReveal";
import ShareCard from "./ShareCard";
import SimulationLayout from "./SimulationLayout";
import StaticCommander from "./StaticCommander";
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
    canSubmit,
    setActionMode,
    handleCellClick,
    submitSelection,
    retryAfterLoss,
    completeTutorial,
    skipTutorial,
  } = useSimulationGame();

  const controlsDisabled = phase !== "playing";
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

  if (phase === "tutorial") {
    return (
      <SimulationLayout>
        <TutorialOverlay onComplete={completeTutorial} onSkip={skipTutorial} />
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
        <div className="flex flex-wrap items-center gap-3">
          {showPlayingBoard ? (
            <AttemptsBadge attemptsRemaining={save.attemptsRemaining} />
          ) : null}
        </div>
      </div>

      {showPlayingBoard ? (
        <div className="flex flex-1 flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,1fr)_280px] lg:items-start lg:gap-6">
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

          <div className="flex flex-col gap-4">
            <StaticCommander />
            <LivesHud cycle={gameState.cycle} />
            <OpponentMoveReveal instructionLabel={opponentInstructionLabel} />
            <ActionPanel
              actionMode={actionMode}
              attackCooldown={gameState.player.attackCooldown}
              shieldCooldown={gameState.player.shieldCooldown}
              canSubmit={canSubmit}
              disabled={controlsDisabled}
              onSelectMove={() => setActionMode("move")}
              onSelectAttack={() => setActionMode("attack")}
              onSelectShield={() => setActionMode("shield")}
              onSubmit={submitSelection}
            />
            {isAnimating ? (
              <p className="text-xs uppercase tracking-wider text-orange-300/80">
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
    </SimulationLayout>
  );
}
