"use client";

import { useEffect, useRef } from "react";
import type { Bot, BotId, GameState } from "@/game/engine/types";
import type { AnimationPhase, CombatVfxPayload } from "./combatVfxTypes";

const PLAYER_COLOR = "#F97316";
const OPPONENT_COLOR = "#EF4444";
const CORE_COLOR = "#FFFFFF";
const SHIELD_COLOR = "rgba(56,189,248,0.55)";
const SHIELD_EDGE = "rgba(34,211,238,0.95)";

function botColor(id: BotId): string {
  return id === "player" ? PLAYER_COLOR : OPPONENT_COLOR;
}

function cellCenter(col: number, row: number, cellSize: number, gap: number) {
  return {
    x: col * (cellSize + gap) + cellSize / 2,
    y: row * (cellSize + gap) + cellSize / 2,
  };
}

function drawBeam(
  ctx: CanvasRenderingContext2D,
  from: { x: number; y: number },
  to: { x: number; y: number },
  color: string,
  progress: number,
  opacity: number,
) {
  const endX = from.x + (to.x - from.x) * progress;
  const endY = from.y + (to.y - from.y) * progress;

  ctx.save();
  ctx.globalAlpha = opacity * 0.25;
  ctx.strokeStyle = color;
  ctx.lineWidth = 14;
  ctx.shadowColor = color;
  ctx.shadowBlur = 18;
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(endX, endY);
  ctx.stroke();

  ctx.shadowBlur = 0;
  ctx.lineWidth = 6;
  ctx.globalAlpha = opacity * 0.65;
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(endX, endY);
  ctx.stroke();

  ctx.lineWidth = 2;
  ctx.globalAlpha = opacity;
  ctx.strokeStyle = CORE_COLOR;
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(endX, endY);
  ctx.stroke();

  ctx.restore();
}

