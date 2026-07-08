import type { Tile } from "@/game/engine/types";

export default function GridCell({
  tile,
  isBeamHighlight = false,
}: {
  tile: Tile;
  isBeamHighlight?: boolean;
}) {
  return (
    <div
      className={[
        "sim-grid-cell aspect-square w-full",
        tile === "WALL" ? "sim-grid-cell--wall" : "sim-grid-cell--empty",
        isBeamHighlight ? "sim-grid-cell--beam" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    />
  );
}
