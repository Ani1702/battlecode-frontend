export interface ShareCanvasOptions {
  variant: "win" | "loss";
  cyclesToWin?: number;
  playerLivesRemaining?: number;
  shareEventDate: string;
}

const WIDTH = 1080;
const HEIGHT = 1920;
const LOGO_PATH = "/simulation/battlecode-logo.webp";
export const GAME_URL = "https://battlecode.ieeecsvit.com";
export const SHARE_DARE_TEXT = "I dare you to beat me";

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = src;
  });
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

export async function renderShareCanvas(
  options: ShareCanvasOptions,
): Promise<HTMLCanvasElement> {
  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = HEIGHT;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Could not create canvas context");
  }

  const gradient = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
  gradient.addColorStop(0, "#1a0a00");
  gradient.addColorStop(0.45, "#0a0a0a");
  gradient.addColorStop(1, "#000000");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.strokeStyle = "rgba(249, 115, 22, 0.45)";
  ctx.lineWidth = 10;
  drawRoundedRect(ctx, 48, 48, WIDTH - 96, HEIGHT - 96, 36);
  ctx.stroke();

  const logo = await loadImage(LOGO_PATH);
  const logoY = 160;

  if (logo) {
    const logoWidth = 720;
    const logoHeight = (logo.height / logo.width) * logoWidth;
    ctx.drawImage(logo, (WIDTH - logoWidth) / 2, logoY, logoWidth, logoHeight);
  } else {
    ctx.fillStyle = "#F97316";
    ctx.font = "bold 96px Orbitron, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("BATTLECODE", WIDTH / 2, 420);
  }

  // Anchor all copy near the bottom so it never overlaps the large logo
  ctx.textAlign = "center";
  let cursorY = 1380;

  if (options.variant === "win") {
    const headline = `I beat the robot in ${options.cyclesToWin ?? 0} moves`;
    let fontSize = 40;
    ctx.fillStyle = "#FFFFFF";
    ctx.font = `bold ${fontSize}px Orbitron, sans-serif`;
    while (fontSize > 28 && ctx.measureText(headline).width > WIDTH - 160) {
      fontSize -= 2;
      ctx.font = `bold ${fontSize}px Orbitron, sans-serif`;
    }
    ctx.fillText(headline, WIDTH / 2, cursorY);
    cursorY += 70;
    ctx.font = "34px Oxanium, sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.8)";
    ctx.fillText(
      `${options.playerLivesRemaining ?? 0} lives remaining`,
      WIDTH / 2,
      cursorY,
    );
  } else {
    const headline = "I battled the BattleCode bot";
    let fontSize = 40;
    ctx.fillStyle = "#FFFFFF";
    ctx.font = `bold ${fontSize}px Orbitron, sans-serif`;
    while (fontSize > 28 && ctx.measureText(headline).width > WIDTH - 160) {
      fontSize -= 2;
      ctx.font = `bold ${fontSize}px Orbitron, sans-serif`;
    }
    ctx.fillText(headline, WIDTH / 2, cursorY);
    cursorY += 70;
    ctx.font = "34px Oxanium, sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.8)";
    ctx.fillText("Think you can do better?", WIDTH / 2, cursorY);
  }

  ctx.fillStyle = "#FDBA74";
  ctx.font = "bold 40px Oxanium, sans-serif";
  ctx.fillText(GAME_URL.replace(/^https?:\/\//, ""), WIDTH / 2, 1680);

  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.font = "32px Oxanium, sans-serif";
  ctx.fillText(SHARE_DARE_TEXT, WIDTH / 2, 1760);

  return canvas;
}

export function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("Failed to create image blob"));
        return;
      }

      resolve(blob);
    }, "image/png");
  });
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function buildShareText(): string {
  return `${SHARE_DARE_TEXT}\n${GAME_URL}`;
}

export async function nativeShare(blob: Blob, title: string): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.share) {
    return false;
  }

  const file = new File([blob], "battlecode-simulation.png", {
    type: "image/png",
  });

  // Prefer image + single copy of the dare/link (no separate `url` — that duplicates the link).
  const withImage: ShareData = {
    files: [file],
    title,
    text: buildShareText(),
  };

  try {
    if (!navigator.canShare || navigator.canShare(withImage)) {
      await navigator.share(withImage);
      return true;
    }
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return false;
    }
  }

  // Some browsers accept the file but reject combined text — still share the PNG.
  const imageOnly: ShareData = {
    files: [file],
    title,
  };

  try {
    if (!navigator.canShare || navigator.canShare(imageOnly)) {
      await navigator.share(imageOnly);
      return true;
    }
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return false;
    }
  }

  // Last resort: text + link, no duplicate url field.
  try {
    await navigator.share({
      title,
      text: buildShareText(),
    });
    return true;
  } catch {
    return false;
  }
}
