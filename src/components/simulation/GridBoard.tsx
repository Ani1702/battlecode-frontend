import { getCols } from "@/game/engine/grid";
import type { BotId, GameState, Grid, Position } from "@/game/engine/types";
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

function isPreviewCell(
  previewCells: Position[],
  row: number,
  col: number,
): boolean {
  return previewCells.some((cell) => cell.row === row && cell.col === col);
}

function isInvalidFlashCell(
  cell: Position | null,
  row: number,
  col: number,
): boolean {
  return cell !== null && cell.row === row && cell.col === col;
}

function isHintCell(cell: Position | null, row: number, col: number): boolean {
  return cell !== null && cell.row === row && cell.col === col;
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
  previewCells = [],
  hintCell = null,
  hintConfirm = false,
  invalidFlashCell = null,
  shieldPreview = false,
  interactionEnabled = false,
  compact = false,
  showLegend = true,
  onCellClick,
}: {
  state: GameState;
  combatVfx?: CombatVfxPayload | null;
  animationPhase?: AnimationPhase;
  moveTweens?: Partial<Record<BotId, MoveTween>>;
  hitFlashBot?: BotId | null;
  beamProgress?: number;
  fadeOpacity?: number;
  vfxPulse?: number;
  previewCells?: Position[];
  hintCell?: Position | null;
  hintConfirm?: boolean;
  invalidFlashCell?: Position | null;
  shieldPreview?: boolean;
  interactionEnabled?: boolean;
  compact?: boolean;
  showLegend?: boolean;
  onCellClick?: (cell: Position) => void;
}) {
  const { grid, player, opponent } = state;
  const cols = getCols(grid);

  const playerTween = getBotMoveTween("player", moveTweens);
  const opponentTween = getBotMoveTween("opponent", moveTweens);
  const playerCell = getBotCellPosition(player, playerTween);
  const opponentCell = getBotCellPosition(opponent, opponentTween);

  return (
    <div
      className={[
        compact
          ? "w-full rounded-md bg-white/[0.04] p-1.5"
          : "glass-box w-full rounded-lg p-3 md:p-4",
      ].join(" ")}
    >
      <div
        className={
          compact
            ? "relative mx-auto w-full max-w-[200px]"
            : "relative mx-auto w-full max-w-md"
        }
      >
        <div
          className={[
            "sim-grid w-full",
            compact ? "sim-grid--compact" : "",
          ].join(" ")}
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
              const isPreview = isPreviewCell(previewCells, rowIndex, colIndex);
              const isHint = isHintCell(hintCell, rowIndex, colIndex);
              const isShieldPreview = shieldPreview && hasPlayer;
              const isInvalidFlash = isInvalidFlashCell(
                invalidFlashCell,
                rowIndex,
                colIndex,
              );

              return (
                <button
                  key={`${rowIndex}-${colIndex}`}
                  type="button"
                  disabled={!interactionEnabled}
                  onClick={() =>
                    onCellClick?.({ row: rowIndex, col: colIndex })
                  }
                  className={[
                    "relative overflow-visible border-0 bg-transparent p-0",
                    interactionEnabled ? "cursor-pointer" : "cursor-default",
                  ].join(" ")}
                  aria-label={`Cell ${rowIndex}, ${colIndex}`}
                >
                  <GridCell
                    tile={tile}
                    isPreview={isPreview}
                    isShieldPreview={isShieldPreview}
                    isInvalidFlash={isInvalidFlash}
                    isHint={isHint}
                    isHintConfirm={isHint && hintConfirm}
                  />
                  {isHint ? (
                    <span className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
                      <span
                        className={[
                          "sim-tap-hint-dot",
                          hintConfirm ? "sim-tap-hint-dot--confirm" : "",
                        ].join(" ")}
                      />
                    </span>
                  ) : null}
                  {hasPlayer ? (
                    <BotMarker
                      bot={player}
                      moveTween={playerTween}
                      hitFlash={hitFlashBot === "player"}
                      compact={compact}
                    />
                  ) : null}
                  {hasOpponent ? (
                    <BotMarker
                      bot={opponent}
                      moveTween={opponentTween}
                      hitFlash={hitFlashBot === "opponent"}
                      compact={compact}
                    />
                  ) : null}
                </button>
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

      {showLegend ? (
        <div
          className={[
            "flex flex-wrap gap-4 text-xs text-white/50",
            compact ? "mt-1.5 justify-center" : "mt-3",
          ].join(" ")}
        >
          <span className="flex items-center gap-2">
            <span className="sim-legend sim-legend--wall" /> Wall
          </span>
        </div>
      ) : null}
    </div>
  );
}
