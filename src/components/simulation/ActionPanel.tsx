"use client";

import type { ActionMode } from "@/game/engine/actionSelection";

function CooldownBadge({ turns }: { turns: number }) {
  if (turns <= 0) {
    return null;
  }

  return (
    <span className="sim-action-cooldown-badge ml-1.5 inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-black/50 px-1.5 py-0.5 text-[10px] font-bold text-cyan-200">
      {turns}
    </span>
  );
}

function ActionButton({
  label,
  active,
  confirmReady,
  hinted = false,
  disabled,
  cooldown,
  compact,
  onClick,
}: {
  label: string;
  active: boolean;
  confirmReady?: boolean;
  hinted?: boolean;
  disabled: boolean;
  cooldown: number;
  compact?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={[
        "sim-action-btn relative rounded-md border font-semibold uppercase tracking-wider transition",
        compact
          ? "px-2 py-2 text-[0.65rem]"
          : "w-full px-2 py-2 text-center text-[0.7rem] sm:px-4 sm:py-3 sm:text-left sm:text-sm",
        active
          ? confirmReady
            ? "sim-action-btn--confirm border-cyan-400/80 bg-cyan-500/20 text-cyan-100"
            : "sim-action-btn--active border-orange-400/80 bg-orange-500/20 text-orange-100"
          : "border-white/10 bg-white/5 text-white/90 hover:bg-white/10",
        hinted && !active ? "sim-action-btn--hint" : "",
        disabled
          ? "sim-action-btn--cooldown cursor-not-allowed opacity-45"
          : "",
      ].join(" ")}
    >
      {label}
      <CooldownBadge turns={cooldown} />
    </button>
  );
}

export function getActionHelperText(
  actionMode: ActionMode | null,
  confirmReady: boolean,
  fallback?: string,
): string {
  if (actionMode) {
    return defaultHelperText(actionMode, confirmReady);
  }

  return fallback ?? defaultHelperText(null, false);
}

function defaultHelperText(
  actionMode: ActionMode | null,
  confirmReady: boolean,
): string {
  if (actionMode === "move") {
    return confirmReady
      ? "Tap the same cell again to move."
      : "Tap an adjacent cell to preview your move.";
  }

  if (actionMode === "attack") {
    return confirmReady
      ? "Tap the same cell again to fire."
      : "Tap a cell on your row or column to aim.";
  }

  if (actionMode === "shield") {
    return "Tap your bot to raise shield.";
  }

  return "Select Move, Attack, or Shield to begin.";
}

export default function ActionPanel({
  actionMode,
  attackCooldown,
  shieldCooldown,
  confirmReady,
  disabled,
  helperText,
  hideHelperText = false,
  hintAction = null,
  compact = false,
  onSelectMove,
  onSelectAttack,
  onSelectShield,
}: {
  actionMode: ActionMode | null;
  attackCooldown: number;
  shieldCooldown: number;
  confirmReady: boolean;
  disabled: boolean;
  helperText?: string;
  hideHelperText?: boolean;
  hintAction?: ActionMode | null;
  compact?: boolean;
  onSelectMove: () => void;
  onSelectAttack: () => void;
  onSelectShield: () => void;
}) {
  return (
    <div
      className={[
        compact
          ? "flex flex-col gap-2"
          : "glass-box flex flex-col gap-2 rounded-lg p-2.5 sm:gap-3 sm:p-4",
      ].join(" ")}
    >
      {!compact ? (
        <p className="text-[0.65rem] uppercase tracking-wider text-white/50 sm:text-xs">
          Choose action
        </p>
      ) : null}

      <div
        className={
          compact
            ? "grid grid-cols-3 gap-1.5"
            : "grid grid-cols-3 gap-1.5 sm:flex sm:flex-col sm:gap-2"
        }
      >
        <ActionButton
          label="Move"
          active={actionMode === "move"}
          confirmReady={confirmReady && actionMode === "move"}
          hinted={hintAction === "move"}
          disabled={disabled}
          cooldown={0}
          compact={compact}
          onClick={onSelectMove}
        />
        <ActionButton
          label="Attack"
          active={actionMode === "attack"}
          confirmReady={confirmReady && actionMode === "attack"}
          hinted={hintAction === "attack"}
          disabled={disabled || attackCooldown > 0}
          cooldown={attackCooldown}
          compact={compact}
          onClick={onSelectAttack}
        />
        <ActionButton
          label="Shield"
          active={actionMode === "shield"}
          confirmReady={confirmReady && actionMode === "shield"}
          hinted={hintAction === "shield"}
          disabled={disabled || shieldCooldown > 0}
          cooldown={shieldCooldown}
          compact={compact}
          onClick={onSelectShield}
        />
      </div>

      {!hideHelperText ? (
        <p
          className={[
            "leading-relaxed text-white/45",
            compact ? "text-[0.65rem]" : "text-xs",
          ].join(" ")}
        >
          {helperText ?? defaultHelperText(actionMode, confirmReady)}
        </p>
      ) : null}
    </div>
  );
}
