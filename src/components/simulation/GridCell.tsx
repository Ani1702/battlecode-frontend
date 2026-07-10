import type { Tile } from "@/game/engine/types";

export default function GridCell({ tile }: { tile: Tile }) {
  return (
    <div
      className={[
        "sim-grid-cell aspect-square w-full",
        tile === "WALL" ? "sim-grid-cell--wall" : "sim-grid-cell--empty",
      ].join(" ")}
    />
  );
}