function drawClashOrb(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  pulse: number,
  opacity: number,
) {
  const radius = 10 + pulse * 6;

  ctx.save();
  ctx.globalAlpha = opacity;

  const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius * 2.2);
  gradient.addColorStop(0, "rgba(255,255,255,0.95)");
  gradient.addColorStop(0.35, "rgba(253,224,71,0.85)");
  gradient.addColorStop(1, "rgba(249,115,22,0)");

  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y, radius * 2.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.beginPath();
  ctx.arc(x, y, radius * 0.55, 0, Math.PI * 2);
  ctx.fill();

  for (let index = 0; index < 8; index += 1) {
    const angle = (Date.now() / 120 + index * 0.9) % (Math.PI * 2);
    const sparkX = x + Math.cos(angle) * (radius + 6);
    const sparkY = y + Math.sin(angle) * (radius + 6);
    ctx.fillStyle = "rgba(253,224,71,0.9)";
    ctx.beginPath();
    ctx.arc(sparkX, sparkY, 2, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function stopPointBeforeTarget(
  origin: { x: number; y: number },
  targetCenter: { x: number; y: number },
  inset: number,
) {
  const dx = targetCenter.x - origin.x;
  const dy = targetCenter.y - origin.y;
  const dist = Math.hypot(dx, dy);

  if (dist <= inset) {
    return origin;
  }

  const ratio = (dist - inset) / dist;
  return {
    x: origin.x + dx * ratio,
    y: origin.y + dy * ratio,
  };
}

function getBeamEndpoint(
  path: CombatVfxPayload["beamPaths"][number],
  origin: { x: number; y: number },
  playerCenter: { x: number; y: number },
  opponentCenter: { x: number; y: number },
  payload: CombatVfxPayload,
  cellSize: number,
  gap: number,
) {
  const otherCenter =
    path.attacker === "player" ? opponentCenter : playerCenter;

  if (payload.scenario === "clash") {
    return {
      x: (origin.x + otherCenter.x) / 2,
      y: (origin.y + otherCenter.y) / 2,
    };
  }

  const targetsShield =
    payload.scenario === "shield_block" &&
    payload.shieldBot &&
    ((path.attacker === "player" && payload.shieldBot === "opponent") ||
      (path.attacker === "opponent" && payload.shieldBot === "player"));

  if (targetsShield) {
    const defenderCenter =
      payload.shieldBot === "player" ? playerCenter : opponentCenter;
    return stopPointBeforeTarget(origin, defenderCenter, cellSize * 0.31);
  }

  const lastCell = path.cells[path.cells.length - 1];
  if (lastCell) {
    return cellCenter(lastCell.col, lastCell.row, cellSize, gap);
  }

  if (path.truncatedAt) {
    return cellCenter(
      path.truncatedAt.col,
      path.truncatedAt.row,
      cellSize,
      gap,
    );
  }

  return otherCenter;
}

function drawShieldBarrier(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  cellSize: number,
  spawnProgress: number,
  opacity: number,
) {
  const radius = cellSize * 0.29 * spawnProgress;

  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.strokeStyle = SHIELD_EDGE;
  ctx.lineWidth = 2.5;
  ctx.fillStyle = SHIELD_COLOR;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

export default function CombatVfxLayer({
  state,
  payload,
  phase,
  beamProgress,
  fadeOpacity,
  pulse,
  gridGap = 4,
}: {
  state: GameState;
  payload: CombatVfxPayload | null;
  phase: AnimationPhase;
  beamProgress: number;
  fadeOpacity: number;
  pulse: number;
  gridGap?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) {
      return;
    }

    let frameId = 0;

    const draw = () => {
      const rect = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        return;
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, rect.width, rect.height);

      if (!payload || phase === "idle" || phase === "move") {
        frameId = window.requestAnimationFrame(draw);
        return;
      }

      const gap = gridGap;
      const cols = state.grid[0]?.length ?? 1;
      const cellSize = (rect.width - gap * (cols - 1)) / cols;
      const opacity =
        phase === "fade" ? fadeOpacity : phase === "charge" ? 0.35 : 1;

      const playerCenter = cellCenter(
        state.player.col,
        state.player.row,
        cellSize,
        gap,
      );
      const opponentCenter = cellCenter(
        state.opponent.col,
        state.opponent.row,
        cellSize,
        gap,
      );

      if (phase === "charge") {
        for (const path of payload.beamPaths) {
          const origin =
            path.attacker === "player" ? playerCenter : opponentCenter;
          ctx.save();
          ctx.globalAlpha = 0.5 + pulse * 0.5;
          ctx.fillStyle = botColor(path.attacker);
          ctx.shadowColor = botColor(path.attacker);
          ctx.shadowBlur = 16;
          ctx.beginPath();
          ctx.arc(origin.x, origin.y, 8 + pulse * 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }

      if (phase === "beam" || phase === "hold" || phase === "fade") {
        for (const path of payload.beamPaths) {
          const origin =
            path.attacker === "player" ? playerCenter : opponentCenter;
          const end = getBeamEndpoint(
            path,
            origin,
            playerCenter,
            opponentCenter,
            payload,
            cellSize,
            gap,
          );
          const progress = phase === "beam" ? beamProgress : 1;
          drawBeam(
            ctx,
            origin,
            end,
            botColor(path.attacker),
            progress,
            opacity,
          );
        }

        if (payload.scenario === "shield_block" && payload.shieldBot) {
          const bot: Bot =
            payload.shieldBot === "player" ? state.player : state.opponent;
          const center = cellCenter(bot.col, bot.row, cellSize, gap);
          drawShieldBarrier(
            ctx,
            center.x,
            center.y,
            cellSize,
            Math.min(1, beamProgress + 0.2),
            opacity,
          );
        }

        if (payload.scenario === "clash") {
          const clash = {
            x: (playerCenter.x + opponentCenter.x) / 2,
            y: (playerCenter.y + opponentCenter.y) / 2,
          };
          if (beamProgress >= 0.85 || phase === "hold" || phase === "fade") {
            drawClashOrb(ctx, clash.x, clash.y, pulse, opacity);
          }
        }
      }

      frameId = window.requestAnimationFrame(draw);
    };

    draw();

    return () => window.cancelAnimationFrame(frameId);
  }, [state, payload, phase, beamProgress, fadeOpacity, pulse, gridGap]);

  return (
    <div
      ref={containerRef}
      className="pointer-events-none absolute inset-0 z-20"
    >
      <canvas ref={canvasRef} className="h-full w-full" />
    </div>
  );
}
