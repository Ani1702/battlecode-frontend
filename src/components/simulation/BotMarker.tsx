import type { Bot } from "@/game/engine/types";

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

export default function BotMarker({ bot }: { bot: Bot }) {
  if (bot.lives <= 0) {
    return null;
  }

  const label = bot.id === "player" ? "YOU" : "BOT";

  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center">
      <div
        className={[
          "flex h-[58%] w-[58%] items-center justify-center rounded-md border-2 border-white/80",
          bot.id === "player" ? "sim-bot--player" : "sim-bot--opponent",
          bot.shieldActive ? "sim-bot--shield" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        aria-label={bot.id === "player" ? "Player bot" : "Opponent bot"}
      >
        <span className="text-[0.5rem] font-bold leading-none tracking-wide text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)] sm:text-[0.6rem]">
          {label}
        </span>
      </div>
      <div className="mt-0.5 flex gap-px text-[0.45rem] leading-none sm:text-[0.55rem]">
        {renderHearts(bot.lives)}
      </div>
    </div>
  );
}
