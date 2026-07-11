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
  compact = false,
}: {
  bot: Bot;
  moveTween?: MoveTween;
  hitFlash?: boolean;
  compact?: boolean;
}) {
  if (bot.lives <= 0) {
    return null;
  }

  const label = bot.id === "player" ? "YOU" : "BOT";
  const transform =
    moveTween && moveTween.progress < 1
      ? `translate(${(moveTween.to.col - moveTween.from.col) * moveTween.progress * 100}%, ${(moveTween.to.row - moveTween.from.row) * moveTween.progress * 100}%)`
      : undefined;

  return (
    <div
      className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center transition-transform duration-75"
      style={transform ? { transform } : undefined}
    >
      <div
        className={[
          "flex h-[58%] w-[58%] items-center justify-center rounded-md border-2 border-white/80",
          bot.id === "player" ? "sim-bot--player" : "sim-bot--opponent",
          bot.shieldActive ? "sim-bot--shield" : "",
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
          "flex gap-px leading-none",
          compact
            ? "mt-px text-[0.35rem]"
            : "mt-0.5 text-[0.45rem] sm:text-[0.55rem]",
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
