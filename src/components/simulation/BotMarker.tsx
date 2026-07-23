import type { Bot, BotId, GameState } from "@/game/engine/types";
import type { MoveTween } from "./combatVfxTypes";

function renderHearts(lives: number, maxLives = 2) {
  return Array.from({ length: maxLives }, (_, index) => (
    <span
      key={index}
      className={index < lives ? "text-red-500" : "text-white/25"}
    >
      ♥
    </span>
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
