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
  disabled,
  cooldown,
  compact,
  onClick,
}: {
  label: string;
  active: boolean;
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
          : "w-full px-4 py-3 text-left text-sm",
        active
          ? "sim-action-btn--active border-orange-400/80 bg-orange-500/20 text-orange-100"
          : "border-white/10 bg-white/5 text-white/90 hover:bg-white/10",
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

export default function ActionPanel({
  actionMode,
  attackCooldown,
  shieldCooldown,
  canSubmit,
  disabled,
  helperText,
  compact = false,
  onSelectMove,
  onSelectAttack,
  onSelectShield,
  onSubmit,
}: {
  actionMode: ActionMode | null;
  attackCooldown: number;
  shieldCooldown: number;
  canSubmit: boolean;
  disabled: boolean;
  helperText?: string;
  compact?: boolean;
  onSelectMove: () => void;
  onSelectAttack: () => void;
  onSelectShield: () => void;
  onSubmit: () => void;
}) {
  return (
    <div
      className={[
        compact
          ? "flex flex-col gap-2"
          : "glass-box flex flex-col gap-3 rounded-lg p-4",
      ].join(" ")}
    >
      {!compact ? (
        <p className="text-xs uppercase tracking-wider text-white/50">
          Choose action
        </p>
      ) : null}

      <div
        className={compact ? "grid grid-cols-3 gap-1.5" : "flex flex-col gap-2"}
      >
        <ActionButton
          label="Move"
          active={actionMode === "move"}
          disabled={disabled}
          cooldown={0}
          compact={compact}
          onClick={onSelectMove}
        />
        <ActionButton
          label="Attack"
          active={actionMode === "attack"}
          disabled={disabled || attackCooldown > 0}
          cooldown={attackCooldown}
          compact={compact}
          onClick={onSelectAttack}
        />
        <ActionButton
          label="Shield"
          active={actionMode === "shield"}
          disabled={disabled || shieldCooldown > 0}
          cooldown={shieldCooldown}
          compact={compact}
          onClick={onSelectShield}
        />
      </div>

      <button
        type="button"
        disabled={disabled || !canSubmit}
        onClick={onSubmit}
        className={[
          "gradient-border-button w-full font-semibold uppercase tracking-wider text-white disabled:cursor-not-allowed disabled:opacity-40",
          compact ? "py-2 text-xs" : "mt-1 py-3 text-sm",
        ].join(" ")}
      >
        Submit
      </button>

      <p
        className={[
          "leading-relaxed text-white/45",
          compact ? "text-[0.65rem]" : "text-xs",
        ].join(" ")}
      >
        {helperText ??
          (actionMode === "move"
            ? "Click an adjacent cell to move, then Submit."
            : actionMode === "attack"
              ? "Click a cell on your row or column to aim, then Submit."
              : actionMode === "shield"
                ? "Shield is ready — press Submit."
                : "Select Move, Attack, or Shield to begin.")}
      </p>
    </div>
  );
}
