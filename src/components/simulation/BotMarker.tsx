import type { Bot, BotId, GameState } from "@/game/engine/types";
import type { MoveTween } from "./combatVfxTypes";

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 16 16"
      className="h-[0.85em] w-[0.85em]"
      fill={filled ? "#ef4444" : "rgba(255,255,255,0.28)"}
    >
      <path d="M8 14s-5.5-3.4-5.5-7A3.2 3.2 0 0 1 8 3.7 3.2 3.2 0 0 1 13.5 7C13.5 10.6 8 14 8 14z" />
    </svg>
  );
}

function renderHearts(lives: number, maxLives = 2) {
  return Array.from({ length: maxLives }, (_, index) => (
    <HeartIcon key={index} filled={index < lives} />
  ));
}

export default function BotMarker({
  bot,
  moveTween,
  hitFlash = false,
  shieldPreview = false,
  compact = false,
}: {
  bot: Bot;
  moveTween?: MoveTween;
  hitFlash?: boolean;
  shieldPreview?: boolean;
  compact?: boolean;
}) {
  if (bot.lives <= 0) {
    return null;
  }

  const label = bot.id === "player" ? "YOU" : "BOT";
  const moveTransform =
    moveTween && moveTween.progress < 1
      ? `translate(${(moveTween.to.col - moveTween.from.col) * moveTween.progress * 100}%, ${(moveTween.to.row - moveTween.from.row) * moveTween.progress * 100}%)`
      : undefined;

  const showShield = bot.shieldActive || shieldPreview;

  return (
    <div
      className="pointer-events-none absolute inset-0 z-10 transition-transform duration-75"
      style={moveTransform ? { transform: moveTransform } : undefined}
    >
      <div
        className={[
          "absolute left-[21%] top-[21%] flex h-[58%] w-[58%] items-center justify-center rounded-md border-2 border-white/80",
          bot.id === "player" ? "sim-bot--player" : "sim-bot--opponent",
          showShield ? "sim-bot--shield" : "",
          shieldPreview && !bot.shieldActive ? "sim-bot--shield-preview" : "",
          hitFlash ? "sim-bot--hit-flash" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        aria-label={bot.id === "player" ? "Player bot" : "Opponent bot"}
      >
        <span
          className={
            compact
              ? "text-[0.4rem] font-bold leading-none tracking-wide text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]"
              : "text-[0.5rem] font-bold leading-none tracking-wide text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)] sm:text-[0.6rem]"
          }
        >
          {label}
        </span>
      </div>
      <div
        className={[
          "absolute left-0 right-0 top-[82%] flex justify-center gap-px leading-none",
          compact ? "text-[0.35rem]" : "text-[0.45rem] sm:text-[0.55rem]",
        ].join(" ")}
      >
        {renderHearts(bot.lives)}
      </div>
    </div>
  );
}

export function getBotCellPosition(
  bot: Bot,
  moveTween?: MoveTween,
): { row: number; col: number } {
  if (moveTween && moveTween.progress < 1) {
    return moveTween.from;
  }

  return { row: bot.row, col: bot.col };
}

export function getBotMoveTween(
  botId: BotId,
  moveTweens: Partial<Record<BotId, MoveTween>>,
): MoveTween | undefined {
  return moveTweens[botId];
}
