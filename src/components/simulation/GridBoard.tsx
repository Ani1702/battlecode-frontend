import { getCols } from "@/game/engine/grid";
import type { BotId, GameState, Grid } from "@/game/engine/types";
import BotMarker, { getBotCellPosition, getBotMoveTween } from "./BotMarker";
import CombatVfxLayer from "./CombatVfxLayer";
import GridCell from "./GridCell";
import type {
  AnimationPhase,
  CombatVfxPayload,
  MoveTween,
} from "./combatVfxTypes";

function botAtCell(
  botRow: number,
  botCol: number,
  row: number,
  col: number,
): boolean {
  return botRow === row && botCol === col;
}

export default function GridBoard({
  state,
  combatVfx = null,
  animationPhase = "idle",
  moveTweens = {},
  hitFlashBot = null,
  beamProgress = 0,
  fadeOpacity = 1,
  vfxPulse = 0,
}: {
  state: GameState;
  combatVfx?: CombatVfxPayload | null;
  animationPhase?: AnimationPhase;
  moveTweens?: Partial<Record<BotId, MoveTween>>;
  hitFlashBot?: BotId | null;
  beamProgress?: number;
  fadeOpacity?: number;
  vfxPulse?: number;
}) {
  const { grid, player, opponent } = state;
  const cols = getCols(grid);

  const playerTween = getBotMoveTween("player", moveTweens);
  const opponentTween = getBotMoveTween("opponent", moveTweens);
  const playerCell = getBotCellPosition(player, playerTween);
  const opponentCell = getBotCellPosition(opponent, opponentTween);

  return (
    <div className="glass-box w-full rounded-lg p-3 md:p-4">
      <div className="relative mx-auto w-full max-w-md">
        <div
          className="sim-grid w-full"
          style={{
            gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
          }}
        >
          {grid.map((row: Grid[number], rowIndex: number) =>
            row.map((tile, colIndex) => {
              const hasPlayer = botAtCell(
                playerCell.row,
                playerCell.col,
                rowIndex,
                colIndex,
              );
              const hasOpponent = botAtCell(
                opponentCell.row,
                opponentCell.col,
                rowIndex,
                colIndex,
              );

              return (
                <div
                  key={`${rowIndex}-${colIndex}`}
                  className="relative overflow-visible"
                >
                  <GridCell tile={tile} />
                  {hasPlayer ? (
                    <BotMarker
                      bot={player}
                      moveTween={playerTween}
                      hitFlash={hitFlashBot === "player"}
                    />
                  ) : null}
                  {hasOpponent ? (
                    <BotMarker
                      bot={opponent}
                      moveTween={opponentTween}
                      hitFlash={hitFlashBot === "opponent"}
                    />
                  ) : null}
                </div>
              );
            }),
          )}
        </div>

        <CombatVfxLayer
          state={state}
          payload={combatVfx}
          phase={animationPhase}
          beamProgress={beamProgress}
          fadeOpacity={fadeOpacity}
          pulse={vfxPulse}
        />
      </div>

      <div className="mt-3 flex flex-wrap gap-4 text-xs text-white/50">
        <span className="flex items-center gap-2">
          <span className="sim-legend sim-legend--wall" /> Wall
        </span>
      </div>
    </div>
  );
}
