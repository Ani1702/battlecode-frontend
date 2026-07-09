import { getCols } from "@/game/engine/grid";
import type { BeamPath, Bot, GameState, Grid } from "@/game/engine/types";
import BotMarker from "./BotMarker";
import GridCell from "./GridCell";

function botAtCell(bot: Bot, row: number, col: number): boolean {
  return bot.lives > 0 && bot.row === row && bot.col === col;
}

function buildBeamHighlightSet(beamPaths: BeamPath[] | null): Set<string> {
  const highlights = new Set<string>();

  if (!beamPaths) {
    return highlights;
  }

  for (const path of beamPaths) {
    for (const cell of path.cells) {
      highlights.add(`${cell.row},${cell.col}`);
    }
  }

  return highlights;
}

export default function GridBoard({
  state,
  beamPaths = null,
}: {
  state: GameState;
  beamPaths?: BeamPath[] | null;
}) {
  const { grid, player, opponent } = state;
  const cols = getCols(grid);
  const beamHighlights = buildBeamHighlightSet(beamPaths ?? null);

  return (
    <div className="glass-box w-full rounded-lg p-3 md:p-4">
      <div
        className="sim-grid mx-auto w-full max-w-md"
        style={{
          gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
        }}
      >
        {grid.map((row: Grid[number], rowIndex: number) =>
          row.map((tile, colIndex) => {
            const hasPlayer = botAtCell(player, rowIndex, colIndex);
            const hasOpponent = botAtCell(opponent, rowIndex, colIndex);
            const isBeamHighlight = beamHighlights.has(
              `${rowIndex},${colIndex}`,
            );

            return (
              <div
                key={`${rowIndex}-${colIndex}`}
                className="relative overflow-visible"
              >
                <GridCell tile={tile} isBeamHighlight={isBeamHighlight} />
                {hasPlayer ? <BotMarker bot={player} /> : null}
                {hasOpponent ? <BotMarker bot={opponent} /> : null}
              </div>
            );
          }),
        )}
      </div>
      <div className="mt-3 flex flex-wrap gap-4 text-xs text-white/50">
        <span className="flex items-center gap-2">
          <span className="sim-legend sim-legend--wall" /> Wall
        </span>
      </div>
    </div>
  );
}
