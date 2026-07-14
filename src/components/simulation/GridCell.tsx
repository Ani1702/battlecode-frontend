import type { Tile } from "@/game/engine/types";

export default function GridCell({
  tile,
  isPreview = false,
  isShieldPreview = false,
  isInvalidFlash = false,
  isHint = false,
  isHintConfirm = false,
}: {
  tile: Tile;
  isPreview?: boolean;
  isShieldPreview?: boolean;
  isInvalidFlash?: boolean;
  isHint?: boolean;
  isHintConfirm?: boolean;
}) {
  return (
    <div
      className={[
        "sim-grid-cell aspect-square w-full",
        tile === "WALL" ? "sim-grid-cell--wall" : "sim-grid-cell--empty",
        isPreview ? "sim-grid-cell--preview" : "",
        isShieldPreview ? "sim-grid-cell--shield-preview" : "",
        isInvalidFlash ? "sim-grid-cell--invalid-flash" : "",
        isHint && !isPreview ? "sim-grid-cell--hint" : "",
        isHint && isHintConfirm ? "sim-grid-cell--hint-confirm" : "",
      ].join(" ")}
    />
  );
}
