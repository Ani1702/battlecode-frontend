import type { Bot } from "@/game/engine/types";

export default function BotMarker({ bot }: { bot: Bot }) {
  if (bot.lives <= 0) {
    return null;
  }

  return (
    <div
      className={[
        "sim-bot absolute inset-[15%] rounded-md border-2 border-white/80",
        bot.id === "player" ? "sim-bot--player" : "sim-bot--opponent",
        bot.shieldActive ? "sim-bot--shield" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-label={bot.id === "player" ? "Player bot" : "Opponent bot"}
    />
  );
}
